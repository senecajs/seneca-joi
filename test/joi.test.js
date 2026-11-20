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

  // Asserts that a post is rejected with act_invalid_msg, and returns the
  // error for further checks.
  async function invalid(seneca, msg) {
    try {
      await seneca.post(msg)
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
      return err
    }
    Assert.fail('expected act_invalid_msg for ' + msg)
  }

  // With the plugin, Joi replaces the shape Seneca compiles from Joi rules.
  it('joi-replaces-shape', async (t) => {
    const seneca = make_seneca(t).add(
      { a: 1, b: Joi.number().required() },
      function (msg, reply) {
        reply(null, { b: msg.b })
      }
    )

    await seneca.ready()
    const actdef = seneca.find('a:1')
    Assert.equal(void 0, actdef.shape)
    Assert.equal('function', typeof actdef.validate)

    var out = await seneca.post('a:1,b:2')
    Assert.equal(2, out.b)

    var err = await invalid(seneca, 'a:1,b:x')
    Assert.equal('"b" must be a number', err.details.message)
    Assert.ok(err.details.error.isJoi)

    err = await invalid(seneca, 'a:1')
    Assert.equal('"b" is required', err.details.message)
  })

  // Rules that are not Joi schemas are left to Seneca, as if the plugin
  // were not loaded: shape builders, and plain values with their shape
  // meaning.
  it('shape-only', async (t) => {
    const seneca = make_seneca(t)
    const { Required, Default, Any } = seneca.valid

    seneca
      .add({ a: 1, b: Required(String), c: Default(5) }, function (msg, reply) {
        reply(null, { b: msg.b, c: msg.c })
      })
      .add({ a: 2, b: { c: 2 } }, function (msg, reply) {
        reply(null, { b: msg.b })
      })

    // Shape rules on the action function, as @seneca/doc 9 writes for its
    // own actions. Seneca does not build a shape from them, so they are
    // documentation only, with or without this plugin.
    function described(msg, reply) {
      reply(null, { ok: true })
    }
    described.validate = {
      pin: Required(Any()).Describe('The pin sub pattern.'),
    }
    seneca.add('a:3', described)

    await seneca.ready()

    const a1 = seneca.find('a:1')
    Assert.equal('function', typeof a1.shape)
    Assert.equal(void 0, a1.validate)

    var out = await seneca.post('a:1,b:x')
    Assert.deepEqual({ b: 'x', c: 5 }, out)

    var err = await invalid(seneca, 'a:1')
    Assert.equal('b', err.details.props[0].path)

    // Shape meaning: an object whose c is a number, 2 by default.
    out = await seneca.post('a:2,b:{c:3}')
    Assert.deepEqual({ b: { c: 3 } }, out)
    out = await seneca.post('a:2')
    Assert.deepEqual({ b: { c: 2 } }, out)
    await invalid(seneca, 'a:2,b:1')

    Assert.equal(void 0, seneca.find('a:3').shape)
    Assert.equal(void 0, seneca.find('a:3').validate)
    out = await seneca.post('a:3')
    Assert.deepEqual({ ok: true }, out)
  })

  // Joi validates the Joi rules, Seneca's shape validates the other
  // pattern rules: shape first, with its defaults, then Joi.
  it('mixed', async (t) => {
    const seneca = make_seneca(t)
    const { Required, Default } = seneca.valid

    seneca
      .add(
        { a: 1, b: Joi.number().required(), c: Default(5), d: { e: 2 } },
        function (msg, reply) {
          reply(null, { b: msg.b, c: msg.c, d: msg.d })
        }
      )
      .add(
        {
          a: 2,
          c: Required(String),
          joi$: (schema) => schema.keys({ b: Joi.number().required() }),
        },
        function (msg, reply) {
          reply(null, { b: msg.b, c: msg.c })
        }
      )

    await seneca.ready()
    Assert.equal(void 0, seneca.find('a:1').shape)
    Assert.equal('function', typeof seneca.find('a:1').validate)

    var out = await seneca.post('a:1,b:2')
    Assert.deepEqual({ b: 2, c: 5, d: { e: 2 } }, out)

    var err = await invalid(seneca, 'a:1,b:x')
    Assert.equal('"b" must be a number', err.details.message)

    err = await invalid(seneca, 'a:1,b:2,c:x')
    Assert.equal('c', err.details.props[0].path)
    Assert.equal(void 0, err.details.error)

    err = await invalid(seneca, 'a:1,b:2,d:{e:x}')
    Assert.equal('d.e', err.details.props[0].path)

    err = await invalid(seneca, 'a:2')
    Assert.equal('c', err.details.props[0].path)

    err = await invalid(seneca, 'a:2,c:x')
    Assert.equal('"b" is required', err.details.message)

    out = await seneca.post('a:2,c:x,b:1')
    Assert.deepEqual({ b: 1, c: 'x' }, out)
  })

  // Rules the plugin cannot use never throw (an exception from the
  // modifier would be uncaught): the action rejects every message with
  // a joi_invalid_rules error.
  it('invalid-rules', async (t) => {
    const seneca = make_seneca(t)
    const { Default } = seneca.valid

    seneca
      .add(
        { a: 1, b: { c: Joi.string(), d: Default(1) } },
        function (msg, reply) {
          reply(null, { ok: true })
        }
      )
      .add(
        {
          a: 2,
          joi$: function () {
            throw new Error('bad joi$')
          },
        },
        function (msg, reply) {
          reply(null, { ok: true })
        }
      )
      .add({ a: 3, joi$: () => ({ not: 'a schema' }) }, function (msg, reply) {
        reply(null, { ok: true })
      })

    // A schema from another Joi version (simulated).
    const foreign = Object.create(Joi.string())
    foreign[Symbol.for('@hapi/joi/schema')] = { version: '16.0.0' }
    seneca.add({ a: 4, b: foreign }, function (msg, reply) {
      reply(null, { ok: true })
    })

    await seneca.ready()

    var err = await invalid(seneca, 'a:1,b:{c:x}')
    Assert.equal('joi_invalid_rules', err.details.error.code)
    Assert.match(
      err.details.message,
      /property "b" mixes Joi schemas and shape/
    )
    Assert.equal(void 0, seneca.find('a:1').shape)

    err = await invalid(seneca, 'a:2')
    Assert.equal('joi_invalid_rules', err.details.error.code)
    Assert.match(err.details.message, /bad joi\$/)

    err = await invalid(seneca, 'a:3')
    Assert.equal('joi_invalid_rules', err.details.error.code)
    Assert.match(err.details.message, /joi\$ did not return a Joi schema/)

    err = await invalid(seneca, 'a:4,b:x')
    Assert.equal('joi_invalid_rules', err.details.error.code)
    Assert.match(err.details.message, /Cannot mix different versions of joi/)
  })

  it('rule_kind', async () => {
    const seneca = Seneca({ log: 'silent' })
    const { Required } = seneca.valid
    const { rule_kind } = JoiPlugin.intern

    Assert.equal('joi', rule_kind(Joi.string()))
    Assert.equal('joi', rule_kind({ c: { d: Joi.string() } }))
    Assert.equal('joi', rule_kind([1, Joi.string()]))
    Assert.equal('other', rule_kind(Required(String)))
    Assert.equal('other', rule_kind(seneca.valid({ x: Number })))
    Assert.equal('other', rule_kind(String))
    Assert.equal('other', rule_kind({ c: 2 }))
    Assert.equal('mixed', rule_kind({ c: Joi.string(), d: Required(String) }))
    await seneca.close()
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
    const si = Seneca({ log: 'silent' })
    Assert.ok(
      !JoiPlugin.intern.is_parambulator({
        b: si.valid.Required(String),
        c: Joi.string(),
      })
    )
    await si.close()

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

  // Without legacy: true, parambulator style rules are not Joi rules: the
  // plugin leaves them to Seneca's shape, which rejects b:1 (not an object).
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
