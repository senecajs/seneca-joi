/* Copyright © 2016-2026 Richard Rodger and other contributors, MIT License. */
'use strict'

const { describe, it } = require('node:test')
const Assert = require('node:assert')
const Seneca = require('seneca')

const Joi = require('@hapi/joi')
const JoiPlugin = require('..')

describe('joi', function () {
  // NOTE: not using seneca.test(fin) as need to verify errors directly

  function make_seneca(t) {
    const seneca = Seneca({ log: 'silent' }).use(JoiPlugin)
    t.after(() => seneca.close())
    return seneca
  }

  it('happy', async (t) => {
    const seneca = make_seneca(t)

    seneca.message({ a: 1, b: Joi.required() }, async function (msg) {
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

  it('action-validate-callback-style', async (t) => {
    a1.validate = {
      b: Joi.required(),
    }

    function a1(msg, reply) {
      reply({ c: 3 })
    }

    const seneca = make_seneca(t)
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

  it('action-validate-callback-style-nice-order', async (t) => {
    const seneca = make_seneca(t)
    seneca.add({ a: 1 }, a1)

    a1.validate = {
      b: Joi.required(),
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

  it('action-validate', async (t) => {
    a1.validate = {
      b: Joi.required(),
    }

    async function a1(msg) {
      return { c: 3 }
    }

    const seneca = make_seneca(t)
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

  it('action-validate-nice-order', async (t) => {
    const seneca = make_seneca(t)
    seneca.message({ a: 1 }, a1)

    a1.validate = {
      b: Joi.required(),
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

  // Without the plugin, Seneca 4 does not read Joi rules as Joi. It
  // compiles every object valued pattern property into its own shape,
  // which reads a Joi schema as an instance check: a valid message is
  // rejected, and a message without the property passes, because the
  // shape fills it in with the schema object.
  it('no-joi', async (t) => {
    const seneca = Seneca({ log: 'silent' }).add(
      { a: 1, b: Joi.required() },
      function (msg, reply) {
        reply(null, { c: 3 })
      }
    )
    t.after(() => seneca.close())

    await Assert.rejects(seneca.post('a:1,b:2'), {
      code: 'act_invalid_msg',
    })

    var out = await seneca.post('a:1')
    Assert.equal(3, out.c)
  })

  // With the plugin, Joi replaces the shape Seneca compiles from the rules.
  it('joi-replaces-shape', async (t) => {
    const seneca = make_seneca(t).add(
      { a: 1, b: Joi.number().required(), c: { d: 2 } },
      function (msg, reply) {
        reply(null, { b: msg.b, c: msg.c })
      }
    )

    await seneca.ready()
    const actdef = seneca.find('a:1')
    Assert.equal(void 0, actdef.shape)
    Assert.equal('function', typeof actdef.validate)

    // The message reaches the action unchanged: no shape defaults.
    var out = await seneca.post('a:1,b:2')
    Assert.equal(2, out.b)
    Assert.equal(void 0, out.c)

    // Plain object rules have their Joi meaning: c.d must equal 2.
    out = await seneca.post('a:1,b:2,c:{d:2}')
    Assert.deepEqual({ b: 2, c: { d: 2 } }, out)

    await Assert.rejects(seneca.post('a:1,b:2,c:{d:3}'), (err) => {
      Assert.equal('act_invalid_msg', err.code)
      Assert.equal('"c.d" must be [2]', err.details.message)
      return true
    })

    await Assert.rejects(seneca.post('a:1,b:x'), (err) => {
      Assert.equal('act_invalid_msg', err.code)
      Assert.equal('"b" must be a number', err.details.message)
      return true
    })
  })

  it('custom', async (t) => {
    const seneca = make_seneca(t).add(
      {
        a: 1,
        joi$: function (schema) {
          return schema.keys({ b: Joi.required() })
        },
      },
      function (msg, reply) {
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

  it('edge', async (t) => {
    const seneca = make_seneca(t).add(
      {
        a: 1,
        joi$: 1,
      },
      function (msg, reply) {
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

  it('parambulator-legacy', async (t) => {
    var seneca = Seneca({ log: 'silent' })
      .use(JoiPlugin, { legacy: true })
      .add(
        {
          a: 0,
        },
        function (msg, reply) {
          reply(null, { c: 0 })
        }
      )
      .add(
        {
          a: 1,
          b: { required$: true },
        },
        function (msg, reply) {
          reply(null, { c: 1 })
        }
      )
      .add(
        {
          a: 2,
          b: { d: { string$: true } },
        },
        function (msg, reply) {
          reply(null, { c: 2 })
        }
      )
      .add(
        {
          a: 3,
          b: { e: 'required$' },
        },
        function (msg, reply) {
          reply(null, { c: 3 })
        }
      )
    t.after(() => seneca.close())

    var out = await seneca.post('a:0')
    Assert.equal(0, out.c)

    out = await seneca.post('a:1,x:1')
    Assert.equal(1, out.c)

    // Seneca's shape would reject b:1 (not an object); legacy removes it.
    out = await seneca.post('a:2,b:1')
    Assert.equal(2, out.c)
    Assert.equal(void 0, seneca.find('a:2').shape)
    Assert.equal(void 0, seneca.find('a:2').validate)

    out = await seneca.post('a:3,b:1')
    Assert.equal(3, out.c)

    const seneca2 = Seneca({ log: 'silent' })
      .use(JoiPlugin, { legacy: false })
      .add(
        {
          a: 0,
        },
        function (msg, reply) {
          reply(null, { c: 0 })
        }
      )
      .add(
        {
          a: 1,
          b: { c: 2 },
        },
        function (msg, reply) {
          reply(null, { c: 1 })
        }
      )
    t.after(() => seneca2.close())

    out = await seneca2.post('a:0,b:1')
    Assert.equal(0, out.c)

    out = await seneca2.post('a:1,b:{c:2}')
    Assert.equal(1, out.c)

    try {
      await seneca2.post('a:1,b:2')
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
        plugin: { string$: true },
      })
    )

    Assert.ok(
      !JoiPlugin.intern.is_parambulator({
        a: {
          b: {
            c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 1 } } } } } } } } },
          },
        },
      })
    )
  })

  // Without legacy: true, parambulator style rules are compiled by Joi.
  it('parambulator-legacy default', async (t) => {
    var si = Seneca({ log: 'silent' })
    t.after(() => si.close())

    si.use(JoiPlugin)

    si.add(
      {
        a: 2,
        b: { d: { string$: true } },
      },
      function (msg, reply) {
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
