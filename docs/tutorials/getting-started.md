# Getting started

In this tutorial you install @seneca/joi, write an action whose messages
are checked by Joi rules, send one valid and two invalid messages, and
read the error. It takes about ten minutes. The finished program is
[docs/examples/getting-started.js](../examples/getting-started.js).

## 1. Install

In a new directory:

```sh
npm init -y
npm install seneca @seneca/joi
```

`npm install seneca` installs Seneca 3. For the Seneca 4 prerelease use
`npm install seneca@4.0.0-rc5` (Node.js 22 or later). The program below
is the same for both.

## 2. Write the program

Create `price.js`:

```js
const Seneca = require('seneca')
const SenecaJoi = require('@seneca/joi')
const Joi = SenecaJoi.Joi

// Silent log: Seneca otherwise logs an entry for each rejected message.
const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  },
  function (msg, reply) {
    const unit = { apple: 2, pear: 3 }[msg.item] || 1
    reply({
      item: msg.item,
      quantity: msg.quantity,
      total: unit * msg.quantity,
    })
  }
)

seneca.act('role:shop,cmd:price,item:apple,quantity:3', function (err, out) {
  console.log('valid message ->', err, out)

  seneca.act('role:shop,cmd:price,quantity:3', function (err, out) {
    console.log('missing item ->', err.code)
    console.log('  message:', err.message)
    console.log('  details:', err.details.error.details)

    seneca.act('role:shop,cmd:price,item:pear,quantity:0', function (err, out) {
      console.log('quantity too small ->', err.details.message)
      seneca.close()
    })
  })
})
```

Three things to notice:

* `SenecaJoi.Joi` is the plugin's own copy of `@hapi/joi` 17. Rules must
  be built with it, because Joi refuses to combine schemas from
  different Joi copies.
* `.use(SenecaJoi)` comes before `seneca.add`. The plugin registers
  itself when it is loaded and covers the actions added afterwards.
* The pattern mixes two kinds of properties. `role` and `cmd` have
  scalar values and match messages. `item` and `quantity` have Joi
  schemas as values: they are rules, not pattern values.

## 3. Run it

```sh
node price.js
```

```
valid message -> null { item: 'apple', quantity: 3, total: 6 }
missing item -> act_invalid_msg
  message: seneca: Action cmd:price,role:shop received an invalid message; "item" is required; message content was: {role:shop,cmd:price,quantity:3}.
  details: [
  {
    message: '"item" is required',
    path: [ 'item' ],
    type: 'any.required',
    context: { label: 'item', key: 'item' }
  }
]
quantity too small -> "quantity" must be larger than or equal to 1
```

## 4. What happened

1. `seneca.add` split the pattern. Seneca keeps `role:shop,cmd:price` as
   the pattern (`seneca.find('role:shop,cmd:price').pattern` is
   `cmd:price,role:shop`) and stores `item` and `quantity` in the
   action definition's `rules`.
2. On the next tick, the plugin compiled the rules into
   `Joi.object().keys({ item, quantity }).unknown()` and attached a
   `validate` function to the action definition. `.unknown()` means
   that properties not named in the rules, such as `role` and `cmd`
   themselves, are allowed.
3. The first message satisfied the rules, so the action ran and replied
   with the total.
4. The second message had no `item`. Seneca ran the `validate` function
   before the action, got a Joi error, and replied with an
   `act_invalid_msg` error instead of running the action. `err.message`
   is Seneca's text with the Joi message inside; `err.details.message`
   is the Joi message alone; `err.details.error` is the Joi
   `ValidationError`, whose `details` array lists every failure.
5. The third message failed the `min(1)` rule in the same way.

Without `log: 'silent'`, Seneca also prints an error level log entry
(`kind: 'act', case: 'ERR'`) for each rejected message, as it does for
any failed action.

Two things did not happen. Joi's conversions and defaults were not
written into the message: with the default `convert: true`, a quantity
of `'3'` (a string) would pass the rule and the action would receive the
string. And the reply was not validated; only messages are.

## 5. Next steps

* Put the rules on the action function instead of the pattern, and test
  them: [Validate messages with Joi rules](../how-to/validate-messages-with-joi-rules.md).
* Make properties depend on each other or close the schema:
  [Customize the schema with joi$](../how-to/customize-the-schema-with-joi.md).
* Report every failure at once, or refuse conversions:
  [Pass Joi options](../how-to/pass-joi-options.md).
* Every property of the error: [Errors](../reference/errors.md).
* How the plugin hooks into Seneca: [How validation works](../explanation/how-validation-works.md).
* On Seneca 4, validation without the plugin:
  [Migrate to Seneca 4 built in validation](../how-to/migrate-to-gubu-validation.md).
