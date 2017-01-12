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

  suite('AsyncConstruct', function() {
    let props = [{
      name: 'First',
      onConstructed: function first() {
        this.coll = [];
        this.coll.push(this.name);
      }
    }, {
      name: 'Second',
      onConstructed: function second() {
        this.coll.push(this.name);
      }
    }, {
      name: 'Third',
      onConstructed: function third() {
        this.coll.push(this.name);
      }
    }];

    utils.makeDescendants(SwError, props).forEach((C, i) => {
      test(`${i}${ordinal(i)} should run construction functions ` +
        `synchronously and in sequence`, done => {
          let c = new C(new Error());
          if (i > 0) {
            assert.strictEqual(i, C.events.constructed.length);
            assert.strictEqual(props[i - 1].onConstructed, C.events.constructed[i - 1]);
            assert.strictEqual(i, c.coll.length);
            assert.strictEqual(c.name, c.coll[i - 1]);
          }
          done();
        });
    });

    utils.makeDescendants(SwError, props.map(p => {
      p.asyncConstruct = true;
      return p;
    })).forEach((C, i) => {
      test(`${i}${ordinal(i)} should run construction functions ` +
        `asynchronously and in sequence`, done => {
          let c = new C(new Error());
          if (i > 0) {
            assert.strictEqual(i, C.events.constructed.length);
            assert.strictEqual(props[i - 1].onConstructed, C.events.constructed[i - 1]);
            assert(c.coll === undefined);
            process.nextTick(iter => {
              assert.strictEqual(iter, c.coll.length);
              assert.strictEqual(c.name, c.coll[iter - 1]);
              done();
            }, i);
          } else {
            done();
          }
        });
    });
  });

  suite('OmitStack', function() {
    test('should not have `stack` property when extended with `omitStack`', () => {
      const OmitStackError = SwError.extend({ name: 'OmitStackError', omitStack: true });
      const swerr = new SwError();
      const stackless = new OmitStackError();
      logIf(stackless);
      assert.strictEqual(swerr.hasOwnProperty('stack'), true);
      assert.strictEqual(stackless.hasOwnProperty('stack'), false);
    });
  });

  suite(`\`hasValues\``, function() {
    [{
      a: [],
      n: 0
    }, {
      a: [1],
      n: 1
    }, {
      a: [1, 2],
      n: 2
    }, {
      a: ['msg'],
      n: 0
    }, {
      a: ['msg', 1],
      n: 1
    }, {
      a: ['msg', 1, 2],
      n: 2
    }].forEach(args => {
      test(`should correctly handle ${args.a.length} values`, () => {
        let e = new SwError(args.a);
        assert.strictEqual(args.n, e.values.length);
        assert.strictEqual((args.n > 0), e.hasValues());
      });
    });
  });

  suite(`\`callbackValue\``, function() {
    [{
      a: [],
      n: 0
    }, {
      a: [1],
      n: 1
    }, {
      a: [1, 2],
      n: 2
    }, {
      a: ['msg'],
      n: 0
    }, {
      a: ['msg', 1],
      n: 1
    }, {
      a: ['msg', 1, 2],
      n: 2
    }].forEach(args => {
      test(`should correctly handle ${args.a.length} values`, () => {
        let e = new SwError(args.a);
        assert.strictEqual(args.n, e.values.length);
        assert.strictEqual((args.n > 0) ? e : null, e.callbackValue());
      });
    });
  });

  suite(`\`push\``, function() {
    [{
      tag: 'single value',
      inp: ['v'],
      exp: ['v']
    }, {
      tag: 'multiple values',
      inp: ['v', 'vv', 'vvv'],
      exp: ['v', 'vv', 'vvv']
    }, {
      tag: 'array',
      inp: [
        ['v', 'vv', 'vvv']
      ],
      exp: ['v', 'vv', 'vvv']
    }, {
      tag: 'varargs with array',
      inp: ['v', 'vv', ['av', 'avv'], 'vvv'],
      exp: ['v', 'vv', 'av', 'avv', 'vvv']
    }].forEach(t => {
      test(`should handle ${t.tag} and return \`this\``, done => {
        let vals = [];
        let swerr = new SwError().on('push', v => vals.push(v));
        let err = swerr.push.apply(swerr, t.inp);
        process.nextTick(() => {
          assert.deepEqual(t.exp, swerr.values);
          assert.deepEqual(t.exp, vals);
          assert.strictEqual(swerr, err);
          done();
        });
      });
    });

    test(`should normally return \`this\``, () => {
      let swerr = new SwError();
      let err = swerr.push('v');
      assert.deepEqual(['v'], swerr.values);
      assert.strictEqual(swerr, err);
    });

    test(`instance push should work with constructor args`, done => {
      let vals = [];
      let swerr = new SwError([1, 2, [3, 4], 5]).on('push', v => vals.push(v));
      process.nextTick(() => {
        assert.deepEqual([1, 2, 3, 4, 5], swerr.values);
        assert.deepEqual([1, 2, 3, 4, 5], vals);
        done();
      });
    });

    test(`pushing \`this\` should be a no-op`, done => {
      const swerr = new SwError(1, 2, 3, 4, 5);
      process.nextTick(() => {
        swerr.on('push', () => assert(false));
        swerr.push(swerr);
        assert.deepEqual([1, 2, 3, 4, 5], swerr.values);
        done();
      });
    });
  });

  suite(`\`from\` factory method`, function() {
    test('`from` should be function on constructor', () => {
      assert.strictEqual('function', typeof SwError.from);
    });

    test('`from` should instantiate receiver', () => {
      let swerr1 = new SwError('Oops', new Error()),
        swerr2 = SwError.from(swerr1);
      assert(swerr2 instanceof SwError);
      assert.deepEqual(swerr1.values, swerr2.values);
      assert.deepEqual(swerr1.message, swerr2.message);
    });

    const BabyError = SwError.extend({
      name: 'BabyError'
    });

    [{
      tag: 'single value',
      inp: ['v']
    }, {
      tag: 'multiple values',
      inp: ['v', 'vv', 'vvv']
    }, {
      tag: 'array',
      inp: [
        ['v', 'vv', 'vvv']
      ]
    }, {
      tag: 'varargs with array',
      inp: ['v', 'vv', ['av', 'avv'], 'vvv']
    }].forEach(t => {
      test(`child \`from\` should correctly appropriate parent instance [${t.tag}]`, () => {
        let swerr = SwError.apply(null, t.inp);
        let baby = BabyError.from(swerr);
        assert(baby instanceof BabyError);
        assert.deepEqual(swerr.values, baby.values);
        assert.deepEqual(swerr.message, baby.message);
      });
    });

    test(`if passed non-SwError, \`from\` should instantiate receiver w/o arguments`, () => {
      let swerr = SwError.from({ msg: 'not SwError!' });
      assert(swerr instanceof SwError);
      assert.deepEqual([], swerr.values);
    });

    let s1 = new SwError('First oops', 'v1', 'vv1'),
      s2 = new SwError('Second oops', 'v2', 'vv2');

    [{
      tag: 'msg, instance',
      inp: ['First message', s1],
      exp: {
        message: 'First message',
        values: s1.values
      }
    }, {
      tag: 'instance, msg',
      inp: [s1, 'Second message'],
      exp: {
        message: 'Second message',
        values: s1.values
      }
    }, {
      tag: 'instance, instance',
      inp: [s1, s2],
      exp: {
        message: s1.message,
        values: s1.values
      }
    }, {
      tag: 'msg, msg',
      inp: ['Third message', 'Fourth message'],
      exp: {
        message: 'Third message',
        values: []
      }
    }].forEach(t => {
      test(`should handle optional message argument [${t.tag}]`, () => {
        let swerr = SwError.from.apply(null, t.inp);
        assert.strictEqual(t.exp.message, swerr.message);
        assert.deepEqual(t.exp.values, swerr.values);
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
