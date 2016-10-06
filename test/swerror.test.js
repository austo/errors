/* global suite:true */
/* global test:true */

'use strict';

const assert = require('assert'),
  utils = require('./utils'),
  SwError = require('../');

suite('SwError', function() {

  const props = [{
    name: 'ChildError'
  }, {
    serializeStack: true
  }, {
    name: 'GreatGrandChildError',
    onPush: function(v) {
      logIf(`${new Date()}: 1 ${this.message}, pushed ${v}`);
    }
  }, {
    message: 'I am {{name}}',
    onPush: function(v) {
      logIf(`${new Date()}: 2 ${this.message}, pushed ${v}`);
    }
  }, {
    foo: 'bar'
  }, {
    foo: {
      bar: 'baz'
    },
    onPush: function(v) {
      logIf(`${new Date()}: 3 ${this.message}, pushed ${v}`);
    }
  }, {
    sayHi: function() {
      logIf(`Hello from ${this}!!`);
    }
  }];

  let descendants = utils.makeDescendants(SwError, props);

  suite('Inheritance', function() {
    descendants.forEach((C, i) => {
      test(`${i}${ordinal(i)} descendant should be well-formed`, done => {
        let c = new C();
        assert(c instanceof C);
        assert(c instanceof C.parent);
        assert(c instanceof SwError);
        assert(Array.isArray(c.values));
        if (i > 0) {
          if (props[i - 1].onPush) {
            assert(C.events.push[C.events.push.length - 1] === props[i - 1].onPush);
          }
        }
        done();
      });
    });
  });

  suite('Optimization', function() {
    descendants.forEach((C, i) => {
      test(`${i}${ordinal(i)} descendant should be optimized and have fast properties`, done => {
        let c = new C(new Error());
        new C(new Error());
        utils.optimizeOnNextCall(C);
        new C(new Error());
        process.nextTick(() => {
          assert.strictEqual(1, utils.getOptimizationStatus(C));
          assert.strictEqual(true, utils.hasFastProperties(c));
          done();
        });
      });
    });
  });

  suite('Serialization', function() {
    descendants.forEach((C, i) => {
      test(`${i}${ordinal(i)} descendant should serialize correctly`, done => {
        let c = new C(new Error());
        let t = c.transport();
        let j = JSON.stringify(c);
        assert.strictEqual(c.serializeStack, (typeof t.stack === 'string'));
        if (!c.serializeStack) {
          t.values.forEach(v => assert.ifError(v.stack));
        }
        assert.deepEqual(t, JSON.parse(j));
        done();
      });
    });
  });

  suite('Events', function() {
    utils.makeDescendants(SwError, [{
      name: 'First',
      onPush: function() {
        this.coll.push(this.name);
      },
      onConstructed: function() {
        this.coll = [];
      }
    }, {
      name: 'Second',
      onPush: function() {
        this.coll.push(this.name);
      }
    }, {
      name: 'Third',
      onPush: function() {
        this.coll.push(this.name);
      }
    }]).forEach((C, i) => {
      test(`${i}${ordinal(i)} descendant inherit its parent's events`, done => {
        let c = new C(new Error());
        process.nextTick((iter) => {
          if (iter > 0) {
            assert.strictEqual(iter, c.coll.length);
          }
          done();
        }, i);
      });
    });
  });

});

function ordinal(k) {
  switch (k) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function logIf() {
  if (process.argv[process.argv.length - 1] === '-v') {
    console.log.apply(null, arguments);
  }
}

