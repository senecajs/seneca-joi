/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Joi = require('joi')


function joi (options) {
}


// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload (plugin) {
  var options = plugin.options || {}

  var legacy = null == options.legacy ? false : !!options.legacy

  return {
    extend: {
      action_modifier: function joi_modifier (actmeta) {
        if (legacy && is_parambulator(actmeta.rules)) {
          return actmeta
        }

        var joi_mod = _.isFunction(actmeta.raw && actmeta.raw.joi$)
              ? actmeta.raw.joi$
              : void 0

        if (_.keys(actmeta.rules).length || joi_mod) {

          var schema = Joi.object().keys(actmeta.rules).unknown()

          if (joi_mod) {
            schema = joi_mod(schema, actmeta)
          }

          actmeta.validate = function joi_validate (msg, done) {
            Joi.validate(msg, schema, options.joiOptions, done)
          }
        }

        return actmeta
      }
    }
  }
}

function is_parambulator (rules, depth) {
  depth = depth || 0

  if (11 < depth) {
    return false
  }

  for (var p in rules) {
    if ((rules[p] && !rules[p].isJoi) &&
        (/\$$/.exec(p) ||
         (!!/\$$/.exec('' + rules[p])) ||
         is_parambulator(rules[p], ++depth))) {
      return true
    }
  }

  return false
}


module.exports = joi

module.exports._test$ = {
  is_parambulator: is_parambulator
}
