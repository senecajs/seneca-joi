# Migrate from parambulator rules

How to replace parambulator rules such as `{ required$: true }`,
`{ string$: true }` or `'required$'` with Joi rules, and what the
`legacy` option does while both kinds of rules exist.

Seneca 1 and 2 validated messages with
[parambulator](https://github.com/rjrodger/parambulator) rules: objects
whose property names end in `$`. seneca-joi 1.0.0 (2016) turned that
check off by default and replaced it with Joi. The `legacy` option is
what remains of the transition.

## 1. Set `legacy: true` while both kinds of rules exist

```js
seneca.use('seneca-joi', { legacy: true })
```

The plugin then inspects the rules of every action. When a rule name or
a string value ends in `$` (searched up to eleven levels deep, see
[Detecting parambulator rules](../reference/api.md#detecting-parambulator-rules)),
the rules are treated as parambulator rules and the action is **not
validated**: the plugin does not compile them with Joi, and it also
removes the Gubu shape that Seneca 3.38 and 4 compile from them. Gubu
reads `{ string$: true }` as "an object with a boolean `string$`
property" and would reject every ordinary value. Actions with Joi rules
are validated as usual.

Without `legacy: true` (the default) parambulator rules are compiled by
Joi as plain objects. `{ required$: true }` then means "an object whose
`required$` property equals `true`": a message with `b: 1` fails with
`"b" must be of type object`, and a message without `b` passes, the
opposite of the intent. So convert the rules before removing the option.

## 2. Convert the rules

Common parambulator rules and their Joi equivalents:

| parambulator | Joi |
| ------------ | --- |
| `{ required$: true }` | `Joi.any().required()` |
| `'required$'` | `Joi.any().required()` |
| `{ string$: true }` | `Joi.string()` |
| `{ string$: true, required$: true }` | `Joi.string().required()` |
| `{ number$: true }` | `Joi.number()` |
| `{ integer$: true }` | `Joi.number().integer()` |
| `{ boolean$: true }` | `Joi.boolean()` |
| `{ object$: true }` | `Joi.object()` |
| `{ array$: true }` | `Joi.array()` |
| `{ type$: 'string' }` | `Joi.string()` |
| `{ enum$: ['a', 'b'] }` | `Joi.valid('a', 'b')` |
| `{ re$: /^a/ }` | `Joi.string().pattern(/^a/)` |
| `{ minlen$: 2, maxlen$: 10 }` | `Joi.string().min(2).max(10)` |
| `{ min$: 1, max$: 9 }` | `Joi.number().min(1).max(9)` |
| `{ d: { string$: true } }` | `Joi.object({ d: Joi.string() })` |

Build the Joi rules with `require('@seneca/joi').Joi` (see
[Validate messages with Joi rules](validate-messages-with-joi-rules.md)).

## 3. Remove `legacy: true`

When no `$` rules remain, drop the option. To find leftovers in a test
or a script, the detection function is exported:

```js
const { is_parambulator } = require('@seneca/joi').intern

is_parambulator({ b: { required$: true } }) // true
is_parambulator({ b: Joi.string() }) // false
```
