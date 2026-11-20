# Changes

## 8.0.0 2026-11-20

First release under the name `@seneca/joi`. Versions up to 7.0.2 were
published as `seneca-joi`. Version 7.1.0 was prepared but never
published; its changes are part of this release.

* Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users
  stay on `seneca-joi@7`. Seneca 2 is no longer supported.
* Renamed from `seneca-joi` to `@seneca/joi`. Load the plugin with
  `seneca.use('@seneca/joi')` or `seneca.use(require('@seneca/joi'))`.
  `seneca.use('seneca-joi')` does not find the new name.
* Node.js 24 or later (`engines.node` `>=24`).
* Fix for Seneca 4.0.0: Joi rules were not applied. Seneca 4 compiles
  the rules of every action into its own shape (`actdef.shape`) and
  validates with that shape whenever it exists, so the `validate`
  function the plugin installed was never called. The shape reads a Joi
  schema as an instance check: valid messages were rejected with
  `act_invalid_msg` (`property "b" is not of type instance`), and a
  missing property was filled in with the Joi schema object. The plugin
  now deletes `actdef.shape` when it installs `actdef.validate`.
* Behaviour change: with the plugin loaded, Joi validation replaces the
  shape that Seneca 4 compiles from the same rules. Plain object rules
  such as `{ b: { c: 2 } }` have their Joi meaning (`b.c` must equal 2)
  instead of the shape meaning (an object whose `c` defaults to 2), and
  the message reaches the action without shape defaults.
* Behaviour change: with `legacy: true`, parambulator style rules
  (`{ required$: true }`) are no longer validated by Seneca's shape
  either; the action accepts every message, as the option intends. The
  option stays: without it, Seneca 4 reads `{ string$: true }` as an
  object shape and rejects ordinary values.
* Without the plugin, Seneca 4 does not apply Joi rules: a Joi schema in
  a pattern is an instance check for the shape. The `no-joi` test now
  asserts this.
* A `joi$` value that is not a function is ignored instead of throwing.
* New export: `require('@seneca/joi').Joi` is the `@hapi/joi` copy the
  plugin compiles rules with. Joi refuses to mix schemas from different
  copies, so build rules with it. `@hapi/joi` 17 stays the dependency:
  the `joi` package is a different copy that cannot be mixed with
  existing `@hapi/joi` rules.
* Tests use `node:test`; coveralls and Travis CI removed. Tested with
  Seneca 4.0.0 on Node.js 26. `seneca-promisify` is no longer used:
  promises are built into Seneca 4.
* `package.json`: `repository.url` in the `git+https` form,
  `publishConfig.access` `public`; `package-lock.json` is no longer
  committed.
* Documentation reorganised into a README landing page and a `docs/`
  tree with tutorial, how-to guides, reference and explanation, with
  runnable examples in `docs/examples/`. The guide for validating
  without the plugin now describes Seneca 4's shape validation
  (`docs/how-to/migrate-to-shape-validation.md`).

## 20160906: 1.0.0

* Breaking change: parambulator check is off by default PR#11
* Updated dependencies
* Added Seneca 3 and Node 6 support
* Dropped Node 5 support
