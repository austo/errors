'use strict';


function parse(args) {
  let result = {
    message: '',
    values: []
  };
  handleArgs(args, result);
  return result;
}

function handleArgs(args, result) {
  args.forEach(a => {
    if (!a) {
      return;
    }
    if (typeof a === 'string') {
      if (!result.message) {
        result.message = a;
        return;
      }
    }
    if (Array.isArray(a)) {
      return handleArgs(a, result);
    }
    result.values.push(a);
  });
}

/* jshint ignore:start */
// see here: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
// and here: http://mrale.ph/blog/2015/11/02/crankshaft-vs-arguments-object.html
// and here: http://stackoverflow.com/questions/23662764/difference-between-array-prototype-slice-callarguments-and-array-applynull-a
/* jshint ignore:end */
// TODO: write an optimization test or two
function slice() {
  var i = arguments.length,
    args = [];
  while (i--) {
    args[i] = arguments[i];
  }
  return args;
}

module.exports = {
  parse: parse,
  slice: slice
};
