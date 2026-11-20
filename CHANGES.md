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
  missing property was filled in with the Joi schema object. For an
  action with Joi rules the plugin now replaces `actdef.shape` with its
  own `actdef.validate`.
* Behaviour change: the plugin validates only the rules that are Joi
  schemas (or plain objects and arrays that contain one) and leaves
  every other rule to Seneca's shape, as if the plugin were not loaded:
  `seneca.valid` shape builders, type constructors such as `String`,
  and plain values. A plain object rule such as `{ b: { c: 2 } }` now
  has the shape meaning (an object whose `c` is a number, 2 by default),
  not the Joi meaning (`c` must equal 2); write
  `Joi.object({ c: Joi.valid(2) })` for that. An action without Joi
  rules is not changed at all, so the plugin can share an instance with
  plugins whose rules are shape builders, such as @seneca/doc 9.
* A pattern can mix Joi and shape rules, one kind for each property:
  Seneca's shape validates the other pattern rules first (its defaults
  are written into the message), then Joi validates the Joi rules. Shape
  builders and plain values in the action function's `validate`
  property stay unvalidated, as without the plugin.
* Rules the plugin cannot use no longer throw from the action modifier,
  where the exception was uncaught and stopped the process: a property
  that mixes Joi schemas and shape builders (Joi threw `Invalid schema
  content: symbol`), a schema from another Joi copy, or a `joi$`
  function that throws or returns something other than a Joi schema.
  The modifier logs an error and the action rejects every message with
  `act_invalid_msg`, whose `details.error.code` is the new plugin code
  `joi_invalid_rules`.
* Behaviour change: with `legacy: true`, parambulator style rules
  (`{ required$: true }`) are no longer validated by Seneca's shape
  either; the action accepts every message, as the option intends. The
  option stays: without it, Seneca 4 reads `{ string$: true }` as an
  object shape and rejects ordinary values. Shape builders and Joi
  schemas are no longer taken for parambulator rules (a shape node has
  a `$` property).
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
