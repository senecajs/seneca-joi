/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Joi = require('joi')


function joi (options) {
}


// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload (plugin) {
  var options = plugin.options || {}

  // Default should be false for Seneca 3.x
  var legacy = null == options.legacy ? true : !!options.legacy

  function is_parambulator (rules) {
    for (var p in rules) {
      if (/\$$/.exec(p)) {
        return true
      }
      else if ('string' === typeof rules[p]) {
        return !!/\$$/.exec('' + rules[p])
      }
      else {
        return is_parambulator(rules[p])
      }
    }
    return false
  }

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
            Joi.validate(msg, schema, done)
          }
        }

        return actmeta
      }
    }
  }
}


module.exports = joi
