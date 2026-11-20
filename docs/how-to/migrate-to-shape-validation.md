# Migrate to Seneca 4 built in validation

How to drop @seneca/joi on Seneca 4 and write the rules as
[shape](https://github.com/rjrodger/shape) builders, which Seneca 4
validates itself. Keep @seneca/joi if you need Joi features such as
`xor`, `when`, string formats or custom messages.

## Compare the two

| | @seneca/joi | Seneca 4 built in (shape) |
| --- | ---------- | ------------------------ |
| Where rules live | Pattern, rules argument, or the action's `validate` property | Pattern or rules argument. Seneca 4 does not build a shape from the `validate` property. |
| Rule values | Joi schemas built with `require('@seneca/joi').Joi`, plain objects | Type constructors, builders from `seneca.valid`, plain values |
| Required string | `Joi.string().required()` | `String` or `Required(String)` |
| Optional string | `Joi.string()` | `Skip(String)` |
| Default value | `Joi.number().default(1)`, not written into the message | `Default(1)` or just `1`, written into the message |
| Number at least 1 | `Joi.number().min(1)` | `Min(1, Number)` |
| One of a list | `Joi.valid('a', 'b')` | `Exact('a', 'b')` |
| Type conversion | `'3'` passes a `Joi.number()` rule (as a string) unless `convert: false` | `'3'` fails a `Number` rule |
| Unknown properties | Allowed | Allowed (Seneca compiles the rules with `Open`) |
| Custom logic | `joi$` directive | `Check(fn)` builder, or `this.valid(shape)` inside the action |
| Failure details | `err.details.error` is a Joi `ValidationError`; `err.details.props` is `[]` | `err.details.props` lists `{ path, what, type, value }`; there is no `err.details.error` |
| Error code | `act_invalid_msg` | `act_invalid_msg` |

## 1. Rewrite the rules first

Convert every Joi rule before you remove the plugin. Seneca 4 does not
recognise Joi schemas: without the plugin, it compiles a Joi schema left
in a pattern into a shape that checks for an instance of the schema's
class. Every ordinary value then fails (`property "item" is not of type
instance`), and a message without the property passes, with the Joi
schema object filled in as its value.

```js
const seneca = Seneca()
const { Required, Min } = seneca.valid

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Required(String),
    quantity: Min(1, Number),
  },
  function (msg, reply) {
    reply({ item: msg.item, quantity: msg.quantity })
  }
)
```

`seneca.valid` exposes the shape builders: `Required`, `Skip`, `Default`,
`Open`, `Closed`, `All`, `Any`, `Exact`, `Check`, `Min`, `Max`, `Len`,
`Rename`, `Empty`, `Never` and more. Use the builders Seneca gives you
rather than importing the `shape` package.

Move rules from `validate` properties into the pattern, and replace
`joi$` functions with `Check` builders or with validation inside the
action (`this.valid(shape)(this.util.clean(msg))` throws on failure).

## 2. Remove the plugin

Delete `.use('@seneca/joi')` and the dependency. Seneca 4 then validates
the pattern rules with shape. While the plugin is loaded it replaces the
shape of every action that has rules, so shape builders take effect only
after this step.

## 3. Update error handling

Code that read `err.details.error.details` (the Joi failure list) should
read `err.details.props` instead. Shape reports every failure at once,
joined with `; ` in the message. The code and message prefix stay the
same. [docs/examples/shape-validation.js](../examples/shape-validation.js)
prints:

```
valid message -> null { item: 'apple', quantity: 3 }
act_invalid_msg -> property "item" is required (string); property "quantity" must be a minimum of 1
[
  { path: 'item', what: 'required', type: 'string', value: undefined },
  { path: 'quantity', what: 'check', type: 'number', value: 0 }
]
```

## 4. Run the tests

Rules that used Joi defaults now change the message (shape writes
defaults), and values that Joi converted are now rejected. Tests that
sent numbers as strings need real numbers.

The Seneca documentation covers the built in validation in detail:
[Validate messages and options](https://github.com/senecajs/seneca/blob/main/docs/how-to/validate-messages-and-options.md).
