/* Testing Joi rules with node:test. Run with: node docs/examples/test-rules.js */
const { test } = require('node:test')
const assert = require('node:assert')
const Seneca = require('seneca')
const SenecaJoi = require('../..')
const Joi = SenecaJoi.Joi

test('price needs an item', async () => {
  const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

  seneca.add(
    { role: 'shop', cmd: 'price', item: Joi.string().required() },
    function (msg, reply) {
      reply({ ok: true })
    }
  )

  assert.deepEqual(await seneca.post('role:shop,cmd:price,item:apple'), {
    ok: true,
  })

  await assert.rejects(seneca.post('role:shop,cmd:price'), {
    code: 'act_invalid_msg',
  })

  await new Promise((resolve) => seneca.close(resolve))
})
