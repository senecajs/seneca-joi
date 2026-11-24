/* Copyright (c) 2016-2026 Richard Rodger and other contributors, MIT License */
'use strict'

var Joi = require('@hapi/joi')

module.exports = joi

// The Joi copy used to compile rules. Build rules with this copy: Joi
// refuses to mix schemas created by different Joi versions.
module.exports.Joi = Joi

function joi() {}

// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload(plugin) {
  var options = plugin.options || {}

  // When true, parambulator style rules (property names ending in $) are
  // left unvalidated instead of being validated by Seneca's shape.
  var legacy = null == options.legacy ? false : !!options.legacy

  return {
    extend: {
      // Seneca calls action modifiers from setImmediate, where an
      // exception would be uncaught and stop the process. So the modifier
      // never throws: rules it cannot use make the action reject every
      // message with a joi_invalid_rules error, and the error is logged.
      action_modifier: function joi_modifier(actdef) {
        try {
          intern.modify(this, actdef, options, legacy)
        } catch (err) {
          intern.fail(this, actdef, err)
        }
        return actdef
      },
    },
  }
}

var intern = (module.exports.intern = {
  // The plugin validates the rules that are Joi schemas, and leaves every
  // other rule (shape builders, type constructors, plain values) to
  // Seneca's own shape validation, as if the plugin were not loaded.
  modify: function (seneca, actdef, options, legacy) {
    var rules = actdef.rules || {}

    if (legacy && intern.is_parambulator(rules)) {
      // Seneca 4 would otherwise validate them as shapes: it reads
      // { string$: true } as an object with a property string$.
      delete actdef.shape
      return
    }

    var joi_mod = actdef.raw && actdef.raw.joi$
    joi_mod = 'function' === typeof joi_mod ? joi_mod : null

    var joi_rules = {}
    var joi_count = 0
    Object.keys(rules).forEach(function (key) {
      var kind = intern.rule_kind(rules[key])
      if ('mixed' === kind) {
        throw intern.rules_error(
          actdef,
          'property "' +
            key +
            '" mixes Joi schemas and shape builders; use one kind for each property'
        )
      }
      if ('joi' === kind) {
        joi_rules[key] = rules[key]
        joi_count++
      }
    })

    // No Joi rules: Seneca keeps its own validation, untouched.
    if (0 === joi_count && null == joi_mod) {
      return
    }

    var schema = Joi.object().keys(joi_rules).unknown()

    if (joi_mod) {
      schema = joi_mod(schema, actdef)
      if (!Joi.isSchema(schema)) {
        throw intern.rules_error(actdef, 'joi$ did not return a Joi schema')
      }
    }

    // Seneca compiled every pattern rule, Joi schemas included, into
    // actdef.shape, and validates with actdef.shape whenever there is one,
    // calling actdef.validate only when there is none. The shape reads a
    // Joi schema as an instance check, so it is replaced: the pattern
    // rules that are not Joi get the shape Seneca would have built
    // without the Joi rules, and validate runs that shape and then Joi.
    var rest = intern.shape_rules(actdef)
    var rest_shape = null == rest ? null : seneca.valid(seneca.valid.Open(rest))

    delete actdef.shape

    actdef.validate = function joi_validate(msg, done) {
      if (rest_shape) {
        try {
          // Validates in place: shape defaults reach the action.
          rest_shape(msg)
        } catch (err) {
          return done(err)
        }
      }
      var res = schema.validate(msg, options.joi)
      done(res.error)
    }
  },

  // The rules from which Seneca compiled actdef.shape (object or function
  // valued pattern properties without $ in their name), less the Joi ones.
  shape_rules: function (actdef) {
    var raw = actdef.raw || {}
    var rest = null
    Object.keys(raw).forEach(function (key) {
      var val = raw[key]
      if (
        null != val &&
        ('object' === typeof val || 'function' === typeof val) &&
        !~key.indexOf('$') &&
        'other' === intern.rule_kind(val)
      ) {
        rest = rest || {}
        rest[key] = val
      }
    })
    return rest
  },

  // 'joi' when the rule is or contains a Joi schema, 'mixed' when it
  // contains both Joi schemas and shape builders, otherwise 'other'.
  // Plain objects and arrays are searched; other objects are not.
  rule_kind: function (rule) {
    var found = { joi: false, shape: false }
    intern.find_kinds(rule, found, 0, new Set())
    return found.joi ? (found.shape ? 'mixed' : 'joi') : 'other'
  },

  find_kinds: function (val, found, depth, seen) {
    if (null == val || 22 < depth || seen.has(val)) {
      return
    }
    if (intern.is_joi(val)) {
      found.joi = true
      return
    }
    if (intern.is_shape(val)) {
      found.shape = true
      return
    }
    if ('object' !== typeof val) {
      return
    }
    var proto = Object.getPrototypeOf(val)
    if (!Array.isArray(val) && null != proto && Object.prototype !== proto) {
      return
    }
    seen.add(val)
    Object.keys(val).forEach(function (key) {
      intern.find_kinds(val[key], found, depth + 1, seen)
    })
  },

  // A Joi schema from any Joi copy: Joi 16 and later have $_root, older
  // versions isJoi. A schema from another copy fails to compile, which
  // gives a joi_invalid_rules error that says so.
  is_joi: function (val) {
    return (
      null != val &&
      'object' === typeof val &&
      (null != val.$_root || true === val.isJoi)
    )
  },

  // A node built with Seneca's shape builders (seneca.valid), or a
  // compiled shape.
  is_shape: function (val) {
    if (null == val) {
      return false
    }
    if ('object' === typeof val) {
      return null != val.$ && 'object' === typeof val.$ && 'shape$' in val.$
    }
    return (
      'function' === typeof val &&
      null != val.shape &&
      'object' === typeof val.shape
    )
  },

  rules_error: function (actdef, reason) {
    var pattern = (actdef && actdef.pattern) || ''
    var err = new Error(
      '@seneca/joi: the rules of action ' +
        pattern +
        ' cannot be used: ' +
        reason +
        '; the action rejects every message until its rules are fixed'
    )
    err.code = 'joi_invalid_rules'
    err.details = { pattern: pattern, reason: reason }
    return err
  },

  fail: function (seneca, actdef, err) {
    try {
      var reason = String((err && err.message) || err)
      if (/different versions of joi/i.test(reason)) {
        reason += " (build Joi rules with require('@seneca/joi').Joi)"
      }
      var fail_err =
        err && 'joi_invalid_rules' === err.code
          ? err
          : intern.rules_error(actdef, reason)
      if (fail_err !== err) {
        fail_err.cause = err
      }

      delete actdef.shape
      actdef.validate = function joi_invalid_rules(msg, done) {
        done(fail_err)
      }

      if (seneca && seneca.log && 'function' === typeof seneca.log.error) {
        seneca.log.error({
          kind: 'plugin',
          plugin: 'joi',
          case: 'INVALID_RULES',
          code: fail_err.code,
          pattern: fail_err.details.pattern,
          reason: fail_err.details.reason,
        })
      }
    } catch (e) {
      // Never throw from the modifier.
    }
  },

  is_parambulator: function (rules, depth) {
    depth = depth || 0

    if (11 < depth) {
      return false
    }

    for (var p in rules) {
      if (
        rules[p] &&
        !intern.is_joi(rules[p]) &&
        !intern.is_shape(rules[p]) &&
        (/\$$/.exec(p) ||
          !!/\$$/.exec(String(rules[p])) ||
          intern.is_parambulator(rules[p], ++depth))
      ) {
        return true
      }
    }

    return false
  },
})
