![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/joi

[![npm version][npm-badge]][npm-url]

Validates action messages with [Joi](https://github.com/hapijs/joi)
schemas. Put Joi rules into the action pattern, or into the action
function's `validate` property, and messages that do not match are
rejected with an `act_invalid_msg` error before the action runs. Works
with Seneca 3 (3.38 tested) and the Seneca 4 prerelease (4.0.0-rc5 and
4.0.0 tested) on Node.js 22 and 24. Published on npm as `seneca-joi`.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca-joi
```

Seneca is a peer dependency: `seneca@3`, or `seneca@4.0.0-rc5` or later.
The plugin brings its own copy of `@hapi/joi` 17 and exports it as
`require('seneca-joi').Joi`; build your rules with that copy, because
Joi refuses to mix schemas from different Joi versions. On Seneca 4 you
can also validate without this plugin, see
[Migrate to Seneca 4 built in validation](docs/how-to/migrate-to-gubu-validation.md).

## Quick Example

[docs/examples/getting-started.js](docs/examples/getting-started.js):

```js
const Seneca = require('seneca')
const SenecaJoi = require('seneca-joi')
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
  message: seneca: Action cmd:price,role:shop received an invalid message; "item" is required; message content was: {role:shop,cmd:price,quantity:3}.
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
properties with object values are rules. Properties not named in the
rules are allowed.

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
  and [Migrate to Seneca 4 built in validation](docs/how-to/migrate-to-gubu-validation.md).
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

Options (`seneca.use('seneca-joi', options)`), see [Options](docs/reference/options.md):

| Option | Default | Effect |
| ------ | ------- | ------ |
| `joi` | none | Options for Joi's `validate`, applied to every message. |
| `legacy` | `false` | Leave parambulator style rules (`{ required$: true }`) unvalidated. |

Annotations, see [Annotations and exports](docs/reference/api.md):

| Annotation | Effect |
| ---------- | ------ |
| Object valued pattern properties | Joi rules, compiled into `Joi.object().keys(rules).unknown()`. |
| `action.validate = { ... }` | Rules on the action function, merged with the pattern rules. |
| `joi$: (schema, actdef) => schema` | Full control of the compiled schema. |

Exports:

| Export | Effect |
| ------ | ------ |
| `require('seneca-joi').Joi` | The Joi copy to build rules with. |
| `require('seneca-joi').intern.is_parambulator(rules)` | Detects parambulator style rules. |

Errors, see [Errors](docs/reference/errors.md): rejected messages fail
with Seneca's `act_invalid_msg`; `err.details.message` is the Joi
message and `err.details.error` the Joi `ValidationError`.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

### Running tests

The tests use `node:test` and run against the Seneca 4 prerelease
declared in `devDependencies`:

```sh
npm install
npm test
```

Node.js 24 is the primary target and Node.js 22 the secondary; both must
pass. To test against another Seneca build, install it without saving
and run the tests again, for example
`npm install --no-save seneca@3 && npm test`, then `npm install` to
restore the lockfile versions.

The GitHub Actions workflow is provided as a patch in
[.patches](.patches/README.md) because pushing workflow files needs a
scope the authoring session did not have; apply it with
`git am .patches/*.patch`.

## Background

seneca-joi started in 2016 as the replacement for parambulator based
validation (see the [change log](CHANGES.md)). Version 7 moved to
`@hapi/joi` 17. Version 7.1 adds Seneca 4 support and makes Joi take
precedence over the Gubu validation that Seneca 3.38 and 4 build in.

| seneca-joi | Seneca | Node.js | Notes |
| ---------- | ------ | ------- | ----- |
| 7.1.x | 3.38, 4.0.0-rc5, 4.0.0 | 22, 24 | Joi rules replace the core Gubu shape. |
| 7.0.x | 3.x before Gubu message validation | 8 to 13 | Broken on 3.38: Joi schemas were compiled as Gubu shapes. |

The `@hapi/joi` package is deprecated in favour of `joi`, but the two are
different copies and Joi refuses to mix their schemas. The plugin stays
on `@hapi/joi@17.1.1`, the last release of that package, so that
existing rules keep working; `require('seneca-joi').Joi` gives you the
right copy.

Licensed under [MIT][].

[Seneca.js]: https://www.npmjs.com/package/seneca
[Senecajs org]: https://github.com/senecajs/
[senecajs.org]: http://senecajs.org/
[github issue]: https://github.com/senecajs/seneca-joi/issues
[MIT]: ./LICENSE
[npm-badge]: https://badge.fury.io/js/seneca-joi.svg
[npm-url]: https://badge.fury.io/js/seneca-joi
