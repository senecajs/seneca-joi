# Errors

The plugin defines no error codes of its own. A message that fails its
rules is rejected by Seneca with the core error `act_invalid_msg`. The
error is created by Seneca, not by the action, so it has the same shape
on Seneca 3.38 and Seneca 4 (the differences in how Seneca 4 passes
errors replied by actions do not apply to it).

## Rejected messages

Delivered as the first argument of the `act` callback, or as the
rejection of `post`. Verified with Seneca 4.0.0-rc5 and 3.38.0:

| Property | Value |
| -------- | ----- |
| `code` | `'act_invalid_msg'` |
| `message` | `seneca: Action <pattern> received an invalid message; <Joi message>; message content was: <message>.` For example `seneca: Action a:1 received an invalid message; "b" is required; message content was: {a:1}.` |
| `details.pattern` | The action pattern, for example `a:1`. |
| `details.message` | The Joi error message, for example `"b" is required`. With `abortEarly: false` the messages of all failures joined by `. `. |
| `details.msg` | The rejected message without directives. |
| `details.error` | The Joi `ValidationError` (`isJoi` is true). `details.error.details` is Joi's array of failures, each with `message`, `path`, `type` and `context`. |
| `details.props` | `[]`. Seneca fills it only for failures of its own Gubu validation. |
| `details.plugin` | Seneca 3.38 only: `{}`. |
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

## Errors while compiling the rules

The rules are compiled on the next tick after `seneca.add`, inside the
plugin's action modifier. A rule that Joi cannot compile, such as a
Gubu builder (`Invalid schema content: symbol`), or a `joi$` function
that throws, throws from that tick. Nothing catches it, so the process
gets an uncaught exception, and if a handler keeps the process alive the
action runs without validation. Make sure every rule is a Joi schema or
a plain value when the plugin is loaded.
