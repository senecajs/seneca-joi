# Options

Options are given with `seneca.use`, or under the plugin's name `joi` in
the instance options:

```js
seneca.use('seneca-joi', { joi: { convert: false }, legacy: false })

Seneca({ plugin: { joi: { joi: { convert: false } } } }).use('seneca-joi')
```

The plugin defines no `defaults`, so Seneca does not validate these
options: an unknown option is ignored without an error.

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `joi` | object | none (Joi's defaults) | Options for Joi's `validate` method, applied to every validated message. |
| `legacy` | boolean | `false` | When true, actions whose rules look like parambulator rules are not validated at all. |

## joi

Passed unchanged as the second argument of `schema.validate(msg, joi)`,
where `schema` is the compiled schema of the matched action. Any option
accepted by Joi 17's `validate` can be set: `abortEarly`, `convert`,
`presence`, `allowUnknown`, `messages`, `errors`, and so on. Because the
result of `validate` is discarded, options that change the returned
value (`stripUnknown`, defaults, conversion) do not change the message
the action receives.

The option applies to the whole instance. Per action preferences go
through the `joi$` directive and `schema.prefs()`.

Guide: [Pass Joi options](../how-to/pass-joi-options.md).

## legacy

Any truthy value is treated as `true`. For every action with rules, the
plugin calls `intern.is_parambulator(actdef.rules)`. When it returns
true, the plugin leaves the action without a `validate` function and
removes the Gubu shape that Seneca 3.38 and 4 compiled from the rules,
so the action accepts every message. When it returns false, the rules
are compiled with Joi as usual.

When `legacy` is false, parambulator style rules are compiled by Joi as
plain objects, which rarely means what the rule intended.

Guide: [Migrate from parambulator rules](../how-to/migrate-from-parambulator.md).
