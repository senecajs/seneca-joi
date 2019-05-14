/* Copyright © 2016-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

var Assert = require('assert')
var Lab = require('@hapi/lab')
var Seneca = require('seneca')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it

var Joi = require('@hapi/joi')
var JoiPlugin = require('..')

describe('joi', function() {
  // NOTE: not using seneca.test(fin) as need to verify errors directly

  function make_seneca() {
    return Seneca({
      log: 'silent',
      legacy: { error_codes: false, validate: false, transport: false }
    })
      .use('promisify')
      .use(JoiPlugin)
  }

  /*
  it('happy', async () => {
    const seneca = await make_seneca()

    seneca.message({ a: 1, b: Joi.required() }, async function(msg) {
      return { c: 3 }
    })

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })
  */

  it('action-validate-callback-style', async () => {
    a1.validate = {
      b: Joi.required()
    }

    function a1(msg, reply) {
      reply({ c: 3 })
    }

    const seneca = await make_seneca()
    seneca.add({ a: 1 }, a1)

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  it('action-validate-callback-style-nice-order', async () => {
    const seneca = await make_seneca()
    seneca.add({ a: 1 }, a1)

    a1.validate = {
      b: Joi.required()
    }

    function a1(msg, reply) {
      reply({ c: 3 })
    }

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  it('action-validate', async () => {
    a1.validate = {
      b: Joi.required()
    }

    async function a1(msg) {
      return { c: 3 }
    }

    const seneca = await make_seneca()
    seneca.message({ a: 1 }, a1)

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  it('action-validate-nice-order', async () => {
    const seneca = await make_seneca()
    seneca.message({ a: 1 }, a1)

    a1.validate = {
      b: Joi.required()
    }

    async function a1(msg) {
      return { c: 3 }
    }

    await seneca.ready()

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  // Should ignore joi rules if plugin not loaded
  it('no-joi', async () => {
    const seneca = Seneca({
      log: 'silent',
      legacy: { error_codes: false, validate: false }
    })
      .use('promisify')
      .add({ a: 1, b: Joi.required() }, function(msg, reply) {
        reply(null, { c: 3 })
      })

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)
  })

  it('custom', async () => {
    const seneca = await make_seneca().add(
      {
        a: 1,
        joi$: function(schema) {
          return schema.keys({ b: Joi.required() })
        }
      },
      function(msg, reply) {
        reply(null, { c: 3 })
      }
    )

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)

    try {
      await seneca.post('a:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  it('edge', async () => {
    const seneca = await make_seneca().add(
      {
        a: 1,
        joi$: 1
      },
      function(msg, reply) {
        reply(null, { c: 3 })
      }
    )

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)
  })

  it('defensives', async () => {
    var pmeta = JoiPlugin.preload({})
    var actmod = pmeta.extend.action_modifier
    var actmeta = {}
    actmod(actmeta)
    Assert.equal(void 0, actmeta.validate)
  })

  it('parambulator-legacy', async () => {
    var seneca = Seneca({
      log: 'silent',
      legacy: { error_codes: false, validate: false }
    })
      .use('promisify')
      .use(JoiPlugin, { legacy: true })
      .add(
        {
          a: 0
        },
        function(msg, reply) {
          reply(null, { c: 0 })
        }
      )
      .add(
        {
          a: 1,
          b: { required$: true }
        },
        function(msg, reply) {
          reply(null, { c: 1 })
        }
      )
      .add(
        {
          a: 2,
          b: { d: { string$: true } }
        },
        function(msg, reply) {
          reply(null, { c: 2 })
        }
      )
      .add(
        {
          a: 3,
          b: { e: 'required$' }
        },
        function(msg, reply) {
          reply(null, { c: 3 })
        }
      )

    var out = await seneca.post('a:0')
    Assert.equal(0, out.c)

    out = await seneca.post('a:1,x:1')
    Assert.equal(1, out.c)

    out = await seneca.post('a:2,b:1')
    Assert.equal(2, out.c)

    out = await seneca.post('a:3,b:1')
    Assert.equal(3, out.c)

    seneca = Seneca({
      log: 'silent',
      legacy: { error_codes: false, validate: false }
    })
      .use('promisify')
      .use(JoiPlugin, { legacy: false })
      .add(
        {
          a: 0
        },
        function(msg, reply) {
          reply(null, { c: 0 })
        }
      )
      .add(
        {
          a: 1,
          b: { c: 2 }
        },
        function(msg, reply) {
          reply(null, { c: 1 })
        }
      )

    out = await seneca.post('a:0,b:1')
    Assert.equal(0, out.c)

    out = await seneca.post('a:1,b:{c:2}')
    Assert.equal(1, out.c)

    try {
      await seneca.post('a:1,b:2')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })

  it('is_parambulator', async () => {
    Assert.ok(
      JoiPlugin.intern.is_parambulator({
        empty: null,
        use: {},
        config: { object$: true },
        plugin: { string$: true }
      })
    )

    Assert.ok(
      !JoiPlugin.intern.is_parambulator({
        a: {
          b: {
            c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 1 } } } } } } } } }
          }
        }
      })
    )
  })

  it('parambulator-legacy test default value seneca > 3.x', async () => {
    var si = Seneca({
      log: 'silent',
      legacy: { error_codes: false, validate: false }
    })

    if (si.version < '3.0.0') {
      return
    }

    si.use(JoiPlugin).use('promisify')

    si.add(
      {
        a: 2,
        b: { d: { string$: true } }
      },
      function(msg, reply) {
        reply(null, { c: 2 })
      }
    )

    await si.ready()

    try {
      await si.post('a:2,b:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })
})
