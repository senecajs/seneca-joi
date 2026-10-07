/* Rules on the action function, and promise style calls (Seneca 4). */
const Seneca = require('seneca')
const SenecaJoi = require('../..')
const Joi = SenecaJoi.Joi

const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

seneca.add('role:shop,cmd:order', order)

// The rules may be assigned after seneca.add: they are read on the next tick.
order.validate = {
  item: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  note: Joi.string().max(100),
}

function order(msg, reply) {
  reply({ ok: true, item: msg.item, quantity: msg.quantity })
}

async function main() {
  console.log(await seneca.post('role:shop,cmd:order,item:apple,quantity:2'))

  try {
    await seneca.post({
      role: 'shop',
      cmd: 'order',
      item: 'apple',
      quantity: 2,
      note: 'x'.repeat(101),
    })
  } catch (err) {
    console.log(err.code, '->', err.details.message)
  }

  await seneca.close()
}

main()
