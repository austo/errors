/* global suite:true */
/* global test:true */

'use strict';

const assert = require('assert'),
  util = require('util'),
  pargs = require('../pargs');

suite('args', function() {

  [{
    inp: ['SOS!', 503, {
      message: 'bad gateway',
      statusCode: 503
    }],
    exp: {
      message: 'SOS!',
      values: [503, {
        message: 'bad gateway',
        statusCode: 503
      }]
    }
  }, {
    inp: ['SOS!', 503, {
        message: 'bad gateway',
        statusCode: 503
      },
      ['foo', {
        message: 'bar'
      }]
    ],
    exp: {
      message: 'SOS!',
      values: [503, {
          message: 'bad gateway',
          statusCode: 503
        },
        'foo', {
          message: 'bar'
        }
      ]
    }
  }].forEach(t => {
    test(`called with ${t.inp}:`, () => {
      let res = pargs.parse(t.inp);
      assert.deepEqual(t.exp, res);
    });
  });

});

/*jshint ignore:start*/

function inspect() {
  let args = pargs.slice.apply(null, arguments);
  args.forEach(a => {
    console.log(util.inspect(a, {
      colors: true,
      depth: null
    }));
  });
}
