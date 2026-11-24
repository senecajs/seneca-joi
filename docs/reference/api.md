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
removed from the pattern and stored in `actdef.rules`. The plugin sorts
the rules of an action by their value:

* **Joi rules**: a Joi schema, or a plain object or array that contains
  one, such as `{ c: Joi.string() }`. The plugin compiles them into

  ```js
  Joi.object().keys(joiRules).unknown()
  ```

  so properties that are not named in the Joi rules are allowed. The
  pattern properties themselves (`role`, `cmd`) are such unnamed
  properties.
* **Other rules**: shape builders from `seneca.valid`, type
  constructors such as `String`, and plain values such as `{ c: 2 }`.
  The plugin leaves them to Seneca, which validates them with its own
  shape, exactly as it does without the plugin.

An action without Joi rules and without a `joi$` function is not
changed at all. An action with Joi rules is validated by both: Seneca's
shape for the other pattern rules first (its defaults are written into
the message), then Joi.

### Rule values

| Rule value | Result |
| ---------- | ------ |
| A Joi schema built with the plugin's Joi copy | Joi rule, used as is. |
| A plain object or array that contains a Joi schema, for example `{ c: Joi.string() }` | Joi rule, compiled by Joi: an optional object whose `c` is a string. Plain values inside it have their Joi meaning (`{ c: 2 }` inside a Joi rule means `c` must equal 2). |
| A Joi schema from another Joi copy | Cannot be compiled: the action rejects every message with `joi_invalid_rules`, see [Errors](errors.md#rules-the-plugin-cannot-use). |
| A shape builder such as `seneca.valid.Required(String)` | Seneca validates it. |
| A plain object, for example `{ c: 2 }` | Seneca validates it with the shape meaning: an optional object whose `c` is a number, 2 by default. |
| A function, for example `String` | Seneca validates it: a required string. |
| A plain object or array that contains both Joi schemas and shape builders | Cannot be split: the action rejects every message with `joi_invalid_rules`. Use one kind for each property. |

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
| Arguments | `schema`: the compiled schema `Joi.object().keys(joiRules).unknown()`, with empty keys when the action has no Joi rules. `actdef`: the action definition (`pattern`, `rules`, `raw`, `plugin` and so on). |
| Return value | A Joi schema. It replaces the compiled schema and is used as is. Rules that are not Joi rules are still validated by Seneca's shape. Anything other than a Joi schema, or an exception, makes the action reject every message with `joi_invalid_rules`. |
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
   `actdef.shape` and returns.
2. Without Joi rules and without a `joi$` function: returns. Seneca's
   own validation is unchanged.
3. Otherwise compiles the Joi schema from the Joi rules, applies
   `joi$`, builds a shape from the other pattern rules (the shape
   Seneca would have built without the Joi rules), deletes
   `actdef.shape` (the shape Seneca 4 compiled from all the pattern
   rules, in which a Joi schema is an instance check) and sets
   `actdef.validate = function (msg, done)`. That function validates
   the message with the shape of the other rules, then calls
   `schema.validate(msg, options.joi)`, and passes the first error, or
   `undefined`, to `done`.
4. If any of this fails (a property that mixes Joi schemas and shape
   builders, a schema from another Joi copy, a `joi$` function that
   throws or returns something else than a Joi schema), the modifier
   does not throw. It logs an error entry and sets an
   `actdef.validate` that rejects every message with a
   `joi_invalid_rules` error.

Seneca calls `actdef.validate` from its inward pipeline before the
action runs, but only when the definition has no `actdef.shape`, which
is why the modifier deletes it. Seneca turns an error into
`act_invalid_msg`. Only the error is used; the value returned by Joi is
discarded.

The plugin has no `defaults`, no `errors`, no exports through
`seneca.export`, and adds no action patterns.
