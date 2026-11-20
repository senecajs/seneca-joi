![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/joi

[![npm version][npm-badge]][npm-url]

Validates action messages with [Joi](https://github.com/hapijs/joi)
schemas. Put Joi rules into the action pattern, or into the action
function's `validate` property, and messages that do not match are
rejected with an `act_invalid_msg` error before the action runs.
Requires Seneca 4 and Node.js 24 or later. Published on npm as
`@seneca/joi` from 8.0.0; versions up to 7.0.2 were published as
`seneca-joi`, for Seneca 3.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca@^4 @seneca/joi
```

Seneca is a peer dependency: `seneca` `^4.0.0`. Load the plugin with
`seneca.use('@seneca/joi')` or `seneca.use(require('@seneca/joi'))`.
The plugin brings its own copy of `@hapi/joi` 17 and exports it as
`require('@seneca/joi').Joi`; build your rules with that copy, because
Joi refuses to mix schemas from different Joi versions. Seneca 4 can
also validate messages without this plugin, with its own shape
builders, see
[Migrate to Seneca 4 built in validation](docs/how-to/migrate-to-shape-validation.md).

## Quick Example

[docs/examples/getting-started.js](docs/examples/getting-started.js):

```js
const Seneca = require('seneca')
const SenecaJoi = require('@seneca/joi')
const Joi = SenecaJoi.Joi

const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  },
  function (msg, reply) {
    const unit = { apple: 2, pear: 3 }[msg.item] || 1
    reply({
      item: msg.item,
      quantity: msg.quantity,
      total: unit * msg.quantity,
    })
  }
)

seneca.act('role:shop,cmd:price,item:apple,quantity:3', function (err, out) {
  console.log('valid message ->', err, out)

  seneca.act('role:shop,cmd:price,quantity:3', function (err, out) {
    console.log('missing item ->', err.code)
    console.log('  message:', err.message)
    console.log('  details:', err.details.error.details)

    seneca.act('role:shop,cmd:price,item:pear,quantity:0', function (err, out) {
      console.log('quantity too small ->', err.details.message)
      seneca.close()
    })
  })
})
```

Output:

```
valid message -> null { item: 'apple', quantity: 3, total: 6 }
missing item -> act_invalid_msg
  message: seneca: Action cmd:price,role:shop received an invalid message; "item" is required.
  details: [
  {
    message: '"item" is required',
    path: [ 'item' ],
    type: 'any.required',
    context: { label: 'item', key: 'item' }
  }
]
quantity too small -> "quantity" must be larger than or equal to 1
```

Pattern properties with scalar values (`role`, `cmd`) match messages;
properties with object values are rules. The plugin validates the rules
that are Joi schemas and leaves the others (`seneca.valid` shape
builders, `String`, plain values) to Seneca's own validation, so Joi
and shape rules can share a pattern. Properties not named in the rules
are allowed.

## More Examples

* [Getting started](docs/tutorials/getting-started.md): the program
  above, step by step, and what happens inside.
* [Validate messages with Joi rules](docs/how-to/validate-messages-with-joi-rules.md):
  rules in patterns and on action functions, errors, tests.
* [Customize the schema with joi$](docs/how-to/customize-the-schema-with-joi.md):
  dependent properties, per action preferences, closed schemas.
* [Pass Joi options](docs/how-to/pass-joi-options.md): `abortEarly`,
  `convert`, `presence`.
* [Migrate from parambulator rules](docs/how-to/migrate-from-parambulator.md)
  and [Migrate to Seneca 4 built in validation](docs/how-to/migrate-to-shape-validation.md).
* Runnable programs: [docs/examples](docs/examples/).

## Motivation

Seneca matches messages on pattern properties and leaves the rest of the
message unchecked, so every action would have to validate its own input.
Rules in the pattern keep that out of the action code, and Joi is a
complete, well known schema language for them. See
[How validation works](docs/explanation/how-validation-works.md) for the
design and its limits.

## Support

* Post a [GitHub issue][github issue] for bugs and questions about this
  plugin.
* The Seneca documentation covers patterns, plugins and the built in
  validation: [senecajs.org][] and the
  [Seneca repository](https://github.com/senecajs/seneca).
* Commercial support: [Voxgig](https://www.voxgig.com).

## API

Full documentation: [docs/README.md](docs/README.md).

Options (`seneca.use('@seneca/joi', options)`), see [Options](docs/reference/options.md):

| Option | Default | Effect |
| ------ | ------- | ------ |
| `joi` | none | Options for Joi's `validate`, applied to every message. |
| `legacy` | `false` | Leave parambulator style rules (`{ required$: true }`) unvalidated. |

Annotations, see [Annotations and exports](docs/reference/api.md):

| Annotation | Effect |
| ---------- | ------ |
| Joi schemas as pattern property values | Joi rules, compiled into `Joi.object().keys(joiRules).unknown()`. Other object valued properties stay Seneca shape rules. |
| `action.validate = { ... }` | Joi rules on the action function, merged with the pattern rules. |
| `joi$: (schema, actdef) => schema` | Full control of the compiled schema. |

Exports:

| Export | Effect |
| ------ | ------ |
| `require('@seneca/joi').Joi` | The Joi copy to build rules with. |
| `require('@seneca/joi').intern.is_parambulator(rules)` | Detects parambulator style rules. |

Errors, see [Errors](docs/reference/errors.md): rejected messages fail
with Seneca's `act_invalid_msg`; `err.details.message` is the Joi
message and `err.details.error` the Joi `ValidationError`. Rules the
plugin cannot use (a property mixing Joi and shape builders, another
Joi copy, a failing `joi$`) never throw: the action rejects every
message, with `err.details.error.code` `joi_invalid_rules`.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

### Running tests

The tests use `node:test` and run against the Seneca 4 version
declared in `devDependencies`, on Node.js 24 or later:

```sh
npm install
npm test
```

The repository commits no `package-lock.json`.

## Background

@seneca/joi (published as `seneca-joi` up to 7.0.2) started in 2016 as
the replacement for parambulator based
validation (see the [change log](CHANGES.md)). Version 7 moved to
`@hapi/joi` 17. Version 8 is the first release as `@seneca/joi`: it
supports Seneca 4 only, validates the Joi rules of an action, and
leaves its other rules to the shape validation that Seneca 4 builds in.

| Package | Seneca | Node.js | Notes |
| ------- | ------ | ------- | ----- |
| `@seneca/joi` 8.x | 4 | 24 or later | Joi validates Joi rules; other rules stay with Seneca's shape. |
| `seneca-joi` 7.0.x | 3.x before Gubu message validation | 8 to 13 | Broken on 3.38: Joi schemas were compiled as Gubu shapes. |

The `@hapi/joi` package is deprecated in favour of `joi`, but the two are
different copies and Joi refuses to mix their schemas. The plugin stays
on `@hapi/joi@17.1.1`, the last release of that package, so that
existing rules keep working; `require('@seneca/joi').Joi` gives you the
right copy.

Licensed under [MIT][].

[Seneca.js]: https://www.npmjs.com/package/seneca
[Senecajs org]: https://github.com/senecajs/
[senecajs.org]: http://senecajs.org/
[github issue]: https://github.com/senecajs/seneca-joi/issues
[MIT]: ./LICENSE
[npm-badge]: https://badge.fury.io/js/%40seneca%2Fjoi.svg
[npm-url]: https://www.npmjs.com/package/@seneca/joi
