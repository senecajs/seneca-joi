/* Getting started with @seneca/joi: an action whose input is validated. */
// In your own project: const SenecaJoi = require('@seneca/joi')
const Seneca = require('seneca')
const SenecaJoi = require('../..')
const Joi = SenecaJoi.Joi

// Silent log: Seneca otherwise logs an entry for each rejected message.
const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  },
  function (msg, reply) {
    const unit = { apple: 2, pear: 3 }[msg.item] || 1
    reply({
      item: msg.item,
      quantity: msg.quantity,
      total: unit * msg.quantity,
    })
  }
)

seneca.act('role:shop,cmd:price,item:apple,quantity:3', function (err, out) {
  console.log('valid message ->', err, out)

  seneca.act('role:shop,cmd:price,quantity:3', function (err, out) {
    console.log('missing item ->', err.code)
    console.log('  message:', err.message)
    console.log('  details:', err.details.error.details)

    seneca.act('role:shop,cmd:price,item:pear,quantity:0', function (err, out) {
      console.log('quantity too small ->', err.details.message)
      seneca.close()
    })
  })
})
