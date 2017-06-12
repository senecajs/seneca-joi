/* Copyright (c) 2016-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Joi = require('joi')

function joi() {}

// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload(plugin) {
  var options = plugin.options || {}

  var legacy = null == options.legacy ? false : !!options.legacy

  return {
    extend: {
      action_modifier: function joi_modifier(actdef) {
        if (legacy && is_parambulator(actdef.rules)) {
          return actdef
        }

        var joi_mod = (actdef.raw && actdef.raw.joi$) || void 0

        if (
          (actdef.rules && Object.keys(actdef.rules).length) ||
          'function' === typeof joi_mod
        ) {
          var schema = Joi.object().keys(actdef.rules).unknown()

          if (joi_mod) {
            schema = joi_mod(schema, actdef)
          }

          actdef.validate = function joi_validate (msg, done) {
            Joi.validate(msg, schema, options.joi, done)
          }
        }

        return actdef
      }
    }
  }
}

function is_parambulator(rules, depth) {
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
        is_parambulator(rules[p], ++depth))
    ) {
      return true
    }
  }

  return false
}

module.exports = joi

module.exports._test$ = {
  is_parambulator: is_parambulator
}
