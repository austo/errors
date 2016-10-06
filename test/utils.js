'use strict';

const util = require('util');

function inspect() {
  let args = slice.apply(null, arguments);
  args.forEach(arg => {
    console.log(util.inspect(arg, {
      depth: null,
      colors: true
    }));
  });
}

function slice() {
  let args = new Array(arguments.length),
    n = args.length;

  for (let i = 0; i < n; i++) {
    args[i] = arguments[i];
  }
  return args;
}

/*jshint ignore:start*/

function printOptimizationStatus(fn) {
  let status = %GetOptimizationStatus(fn);
  switch (status) {
    case 1:
      console.log("Function is optimized");
      break;
    case 2:
      console.log("Function is not optimized");
      break;
    case 3:
      console.log("Function is always optimized");
      break;
    case 4:
      console.log("Function is never optimized");
      break;
    case 6:
      console.log("Function is maybe deoptimized");
      break;
    case 7:
      console.log("Function is optimized by TurboFan");
      break;
    default:
      console.log("Unknown optimization status");
      break;
  }
}

function getOptimizationStatus(fn) {
  return %GetOptimizationStatus(fn);
}

function optimizeOnNextCall(fn) {
  return %OptimizeFunctionOnNextCall(fn);
}

function hasFastProperties(o) {
  return %HasFastProperties(o);
}

function makeDescendants(ctor, props) {
  const results = [ctor];

  let parent = ctor;

  props.forEach(p => {
    let child = parent.extend(p);
    results.push(child);
    parent = child;
  });

  return results;
}

module.exports = {
  optimizeOnNextCall: optimizeOnNextCall,
  hasFastProperties: hasFastProperties,
  getOptimizationStatus: getOptimizationStatus,
  printOptimizationStatus: printOptimizationStatus,
  inspect: inspect,
  makeDescendants: makeDescendants
};
