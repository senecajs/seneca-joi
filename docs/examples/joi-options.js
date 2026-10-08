/* Joi validation options for the whole instance. */
const Seneca = require('seneca')
const SenecaJoi = require('../..')
const Joi = SenecaJoi.Joi

const seneca = Seneca({ log: 'silent' }).use(SenecaJoi, {
  joi: {
    abortEarly: false, // report every failure, not only the first
    convert: false, // '3' is not a number
  },
})

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Joi.string().required(),
    quantity: Joi.number().required(),
  },
  function (msg, reply) {
    reply({ total: 1.2 * msg.quantity })
  }
)

seneca.act({ role: 'shop', cmd: 'price' }, function (err) {
  console.log(err.details.message)
  console.log(
    err.details.error.details.map((d) => d.path.join('.') + ': ' + d.type)
  )

  seneca.act(
    { role: 'shop', cmd: 'price', item: 'apple', quantity: '3' },
    function (err) {
      console.log(err.details.message)
      seneca.close()
    }
  )
})
