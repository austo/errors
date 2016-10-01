/* global suite:true */
/* global test:true */

'use strict';

// TODO: migrate to SwError and add to travis

const assert = require('assert'),
  FlagError = require('../lib/FlagError');

suite('FlagError', function() {
  let e = new Error(`I have no idea what you're talking about`);
  e.statusCode = 404;

  test('handle arguments correctly', () => {
    const msg = `Here's an error`;
    const expected = [{
      name: 'FlagError',
      message: 'Here\'s an error',
    }, {
      name: 'FlagError',
      message: 'Here\'s an error',
      originalMessage: 'I have no idea what you\'re talking about',
      statusCode: 404
    }, {
      name: 'FlagError',
      message: 'Here\'s an error',
      aggregatedErrors: [{
        name: 'Error',
        message: 'I have no idea what you\'re talking about',
        statusCode: 404
      }, {
        name: 'Error',
        message: 'I have no idea what you\'re talking about',
        statusCode: 404
      }]
    }, {
      name: 'FlagError',
      originalMessage: 'I have no idea what you\'re talking about',
      statusCode: 404,
    }, {
      name: 'FlagError',
      message: 'FlagError aggregated error',
      aggregatedErrors: [{
        name: 'Error',
        message: 'I have no idea what you\'re talking about',
        statusCode: 404
      }, {
        name: 'Error',
        message: 'I have no idea what you\'re talking about',
        statusCode: 404
      }],
    }, {
      name: 'FlagError',
      originalMessage: 'I have no idea what you\'re talking about',
      statusCode: 404,
      primitaveValue: 'BOOM!'
    }];
    [
      [msg],
      [msg, e],
      [msg, [e, e]],
      [e],
      [
        [e, e]
      ],
      [e, 'BOOM!']
    ].forEach((args, i) => {
      assert.deepEqual(expected[i], FlagError.apply(null, args).transport());
    });
  });

  const msg = 'He has no idea',
    driver = [{
      args: [msg],
      transport: {
        name: "InvalidFileError",
        message: msg,
        invalidFile: true
      },
      properties: [
        "name",
        "message",
        "stack",
        "invalidFile"
      ]
    }, {
      args: [msg, e],
      transport: {
        name: "InvalidFileError",
        message: msg,
        originalMessage: "I have no idea what you're talking about",
        statusCode: 404,
        invalidFile: true
      },
      properties: [
        "name",
        "message",
        "stack",
        "originalStack",
        "originalMessage",
        "statusCode",
        "invalidFile"
      ]
    }, {
      args: [msg, [e, e]],
      transport: {
        name: "InvalidFileError",
        message: msg,
        aggregatedErrors: [{
          name: "Error",
          message: "I have no idea what you're talking about",
          statusCode: 404
        }, {
          name: "Error",
          message: "I have no idea what you're talking about",
          statusCode: 404
        }],
        invalidFile: true
      },
      properties: [
        "name",
        "message",
        "stack",
        "aggregatedErrors",
        "invalidFile"
      ]
    }, {
      args: [e],
      transport: {
        name: "InvalidFileError",
        originalMessage: "I have no idea what you're talking about",
        statusCode: 404,
        invalidFile: true
      },
      properties: [
        "name",
        "stack",
        "originalMessage",
        "statusCode",
        "invalidFile"
      ]
    }, {
      args: [
        [e, e]
      ],
      transport: {
        name: "InvalidFileError",
        message: "InvalidFileError aggregated error",
        aggregatedErrors: [{
          name: "Error",
          message: "I have no idea what you're talking about",
          statusCode: 404
        }, {
          name: "Error",
          message: "I have no idea what you're talking about",
          statusCode: 404
        }],
        invalidFile: true
      },
      properties: [
        "name",
        "message",
        "aggregatedErrors",
        "stack",
        "invalidFile"
      ]
    }, {
      args: [e, 'BOOM!'],
      transport: {
        name: "InvalidFileError",
        originalMessage: "I have no idea what you're talking about",
        statusCode: 404,
        primitaveValue: "BOOM!",
        invalidFile: true
      },
      properties: [
        "name",
        "stack",
        "originalMessage",
        "statusCode",
        "primitaveValue",
        "invalidFile"
      ]
    }, {
      args: [{
        statusCode: 200
      }],
      transport: {
        name: "InvalidFileError",
        statusCode: 200,
        invalidFile: false
      },
      properties: [
        "name",
        "statusCode",
        "stack",
        "invalidFile"
      ]
    }];

  test('extend should behave as expected', () => {
    const InvalidFileError = FlagError.extend({
      name: 'InvalidFileError',
      invalidFile: function() {
        let code = this.statusCode;
        return isNaN(code) ? true : (code === 404);
      }
    });

    driver.forEach(d => {
      let err = InvalidFileError.apply(null, d.args);
      assert(err instanceof FlagError);
      assert(err instanceof InvalidFileError);
      assert.strictEqual(InvalidFileError, err.constructor);
      assert.strictEqual(InvalidFileError, InvalidFileError.prototype.constructor);
      assert.deepEqual(d.transport, err.transport());
      assert.deepEqual(d.properties.sort(), Object.getOwnPropertyNames(err).sort());
    });
  });

  test('should allow extensions which do not retrieve stack data', () => {
    const IgnoreStackError = FlagError.extend({
      ignoreStack: true
    });

    let err = new IgnoreStackError('Just passing information');
    
    assert(err instanceof IgnoreStackError);
    assert.ifError(err.stack);
    assert.strictEqual(true, err.ignoreStack);
    assert.strictEqual('FlagError', err.name);
    assert.strictEqual('Just passing information', err.message);
    assert.deepEqual(['ignoreStack', 'name', 'message'], Object.getOwnPropertyNames(err));
  });
});
