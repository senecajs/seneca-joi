/* The same rules with Seneca 4 built in Gubu validation, without seneca-joi. */
const Seneca = require('seneca')

const seneca = Seneca({ log: 'silent' })
const { Required, Min } = seneca.valid

seneca.add(
  {
    role: 'shop',
    cmd: 'price',
    item: Required(String),
    quantity: Min(1, Number),
  },
  function (msg, reply) {
    reply({ item: msg.item, quantity: msg.quantity })
  }
)

seneca.act('role:shop,cmd:price,item:apple,quantity:3', function (err, out) {
  console.log('valid message ->', err, out)

  seneca.act('role:shop,cmd:price,quantity:0', function (err) {
    console.log(err.code, '->', err.details.message)
    console.log(err.details.props)
    seneca.close()
  })
})
