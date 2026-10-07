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
  // left unvalidated instead of being compiled as Joi rules.
  var legacy = null == options.legacy ? false : !!options.legacy

  return {
    extend: {
      action_modifier: function joi_modifier(actdef) {
        if (legacy && intern.is_parambulator(actdef.rules)) {
          // Seneca 3.38 and 4 would otherwise validate them as Gubu shapes.
          delete actdef.gubu
          return actdef
        }

        var joi_mod = (actdef.raw && actdef.raw.joi$) || void 0
        joi_mod = 'function' === typeof joi_mod ? joi_mod : void 0

        if ((actdef.rules && Object.keys(actdef.rules).length) || joi_mod) {
          var schema = Joi.object()
            .keys(actdef.rules)
            .unknown()

          if (joi_mod) {
            schema = joi_mod(schema, actdef)
          }

          // Joi replaces the Gubu shape that Seneca 3.38 and 4 compile from
          // the same rules, so that the rules keep their Joi meaning.
          delete actdef.gubu

          actdef.validate = function joi_validate(msg, done) {
            var res = schema.validate(msg, options.joi)
            done(res.error)
          }
        }

        return actdef
      }
    }
  }
}

var intern = (module.exports.intern = {
  is_parambulator: function(rules, depth) {
    depth = depth || 0

    if (11 < depth) {
      return false
    }

    for (var p in rules) {
      if (
        rules[p] &&
        !rules[p].isJoi &&
        (/\$$/.exec(p) ||
          !!/\$$/.exec(String(rules[p])) ||
          intern.is_parambulator(rules[p], ++depth))
      ) {
        return true
      }
    }

    return false
  }
})
