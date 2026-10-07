# @seneca/joi documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
tutorials to learn, how-to guides for tasks, reference to look things up,
and explanation to understand the design. The plugin is small, so each
section is short.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | A shop action whose messages are validated with Joi rules, and what a rejected message looks like. |

The programs from the tutorial and the guides are in [examples](examples/);
each one runs with `node docs/examples/<name>.js` from a checkout.

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md) | Rules in the pattern, the `validate` property, handling the error, testing, which Joi copy to use. |
| [Customize the schema with joi$](how-to/customize-the-schema-with-joi.md) | Full control of the Joi schema: dependent properties, preferences per action, closing the schema. |
| [Pass Joi options](how-to/pass-joi-options.md) | `abortEarly`, `convert`, `presence` and other Joi options for the whole instance. |
| [Migrate from parambulator rules](how-to/migrate-from-parambulator.md) | The `legacy` option and a conversion table from parambulator to Joi. |
| [Migrate to Seneca 4 built in validation](how-to/migrate-to-gubu-validation.md) | Comparison with Gubu and the steps to drop the plugin on Seneca 4. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Options](reference/options.md) | `joi` and `legacy`. |
| [Annotations and exports](reference/api.md) | Rules in patterns, the `validate` property, the `joi$` directive, module exports, the plugin definition. |
| [Errors](reference/errors.md) | The `act_invalid_msg` error on Seneca 3 and 4, and compile time failures. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [How validation works](explanation/how-validation-works.md) | Preload and action modifiers, `actdef.validate`, where validation sits in the message lifecycle, Joi versus Gubu, Seneca 3 versus 4, limits. |

## Feature index

Every option, annotation, export and error of the plugin, with the page
that documents it. The plugin adds no action patterns and has no command
line flags.

| Feature | Kind | Reference | Guide |
| ------- | ---- | --------- | ----- |
| `joi` | Option | [Options: joi](reference/options.md#joi) | [Pass Joi options](how-to/pass-joi-options.md) |
| `legacy` | Option | [Options: legacy](reference/options.md#legacy) | [Migrate from parambulator rules](how-to/migrate-from-parambulator.md) |
| Rules in the action pattern, `add(pattern, rules, action)` | Annotation | [Rules in the pattern](reference/api.md#rules-in-the-pattern) | [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md) |
| `action.validate` property | Annotation | [The validate property](reference/api.md#the-validate-property) | [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md) |
| `joi$` directive | Annotation | [The joi$ directive](reference/api.md#the-joi-directive) | [Customize the schema with joi$](how-to/customize-the-schema-with-joi.md) |
| `require('@seneca/joi').Joi` | Export | [Module exports](reference/api.md#module-exports) | [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md) |
| `require('@seneca/joi').intern.is_parambulator` | Export | [intern.is_parambulator](reference/api.md#detecting-parambulator-rules) | [Migrate from parambulator rules](how-to/migrate-from-parambulator.md) |
| `preload` returning `extend.action_modifier` | Plugin definition | [Plugin definition](reference/api.md#plugin-definition) | [How validation works](explanation/how-validation-works.md) |
| `actdef.validate`, removal of `actdef.gubu` | Action definition change | [Plugin definition](reference/api.md#plugin-definition) | [How validation works](explanation/how-validation-works.md) |
| `act_invalid_msg` | Error (Seneca core code) | [Errors](reference/errors.md#rejected-messages) | [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md#4-handle-the-error) |
| Compile time failures (`Invalid schema content`, `Cannot mix different versions of joi schemas`) | Error | [Errors](reference/errors.md#errors-while-compiling-the-rules) | [Validate messages with Joi rules](how-to/validate-messages-with-joi-rules.md#1-load-the-plugin-first) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
