# Validate messages with Joi rules

How to reject messages that do not satisfy a Joi schema before the
action runs. The rules belong to the action definition, so they apply
however the message arrives: a local `act`, a `post`, or a message
received over a transport.

## 1. Load the plugin first

```js
const Seneca = require('seneca')
const SenecaJoi = require('@seneca/joi')
const Joi = SenecaJoi.Joi

const seneca = Seneca().use(SenecaJoi)
```

Load the plugin before adding the actions it should validate. It is a
`preload` plugin: it registers an action modifier when `use` is called,
and the modifier runs for every action added after that.

Build the rules with `SenecaJoi.Joi`, the plugin's own copy of
`@hapi/joi` 17. Joi refuses to combine schemas from different Joi copies
(`Cannot mix different versions of joi schemas`). `require('@hapi/joi')`
also works when it resolves to the same version; `@hapi/joi@17.1.1` is
the last release of that package, so a `^17` dependency does. The `joi`
package (version 18) is a different copy and cannot be used for rules.

## 2. Put the rules in the pattern

```js
seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  },
  function (msg, reply) {
    reply({ total: 1.2 * msg.quantity })
  }
)
```

Properties with scalar values (`role`, `cmd`) match messages. Properties
with object values are rules: Seneca removes them from the pattern
(`seneca.find` reports the pattern `cmd:price,role:shop`) and the plugin
compiles them into `Joi.object().keys(rules).unknown()`. Properties that
are not named in the rules are allowed.

The rules can also be a separate argument:

```js
seneca.add('role:shop,cmd:price', { item: Joi.string().required() }, action)
```

## 3. Or annotate the action function

```js
function price(msg, reply) {
  reply({ total: 1.2 * msg.quantity })
}

price.validate = {
  item: Joi.string().required(),
}

seneca.add('role:shop,cmd:price', price)
```

The `validate` property is read on the next tick after `add`, so it can
be assigned after the `add` call, which keeps the action function first
in the file. Pattern rules and `validate` rules are merged; both are
enforced.

## 4. Handle the error

A failing message never reaches the action. The caller gets an
`act_invalid_msg` error:

```js
seneca.act('role:shop,cmd:price,quantity:0', function (err, out) {
  if (err) {
    console.log(err.code) // act_invalid_msg
    console.log(err.details.message) // "item" is required
    console.log(err.details.error.details) // Joi's list of failures
  }
})
```

With promises (Seneca 4, or Seneca 3 with seneca-promisify) the promise
rejects with the same error:

```js
try {
  await seneca.post('role:shop,cmd:price,quantity:0')
} catch (err) {
  console.log(err.code, err.details.message)
}
```

Every property of the error is listed in the
[Errors reference](../reference/errors.md). To log each rejected message
as a warning, start Seneca with `trace: { invalid: true }`.

## 5. Test the rules

[docs/examples/test-rules.js](../examples/test-rules.js) is a complete
node:test file:

```js
const { test } = require('node:test')
const assert = require('node:assert')

test('price needs an item', async () => {
  const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

  seneca.add(
    { role: 'shop', cmd: 'price', item: Joi.string().required() },
    function (msg, reply) {
      reply({ ok: true })
    }
  )

  assert.deepEqual(await seneca.post('role:shop,cmd:price,item:apple'), {
    ok: true,
  })

  await assert.rejects(seneca.post('role:shop,cmd:price'), {
    code: 'act_invalid_msg',
  })

  await new Promise((resolve) => seneca.close(resolve))
})
```

## What the rules do not do

* Joi conversions and defaults are not written into the message. With
  Joi's default `convert: true`, `quantity: '3'` passes a
  `Joi.number()` rule but the action receives the string `'3'`. Set
  `convert: false` (see [Pass Joi options](pass-joi-options.md)) to
  reject such values, or convert inside the action.
* Only the message is validated, never the reply.
* The plugin calls `schema.validate`, the synchronous Joi API. Rules that
  need `validateAsync`, such as `external`, cannot be used.
* Once the plugin is loaded, Joi compiles the rules of every action that
  has rules, including plain object rules and rules written for Seneca 4's
  Gubu validation. See [What Joi makes of rule values](../reference/api.md#what-joi-makes-of-rule-values)
  before mixing the two.
