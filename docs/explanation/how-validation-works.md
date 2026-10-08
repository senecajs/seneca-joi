# How validation works

This page explains what the plugin does to a Seneca instance, where in
the life of a message the rules are applied, how Joi and Seneca's own
Gubu validation relate, and what the design cannot do.

## The problem

Seneca matches messages on the scalar properties of a pattern
(`role: 'shop', cmd: 'price'`) and ignores everything else. The rest of
the message is data, and every action would have to check it by hand.
Seneca therefore lets a pattern carry *rules*: properties whose values
are objects or functions. Rules are removed from the pattern and
validated before the action runs. @seneca/joi makes Joi the engine for
those rules.

## A preload plugin

`seneca.add` is synchronous and does not wait for plugins to initialize,
while plugin definition functions run later, from Seneca's plugin loading
queue. A plugin that hooked into `add` from its definition function would
miss the actions added right after `use`. The plugin therefore does its
work in `preload`, which Seneca calls synchronously inside `use`, before
the definition function. `preload` returns
`{ extend: { action_modifier } }` and Seneca appends the modifier to
`seneca.private$.action_modifiers` at once. The definition function
itself is empty.

## Action modifiers

After every `seneca.add`, Seneca builds the action definition
(`actdef`) and, on the next tick (`setImmediate`), calls each registered
action modifier with it. Seneca's own modifier runs first and merges the
action function's `validate` property into `actdef.rules`. The plugin's
modifier then compiles `Joi.object().keys(actdef.rules).unknown()`,
applies the `joi$` function if there is one, and stores a
`validate(msg, done)` function on the definition.

Three consequences follow from the timing:

* `action.validate = {...}` may be assigned after `seneca.add`, which
  lets the action function come first in a file.
* The plugin covers every action whose `add` ran in the same tick as
  `use` or later. Actions added in an earlier tick, for example before
  an `await seneca.ready()` that precedes `use`, are never validated.
* `seneca.find(pattern).validate` exists only from the next tick on.

## Where validation sits in the message lifecycle

```
act(msg) ──► meta ──► executor queue ──► inward pipeline ──► action
                                              │
callback ◄── outward pipeline ◄── reply(err) ◄┘  (act_invalid_msg)
```

The inward pipeline is a list of tasks that run when the executor
starts a message. `inward_validate_msg` runs after the tasks that find
the action and handle unknown messages, and before the action is
called. It does this:

1. If the instance option `valid.message` is false (or `valid.active`
   is false), skip.
2. If the action definition has a Gubu shape (`actdef.gubu`), validate
   with it and replace the message with the shape's output.
3. Otherwise, if the definition has a `validate` function, call it and
   read the error it passes to `done`, synchronously.
4. On an error, stop the pipeline: Seneca creates the `act_invalid_msg`
   error with the pattern, the Joi message and the cleaned message in
   `details`, and replies with it. The action never runs. The error
   reaches the `act` callback or rejects the `post` promise.

Step 3 is where this plugin's function runs. The message the action
receives is the original one: Joi's return value, with conversions and
defaults applied, is discarded.

`Seneca({ valid: { message: false } })` therefore turns off Joi
validation too.

## Joi and Gubu

Seneca 3.38 and Seneca 4 compile pattern rules into a
[Gubu](https://github.com/rjrodger/gubu) shape when the action is added,
and step 2 above prefers that shape over the `validate` function. Seneca
4 recognises Joi schemas (by their `$_root` property) and builds no
shape for a pattern that contains one; Seneca 3.38 builds the shape
regardless. This had two effects on seneca-joi 7.0.2:

* On Seneca 3.38, a Joi schema in a pattern was compiled as a Gubu shape
  describing the schema object itself. Valid messages were rejected
  (`the number is not an instance of .`) and a missing property was
  filled in with the Joi schema object as its default.
* On both versions, plain object rules such as `{ b: { c: 2 } }` got the
  Gubu meaning (an object with a number `c` defaulting to 2) instead of
  the Joi meaning (an object whose `c` equals 2).

Since 7.1.0 the plugin deletes `actdef.gubu` when it installs
`actdef.validate`, and also for parambulator style rules under
`legacy: true`. With the plugin loaded, every action that has rules is
validated by Joi, and nothing else.

| Rules | Plugin loaded | Plugin not loaded |
| ----- | ------------- | ----------------- |
| Joi schemas | Joi validates (Seneca 3.38 and 4). | Seneca 4: not validated. Seneca 3.38: compiled as a Gubu shape, which breaks the action. |
| Plain objects | Joi validates. | Gubu validates (Seneca 3.38 and 4). |
| Gubu builders or type constructors | Builders fail to compile; constructors constrain nothing. Do not mix them with the plugin. | Gubu validates. |
| Parambulator style, `legacy: true` | Not validated. | Gubu validates, with the wrong meaning. |

## Seneca 3 and Seneca 4

The plugin code is the same for both. What differs around it:

* Promise style calls (`seneca.post`, `seneca.message`) are built into
  Seneca 4. On Seneca 3 they need seneca-promisify.
* Seneca 4 does not build a Gubu shape from Joi schemas, so Joi rules in
  a pattern are harmless there even without the plugin. Seneca 3.38
  needs the plugin (or no Joi rules).
* The `act_invalid_msg` error has the same shape on both, because Seneca
  creates it itself; Seneca 3.38 adds an empty `details.plugin`.
* Plugin options come from `seneca.use(plugin, options)` or
  `Seneca({ plugin: { joi: options } })` on both.
* The plugin's `legacy` option has nothing to do with Seneca's `legacy`
  instance option. Seneca 4 validates its instance options strictly,
  and rejects the old test flags `legacy: { error_codes, validate,
  transport }`; the plugin's option is unaffected.

## Limits

* Validation is synchronous: the inward task reads the error right after
  calling `validate`. Joi features that need `validateAsync` cannot be
  used.
* Joi conversions and defaults never reach the action. Use
  `convert: false` to reject convertible values, or convert in the
  action.
* The rules must be built with the plugin's Joi copy
  (`require('@seneca/joi').Joi`). Joi refuses to mix schema copies.
* The `joi` option applies to the whole instance; per action settings go
  through `joi$` and `schema.prefs()`.
* Unknown properties are allowed, because the pattern's own properties
  are unknown to the schema. Closing the schema means listing them, see
  [Customize the schema with joi$](../how-to/customize-the-schema-with-joi.md).
* With the plugin loaded, no action in the instance can use Gubu
  validation: the plugin replaces the shape of every action that has
  rules.
* Rules travel with the action definition, not with the message. A
  message sent over a transport is validated by the instance that holds
  the action with the rules.
* Only messages are validated, never replies.
