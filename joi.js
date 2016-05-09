/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Joi = require('joi')


function joi (options) {
}


// Has to be preloaded as seneca.add does not wait for plugins to load.
joi.preload = function joi_preload (plugin) {
  return {
    extend: {
      action_modifier: function joi_modifier (actmeta) {
        if (_.keys(actmeta.rules).length) {

          var schema = Joi.object().keys(actmeta.rules).unknown()

          if (actmeta.raw && _.isFunction(actmeta.raw.joi$)) {
            schema = actmeta.raw.joi$(schema)
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
