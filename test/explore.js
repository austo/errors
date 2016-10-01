'use strict';

const SwError = require('../');

makeDescendents(SwError, [{
  name: 'ChildError'
}, {
  ignoreStack: true
}, {
  name: 'GreatGrandChildError'
}, {
  message: 'I am {{name}}'
}, {
  foo: 'bar'
}, {
  foo: {
    bar: 'baz'
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
  console.log('SPEC:');
  console.log(C.spec);
  console.log();
  let c = new C();
  console.log('INSTANCE:');
  console.log(c);
  console.log();
  console.log('TRANSPORT:');
  console.log(c.transport());
  console.log();
  console.log('JSON:');
  console.log(JSON.stringify(c));
  console.log('\n');
  console.log(Object.getOwnPropertyNames(c));
}
