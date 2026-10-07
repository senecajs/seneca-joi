/* Copyright © 2016-2026 Richard Rodger and other contributors, MIT License. */
'use strict'

const { describe, it } = require('node:test')
const Assert = require('node:assert')
const Seneca = require('seneca')

const Joi = require('@hapi/joi')
const JoiPlugin = require('..')

describe('joi', function () {
  // NOTE: not using seneca.test(fin) as need to verify errors directly

  // seneca-promisify provides message/post on Seneca 3; it is a no-op on
  // Seneca 4, where promises are built in.
  function make_seneca(t) {
    const seneca = Seneca({ log: 'silent' }).use('promisify').use(JoiPlugin)
    t.after(() => close(seneca))
    return seneca
  }

  // Callback forms: a promise returning ready() can hang on an idle
  // Seneca 4.0.0-rc5 instance.
  function ready(seneca) {
    return new Promise((resolve) => seneca.ready(resolve))
  }

  function close(seneca) {
    return new Promise((resolve) => seneca.close(resolve))
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

    await ready(seneca)

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
  it('no-joi', async (t) => {
    const seneca = Seneca({ log: 'silent' })
      .use('promisify')
      .add({ a: 1, b: Joi.required() }, function (msg, reply) {
        reply(null, { c: 3 })
      })
    t.after(() => close(seneca))

    var out = await seneca.post('a:1,b:2')
    Assert.equal(3, out.c)
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
      .use('promisify')
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
    t.after(() => close(seneca))

    var out = await seneca.post('a:0')
    Assert.equal(0, out.c)

    out = await seneca.post('a:1,x:1')
    Assert.equal(1, out.c)

    out = await seneca.post('a:2,b:1')
    Assert.equal(2, out.c)

    out = await seneca.post('a:3,b:1')
    Assert.equal(3, out.c)

    const seneca2 = Seneca({ log: 'silent' })
      .use('promisify')
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
    t.after(() => close(seneca2))

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

  it('parambulator-legacy test default value seneca > 3.x', async (t) => {
    var si = Seneca({ log: 'silent' })
    t.after(() => close(si))

    if (si.version < '3.0.0') {
      return
    }

    si.use(JoiPlugin).use('promisify')

    si.add(
      {
        a: 2,
        b: { d: { string$: true } },
      },
      function (msg, reply) {
        reply(null, { c: 2 })
      }
    )

    await ready(si)

    try {
      await si.post('a:2,b:1')
      Assert.fail()
    } catch (err) {
      Assert.equal('act_invalid_msg', err.code)
    }
  })
})
