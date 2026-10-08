/* Full control of the schema with the joi$ directive. */
const Seneca = require('seneca')
const SenecaJoi = require('../..')
const Joi = SenecaJoi.Joi

const seneca = Seneca({ log: 'silent' }).use(SenecaJoi)

// Dependent properties and preferences for this action only.
seneca.add(
  {
    role: 'shop',
    cmd: 'find',
    // schema is Joi.object().keys(rules).unknown(); actdef is the action definition
    joi$: function (schema, actdef) {
      return schema
        .keys({ id: Joi.string(), name: Joi.string() })
        .xor('id', 'name')
        .prefs({ abortEarly: false })
    },
  },
  function (msg, reply) {
    reply({ found: msg.id || msg.name })
  }
)

// A closed schema: the pattern properties must be listed too.
seneca.add(
  {
    role: 'shop',
    cmd: 'get',
    id: Joi.string().required(),
    joi$: function (schema) {
      return schema
        .keys({ role: Joi.valid('shop'), cmd: Joi.valid('get') })
        .unknown(false)
    },
  },
  function (msg, reply) {
    reply({ got: msg.id })
  }
)

const messages = [
  'role:shop,cmd:find,id:a1',
  'role:shop,cmd:find,name:apple',
  'role:shop,cmd:find,id:a1,name:apple',
  'role:shop,cmd:find',
  'role:shop,cmd:get,id:a1',
  'role:shop,cmd:get,id:a1,extra:1',
]

let i = 0
function next() {
  if (i === messages.length) return seneca.close()
  const msg = messages[i++]
  seneca.act(msg, function (err, out) {
    console.log(msg, '->', err ? err.details.message : out)
    next()
  })
}
next()
