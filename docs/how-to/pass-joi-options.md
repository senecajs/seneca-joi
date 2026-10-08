# Pass Joi options

How to change the way Joi validates every message: report all failures
at once, refuse type conversion, make every rule required, and so on.

## 1. Set the `joi` option

```js
seneca.use('seneca-joi', {
  joi: {
    abortEarly: false,
    convert: false,
  },
})
```

The same option in the instance options (the plugin's name is `joi`):

```js
Seneca({ plugin: { joi: { joi: { abortEarly: false } } } }).use('seneca-joi')
```

The object is passed unchanged as the second argument of
`schema.validate(msg, options)` for every validated action, so it accepts
every option of Joi's `validate` method (see the
[Joi 17 API](https://hapi.dev/module/joi/api/?v=17.1.1)). The options
that matter most for messages:

| Option | Joi default | Effect on messages |
| ------ | ----------- | ------------------ |
| `abortEarly` | `true` | `false` reports every failing property. `err.details.message` joins the messages with `. ` and `err.details.error.details` has one entry per failure. |
| `convert` | `true` | `false` rejects values of the wrong type instead of accepting values Joi could convert. Conversions are never written into the message, so `false` is the safer setting. |
| `presence` | `'optional'` | `'required'` makes every rule required unless it says `.optional()`. |
| `allowUnknown` | `false` | Allows properties that nested object rules do not name. The message itself always allows unknown properties. |
| `messages`, `errors` | | Custom error texts and error formatting. |

## 2. Check the effect

[docs/examples/joi-options.js](../examples/joi-options.js) loads the
plugin with `abortEarly: false` and `convert: false` and sends two bad
messages:

```js
seneca.act({ role: 'shop', cmd: 'price' }, function (err) {
  console.log(err.details.message)
  console.log(
    err.details.error.details.map((d) => d.path.join('.') + ': ' + d.type)
  )

  seneca.act(
    { role: 'shop', cmd: 'price', item: 'apple', quantity: '3' },
    function (err) {
      console.log(err.details.message)
      seneca.close()
    }
  )
})
```

Output:

```
"item" is required. "quantity" is required
[ 'item: any.required', 'quantity: any.required' ]
"quantity" must be a number
```

## Options for a single action

The `joi` option applies to the whole instance. For one action, use the
`joi$` directive and Joi's `prefs`:

```js
seneca.add(
  {
    role: 'shop',
    cmd: 'order',
    item: Joi.string().required(),
    quantity: Joi.number().required(),
    joi$: (schema) => schema.prefs({ abortEarly: false }),
  },
  action
)
```

See [Customize the schema with joi$](customize-the-schema-with-joi.md).
