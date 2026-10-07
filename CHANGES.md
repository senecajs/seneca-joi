## 20261007: 7.1.0

* Seneca 4 prerelease support: tested with seneca 4.0.0-rc5 and the
  unreleased 4.0.0, and with seneca 3.38.0, on Node.js 24 and 22.
* Behaviour change: when the plugin is loaded, Joi validation replaces
  the Gubu shape that Seneca 3.38 and 4 compile from the same rules.
  Before this change seneca 3.38 validated Joi rules in patterns with
  Gubu, which rejected valid messages and filled a missing property
  with the Joi schema object. Plain object rules now have their Joi
  meaning again instead of the Gubu one.
* Behaviour change: with `legacy: true`, parambulator style rules are no
  longer validated by Seneca's Gubu either; the action accepts every
  message, as intended.
* A `joi$` value that is not a function is ignored instead of throwing.
* New export: `require('seneca-joi').Joi` is the `@hapi/joi` copy the
  plugin compiles rules with. Joi refuses to mix schemas from different
  copies, so build rules with it.
* Tests migrated from @hapi/lab 22 to node:test; coveralls and Travis CI
  removed. A GitHub Actions workflow for Node.js 24 and 22 is provided as
  a patch in `.patches/`.
* devDependencies: seneca ^4.0.0-rc5, seneca-promisify ^3.7.2;
  peerDependency seneca `>=3 || >=4.0.0-rc5`. `@hapi/joi` 17 stays the
  dependency: the `joi` package is a different copy that cannot be mixed
  with existing `@hapi/joi` rules.
* Documentation reorganised into a README landing page and a `docs/`
  tree with tutorial, how-to guides, reference and explanation, with
  runnable examples in `docs/examples/`.

## 20160906: 1.0.0

* Breaking change: parambulator check is off by default PR#11
* Updated dependencies
* Added Seneca 3 and Node 6 support
* Dropped Node 5 support
