# How validation works

This page explains what the plugin does to a Seneca instance, where in
the life of a message the rules are applied, how Joi and Seneca's own
shape validation relate, and what the design cannot do.

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
2. If the action definition has a shape (`actdef.shape`), validate
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

## Joi and Seneca's shape

Seneca 4 compiles the rules of a pattern into a
[shape](https://github.com/rjrodger/shape) when the action is added
(`actdef.shape`), and step 2 above prefers that shape over the
`validate` function. Seneca 4 has no Joi support, so the shape gives
every rule its shape meaning:

* A Joi schema is an object of a class, so the shape checks that the
  property is an instance of that class. Every ordinary value fails
  (`property "b" is not of type instance`), and a message without the
  property passes, with the Joi schema object filled in as its value.
* A plain object rule such as `{ b: { c: 2 } }` means an object whose
  `c` is a number defaulting to 2, not the Joi meaning, an object whose
  `c` equals 2.

The plugin therefore deletes `actdef.shape` when it installs
`actdef.validate`, and also for parambulator style rules under
`legacy: true`. With the plugin loaded, every action that has rules is
validated by Joi, and nothing else. Before 8.0.0 the plugin deleted only
`actdef.gubu`, which on Seneca 4 is a deprecated alias of the shape, so
the shape stayed and the Joi rules were never applied.

| Rules | Plugin loaded | Plugin not loaded |
| ----- | ------------- | ----------------- |
| Joi schemas | Joi validates. | Shape instance check: valid messages are rejected, a missing property is filled with the schema object. |
| Plain objects | Joi validates. | Shape validates, with the shape meaning. |
| Shape builders (`seneca.valid`) or type constructors | Builders fail to compile, and the action keeps Seneca's shape; constructors constrain nothing. Do not mix them with the plugin. | Shape validates. |
| Parambulator style, `legacy: true` | Not validated. | Shape validates, with the wrong meaning. |

## Seneca 4

The plugin needs Seneca 4 (`seneca` `^4.0.0`). Seneca 3 users stay on
`seneca-joi@7`. What to know about the Seneca 4 side:

* Promise style calls (`seneca.post`, `seneca.message`) and promises
  from `ready` and `close` are built in; seneca-promisify is not needed.
* The `act_invalid_msg` error is created by Seneca itself, so it has the
  same layout for Joi failures as for shape failures, apart from
  `details.error` and `details.props`, see [Errors](../reference/errors.md).
* Plugin options come from `seneca.use(plugin, options)` or
  `Seneca({ plugin: { joi: options } })`.
* Load the plugin by its full name, `seneca.use('@seneca/joi')`, or by
  module. The short name `joi` makes Seneca try `seneca-joi` first,
  which is the Seneca 3 generation of this plugin when it is installed.
* The plugin's `legacy` option has nothing to do with Seneca's `legacy`
  instance option, which Seneca 4 deprecates.

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
* With the plugin loaded, no action in the instance can use Seneca's
  shape validation for its rules: the plugin replaces the shape of every
  action that has rules.
* Rules travel with the action definition, not with the message. A
  message sent over a transport is validated by the instance that holds
  the action with the rules.
* Only messages are validated, never replies.
