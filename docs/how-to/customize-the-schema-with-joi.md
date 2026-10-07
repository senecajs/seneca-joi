# Customize the schema with joi$

How to take full control of the Joi schema of an action: make
properties depend on each other, set Joi preferences for one action,
forbid unknown properties, or replace the schema entirely.

## 1. Add a `joi$` function to the pattern

```js
seneca.add(
  {
    role: 'shop',
    cmd: 'find',
    // schema is Joi.object().keys(rules).unknown(); actdef is the action definition
    joi$: function (schema, actdef) {
      return schema
        .keys({ id: Joi.string(), name: Joi.string() })
        .xor('id', 'name')
        .prefs({ abortEarly: false })
    },
  },
  function (msg, reply) {
    reply({ found: msg.id || msg.name })
  }
)
```

`joi$` is a directive: like every pattern property ending in `$` it is
neither a pattern value nor a rule. The function receives:

* `schema`: `Joi.object().keys(rules).unknown()` compiled from the
  action's rules (with no keys when the action has no rules), and
* `actdef`: the action definition, with `pattern`, `rules`, `raw` and
  `plugin`.

It must return a Joi schema, which is used as is. A `joi$` value that is
not a function is ignored.

## 2. Check the result

[docs/examples/custom-schema.js](../examples/custom-schema.js) sends
four messages to the action above:

```
role:shop,cmd:find,id:a1 -> { found: 'a1' }
role:shop,cmd:find,name:apple -> { found: 'apple' }
role:shop,cmd:find,id:a1,name:apple -> "value" contains a conflict between exclusive peers [id, name]
role:shop,cmd:find -> "value" must contain at least one of [id, name]
```

## 3. Set preferences for one action

The `joi` plugin option applies to every action. For one action, call
`schema.prefs(options)` inside `joi$`, as the example does with
`abortEarly: false`. See [Pass Joi options](pass-joi-options.md) for
the options.

## 4. Forbid unknown properties

The compiled schema allows unknown properties because the pattern's own
matching properties (`role`, `cmd`) are not rules. `schema.unknown(false)`
alone would reject every message. List the pattern properties as keys
first:

```js
seneca.add(
  {
    role: 'shop',
    cmd: 'get',
    id: Joi.string().required(),
    joi$: function (schema) {
      return schema
        .keys({ role: Joi.valid('shop'), cmd: Joi.valid('get') })
        .unknown(false)
    },
  },
  function (msg, reply) {
    reply({ got: msg.id })
  }
)
```

```
role:shop,cmd:get,id:a1 -> { got: 'a1' }
role:shop,cmd:get,id:a1,extra:1 -> "extra" is not allowed
```

## 5. Replace the schema

Ignore the `schema` argument and return your own:

```js
joi$: function () {
  return Joi.object({
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  }).unknown()
}
```

Keep `.unknown()` unless you list the pattern properties as in step 4.
