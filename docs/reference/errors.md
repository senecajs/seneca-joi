# Errors

A message that fails its rules is rejected by Seneca with the core
error `act_invalid_msg`. The plugin's own code, `joi_invalid_rules`,
appears inside it when the rules of an action cannot be used, see
[Rules the plugin cannot use](#rules-the-plugin-cannot-use). The
error is created by Seneca, not by the action, so it keeps Seneca's
layout (Seneca 4 passes errors replied by actions unwrapped, which does
not apply to it).

## Rejected messages

Delivered as the first argument of the `act` callback, or as the
rejection of `post`. Verified with Seneca 4.0.0:

| Property | Value |
| -------- | ----- |
| `code` | `'act_invalid_msg'` |
| `message` | `seneca: Action <pattern> received an invalid message; <Joi message>.` For example `seneca: Action a:1 received an invalid message; "b" is required.` The message content is not in the text; it is in `details.msg`. |
| `details.pattern` | The action pattern, for example `a:1`. |
| `details.message` | The Joi error message, for example `"b" is required`. With `abortEarly: false` the messages of all failures joined by `. `. |
| `details.msg` | The rejected message without directives. |
| `details.error` | The Joi `ValidationError` (`isJoi` is true). `details.error.details` is Joi's array of failures, each with `message`, `path`, `type` and `context`. |
| `details.props` | `[]` for a Joi failure. A failure of a shape rule (a rule that is not Joi, see [Rule values](api.md#rule-values)) has the same layout as without the plugin: `details.props` lists `{ path, what, type, value }` and there is no `details.error`. |
| `seneca` | `true` |
| `package` | `'seneca'` |
| `orig` | `null` |
| `callpoint` | Where Seneca created the error. |

The third argument of the `act` callback is the message meta data;
`meta.error` is true for a rejected message.

A Joi failure list looks like this:

```js
[
  {
    message: '"item" is required',
    path: ['item'],
    type: 'any.required',
    context: { label: 'item', key: 'item' },
  },
]
```

## Logging rejected messages

Seneca 4 logs each rejected message as an error level entry
(`kind: 'act', case: 'ERR'`, with the error under `err`), as it does for
any failed action. With the instance option `trace: { invalid: true }`
the inward pipeline adds a warning entry (`case: 'INVALID'`) as well.
`log: 'silent'` suppresses both.

## Rules the plugin cannot use

The rules are compiled on the next tick after `seneca.add`, inside the
plugin's action modifier. The modifier never throws, because nothing
would catch an exception from that tick. When it cannot use the rules of
an action, the action rejects every message, and the modifier logs an
error entry (`kind: 'plugin', plugin: 'joi', case: 'INVALID_RULES'`,
with `code`, `pattern` and `reason`). Causes:

* A property that holds both Joi schemas and shape builders, such as
  `{ c: Joi.string(), d: seneca.valid.Default(1) }`.
* A Joi schema from another Joi copy (`Cannot mix different versions of
  joi schemas`).
* A `joi$` function that throws, or returns something other than a Joi
  schema.

Each message to such an action fails with `act_invalid_msg`, where:

| Property | Value |
| -------- | ----- |
| `details.message` | `@seneca/joi: the rules of action <pattern> cannot be used: <reason>; the action rejects every message until its rules are fixed` |
| `details.error.code` | `'joi_invalid_rules'` |
| `details.error.details` | `{ pattern, reason }` |
| `details.error.cause` | The original exception, when there was one. |

Fix the rules: one kind for each property, every Joi rule built with
`require('@seneca/joi').Joi`, and a `joi$` function that returns a Joi
schema.
