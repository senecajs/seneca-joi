# Annotations and exports

The plugin adds no action patterns and no instance methods. It changes
how Seneca treats the rules of an action definition, reads two
annotations, and exports two values from the module.

## Loading

```js
seneca.use('@seneca/joi', options)
seneca.use(require('@seneca/joi'), options)
```

The plugin's name is `joi` (`seneca.has_plugin('joi')` is true). The
definition function is empty; all the work is done by a `preload`
function that returns an action modifier (see
[Plugin definition](#plugin-definition)). Load the plugin before adding
the actions it should validate.

## Rules in the pattern

```js
seneca.add({ role: 'shop', cmd: 'price', item: Joi.string().required() }, action)
seneca.add('role:shop,cmd:price', { item: Joi.string().required() }, action)
```

Seneca treats every pattern property whose value is an object or a
function, and whose name does not contain `$`, as a rule. Rules are
removed from the pattern and stored in `actdef.rules`. The plugin
compiles the rules of an action into

```js
Joi.object().keys(actdef.rules).unknown()
```

so properties that are not named in the rules are allowed. The pattern
properties themselves (`role`, `cmd`) are such unnamed properties.

### What Joi makes of rule values

| Rule value | Result |
| ---------- | ------ |
| A Joi schema built with the plugin's Joi copy | Used as is. |
| A Joi schema from another Joi copy | Throws `Cannot mix different versions of joi schemas`. |
| A plain object, for example `{ c: 2 }` | An optional object schema with exactly those keys; `c` must equal `2`. `{ b: { c: 2 } }` rejects `b: 1` (`"b" must be of type object`) and `b: { c: 3 }` (`"b.c" must be [2]`), and accepts a missing `b`. |
| An array, for example `[1, 2]` | The allowed values. |
| A function, for example `String` | Compiles, but constrains nothing. |
| A Gubu builder such as `Required(String)` | Throws `Invalid schema content: symbol` while compiling, see [Errors](errors.md#errors-while-compiling-the-rules). |

## The validate property

```js
function price(msg, reply) { ... }
price.validate = { item: Joi.string().required() }
seneca.add('role:shop,cmd:price', price)
```

Seneca merges the `validate` property of the action function into
`actdef.rules` on the next tick after `add`, before this plugin's
modifier runs, so the property may be assigned after the `add` call.
Pattern rules and `validate` rules are enforced together.

## The joi$ directive

```js
seneca.add(
  {
    role: 'shop',
    cmd: 'find',
    joi$: function (schema, actdef) {
      return schema.keys({ id: Joi.string(), name: Joi.string() }).xor('id', 'name')
    },
  },
  action
)
```

| | |
| --- | --- |
| Where | A property of the pattern object given to `seneca.add`. Like every `$` property it is a directive, not a pattern value and not a rule. |
| Arguments | `schema`: the compiled schema `Joi.object().keys(rules).unknown()`, with empty keys when the action has no rules. `actdef`: the action definition (`pattern`, `rules`, `raw`, `plugin` and so on). |
| Return value | A Joi schema. It replaces the compiled schema and is used as is. |
| Not a function | Ignored. The rules, if any, are compiled as usual. |

Guide: [Customize the schema with joi$](../how-to/customize-the-schema-with-joi.md).

## Module exports

```js
const SenecaJoi = require('@seneca/joi')
```

| Export | Description |
| ------ | ----------- |
| `SenecaJoi` | The plugin definition function, for `seneca.use`. |
| `SenecaJoi.Joi` | The `@hapi/joi` 17 copy the plugin compiles rules with. Build rules with it. |
| `SenecaJoi.preload` | The preload function, called by Seneca. |
| `SenecaJoi.intern.is_parambulator` | The detection function used by the `legacy` option. |

### Detecting parambulator rules

`is_parambulator(rules) => boolean`. Returns true when any property name
of `rules` ends in `$`, when the string form of any property value ends
in `$` (so `'required$'` counts), or when a nested object satisfies the
same test, up to eleven levels deep. Joi schemas are plain objects to
this function; in practice their internal property names do not end in
`$`, so Joi rules are not mistaken for parambulator rules.

## Plugin definition

`preload(plugin)` reads `plugin.options` and returns

```js
{ extend: { action_modifier: function (actdef) { ... } } }
```

Seneca appends the modifier to its list of action modifiers and calls
it, on the next tick after every `seneca.add`, with the new action
definition. The modifier:

1. With `legacy: true` and parambulator style rules: deletes
   `actdef.gubu` and returns.
2. Without rules and without a `joi$` function: returns.
3. Otherwise compiles the schema, applies `joi$`, deletes `actdef.gubu`
   (the shape Seneca 3.38 and 4 compiled from the same rules) and sets
   `actdef.validate = function (msg, done)`, which calls
   `schema.validate(msg, options.joi)` and passes the Joi error, or
   `undefined`, to `done`.

Seneca calls `actdef.validate` from its inward pipeline before the
action runs, and turns an error into `act_invalid_msg`. Only the error
is used; the value returned by Joi is discarded.

The plugin has no `defaults`, no `errors`, no exports through
`seneca.export`, and adds no action patterns.
