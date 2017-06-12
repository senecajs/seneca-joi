![Seneca](http://senecajs.org/files/assets/seneca-logo.png)

> A [Seneca.js][] plugin that validates messages using the
> [joi](github.com/rjrodger/joi) module.

# seneca-joi
[![npm version][npm-badge]][npm-url]
[![Dependency Status][david-badge]][david-url]
[![Build Status][travis-badge]][travis-url]
[![Gitter][gitter-badge]][gitter-url]


## Installation
```sh
npm install seneca-joi
```

And in your code:

```js
require('seneca')({
  legacy: {validate: false} // needed if using Seneca 2.x
})
.use('seneca-joi', {
  joiOptions: {allowUnknown: true}    // example of passing in Joi options
})
```

## Usage

You can validate action messages by providing
[joi](https://github.com/hapijs/joi) rules as part of the
action definition.

```js
var Joi = require('joi')

require('seneca')
    .use('joi')
    .add(
      {
        a: 1,
        b: Joi.required()
      },
      function (msg, done) {
        done(null, {c: msg.b})
      })
    .act('a:1,b:2') // valid
    .act('a:1') // invalid as no b value
```

Any properties in the action pattern that are not constants are
interpreted as _joi_ rules.

You can also modify or replace the Joi schema by providing a function
via the `joi$` property. This gives you full control of the Joi schema.

```js
var Joi = require('joi')

require('seneca')
    .use('joi')
    .add(
      {
        a: 1,
        joi$: function (schema) {
          return schema.keys({b: Joi.required()})
        }
      },
      function (msg, done) {
        done(null, {c: msg.b})
      })
    .act('a:1,b:2') // valid
    .act('a:1') // invalid as no b value
```

## Contributing

The [Senecajs org][] encourages open participation. If you feel you
can help in any way, be it with documentation, examples, extra
testing, or new features please get in touch.


## License
Copyright (c) 2016, Richard Rodger and other contributors.
Licensed under [MIT][].

[MIT]: ./LICENSE
[npm-badge]: https://badge.fury.io/js/seneca-joi.svg
[npm-url]: https://badge.fury.io/js/seneca-joi
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[@senecajs]: http://twitter.com/senecajs
[senecajs.org]: http://senecajs.org/
[travis-badge]: https://travis-ci.org/senecajs/seneca-joi.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-joi
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[github issue]: https://github.com/senecajs/seneca-joi/issues
[david-badge]: https://david-dm.org/senecajs/seneca-joi.svg
[david-url]: https://david-dm.org/senecajs/seneca-joi
