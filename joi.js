/* Copyright (c) 2016-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Joi = require('@hapi/joi')

module.exports = joi

function joi() {}

// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload(plugin) {
  var options = plugin.options || {}

  // TODO: remove in seneca 4
  var legacy = null == options.legacy ? false : !!options.legacy

  return {
    extend: {
      action_modifier: function joi_modifier(actdef) {
        if (legacy && intern.is_parambulator(actdef.rules)) {
          return actdef
        }

        var joi_mod = (actdef.raw && actdef.raw.joi$) || void 0

        if (
          (actdef.rules && Object.keys(actdef.rules).length) ||
          'function' === typeof joi_mod
        ) {
          var schema = Joi.object()
            .keys(actdef.rules)
            .unknown()

          if (joi_mod) {
            schema = joi_mod(schema, actdef)
          }

          actdef.validate = function joi_validate(msg, done) {
            Joi.validate(msg, schema, options.joi, done)
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
          !!/\$$/.exec('' + rules[p]) ||
          intern.is_parambulator(rules[p], ++depth))
      ) {
        return true
      }
    }

    return false
  }
})
