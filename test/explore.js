'use strict';

const SwError = require('../'),
  utils = require('./utils');

makeDescendents(SwError, [{
  name: 'ChildError'
}, {
  serializeStack: true
}, {
  name: 'GreatGrandChildError',
  onPush: function(v) {
    console.log(`${new Date()}: 1 ${this.message}, pushed ${v}`);
  }
}, {
  message: 'I am {{name}}',
  onPush: function(v) {
    console.log(`${new Date()}: 2 ${this.message}, pushed ${v}`);
  }
}, {
  foo: 'bar'
}, {
  foo: {
    bar: 'baz'
  },
  onPush: function(v) {
    console.log(`${new Date()}: 3 ${this.message}, pushed ${v}`);
  }
}, {
  sayHi: function() {
    return `Hello from ${this}!!`;
  }
}]).forEach(v => logInstance(v));

function makeDescendents(ctor, props) {
  const results = [ctor];

  let parent = ctor;

  props.forEach(p => {
    let child = parent.extend(p);
    results.push(child);
    parent = child;
  });

  return results;
}

function logInstance(C) {
  // console.log('CONSTRUCTOR:');
  // console.log(C);
  // console.log('SPEC:');
  // console.log(C.spec);
  // console.log();
  // console.log('EVENTS:');
  // console.log(C.events);
  // console.log();
  let c = new C(new Error());
  new C(new Error());
  new C(new Error());
  utils.optimizeOnNextCall(C);
  new C(new Error());
  // console.log(c.name);
  // utils(C);
  // console.log('INSTANCE:');
  // console.log(c);
  // console.log();
  // console.log('TRANSPORT:');
  // console.log(c.transport());
  // console.log('\n');
  // console.log(Object.getOwnPropertyNames(c));
  process.nextTick(() => {
    console.log();
    console.log(c.name);
    logIf(c.message);
    utils.printOptimizationStatus(C);
    console.log(`Has fast properties: ${utils.hasFastProperties(c)}`);
    // utils.inspect(C.spec, C.events, c);
    console.log(c);
    // console.log('JSON:');
    // console.log(JSON.stringify(c, null, 2));
    // console.log();
    // if (typeof c.sayHi === 'function') {
    //   console.log(c.sayHi());
    // }
  });
}

function logIf() {
  if (process.argv[2] === '-v') {
    console.log.apply(null, arguments);
  }  
}
