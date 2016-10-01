'use strict';

const EventEmitter = require('events');

// TODO: what are the required fields?
// I want to see a base SwError spec when I invoke
// SwError.spec();

function SwError(msg, errs) {
  if (!(this instanceof SwError)) {
    return new SwError(msg, errs);
  }

  const spec = this.constructor.spec,
    events = this.constructor.events;

  Object.keys(spec).forEach(k => {
    let v = renderTemplate(spec[k], spec);
    this[k] = v;
  });

  if (typeof msg === 'string') {
    this.message = msg;
  }

  // TODO: clean this up.
  // Once msg is dealt with, use a function
  // to dispatch the remaining arguments according to their
  // types.
  // Users should't have to memorize the argument order.
  else if (isObjectOrError(msg)) {
    copyShallow(this, msg);
  }
  else {
    if (Array.isArray(msg)) {
      this.aggregatedErrors = msg;
    }
  }

  if (!this.ignoreStack) {
    Error.captureStackTrace(this, this.constructor);
  }

  if (Array.isArray(errs) && (!this.aggregatedErrors)) {
    this.aggregatedErrors = errs;
  }
  else if (isObjectOrError(errs)) {
    copyShallow(this, errs);
  }
  else if (errs) {
    this.primitaveValue = errs;
  }

  let ee = new EventEmitter();

  Object.keys(events).forEach(evt => {
    events[evt].forEach(fn => {
      ee.on(evt, fn.bind(this));
    });
  });

  process.nextTick(() => ee.emit('constructed', this));
}

// TODO: add a push method to the prototype which can handle varargs or array
// two notifications:
// 'constructed' (`this` context or instance as argument)
// 'push' (`this` context or instance as first arg + pushed error as second arg)

SwError.prototype = Object.create(Error.prototype);
SwError.prototype.constructor = SwError;

// TODO: figure out the JSON/transport story. What are the rules
// for including the stack.

SwError.prototype.transport = function() {
  return transport(this);
};

SwError.prototype.toJSON = function() {
  return transport(this);
};

SwError.spec = Object.freeze({
  name: 'SwError',
  message: '{{name}} aggregated error',
  ignoreStack: false
});

SwError.events = {};

SwError.extend = function(props) {
  const self = this,
    extensionProps = mergeSpecs(self, props),
    ctor = extend(self);
  ctor.spec = extensionProps.spec;
  ctor.events = extensionProps.events;
  ctor.parent = self;
  ctor.extend = function(p) {
    return self.extend.call(this, p);
  };
  return ctor;
};

function extend(clazz) {
  function SwErrorExtension() {
    if (!(this instanceof SwErrorExtension)) {
      let obj = Object.create(SwErrorExtension.prototype);
      return SwErrorExtension.apply(obj, arguments);
    }
    clazz.apply(this, arguments);
    return this;
  }
  SwErrorExtension.prototype = Object.create(clazz.prototype);
  SwErrorExtension.prototype.constructor = SwErrorExtension;
  return SwErrorExtension;
}

const allowedEvents = ['constructed', 'push'];
const allowedEventsRe = new RegExp('^on(' +
  allowedEvents
  .map(e => e[0].toUpperCase() + e.substr(1))
  .join('|') + ')$');

// TODO: allow insertion of methods on the subclass prototype??
function mergeSpecs(parent, childProps) {
  let result = {
    spec: {},
    events: {}
  };
  allowedEvents.forEach(evt => result.events[evt] = []);
  Object.keys(childProps).forEach(k => {
    if (typeof childProps[k] !== 'function') {
      result.spec[k] = childProps[k];
      console.log(result);
      return;
    }
    if (allowedEventsRe.test(k)) {
      result.events[k.replace(allowedEventsRe, (match, evt) => evt.toLowerCase())].push(childProps[k]);
    }
  });
  Object.keys(parent.spec).forEach(k => {
    if (!result.spec.hasOwnProperty(k)) {
      result.spec[k] = parent.spec[k];
    }
  });
  Object.keys(parent.events).forEach(k => {
    parent.events[k].forEach(evt => {
      result.events[evt].push(evt);
    });
  });
  console.log(result);
  return result;
}

// see here: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
// and here: http://mrale.ph/blog/2015/11/02/crankshaft-vs-arguments-object.html
// and here: http://stackoverflow.com/questions/23662764/difference-between-array-prototype-slice-callarguments-and-array-applynull-a
// TODO: move this to its own module and write an optimization test or two
function slice() {
  var i = arguments.length,
    args = [];
  while (i--) {
    args[i] = arguments[i];
  }
  return args;
}

module.exports = extend;


module.exports = SwError;

function isObjectOrError(v) {
  let t = type(v);
  return t === 'Object' || t === 'Error';
}

function copyShallow(dst, src) {
  Object.getOwnPropertyNames(src).forEach(k => {
    if (typeof dst[k] === 'undefined') {
      dst[k] = src[k];
    }
    else {
      let newKey = 'original' + (k[0].toUpperCase() + k.substr(1));
      dst[newKey] = src[k];
    }
  });
}

function copySafe(dst, src) {
  Object.getOwnPropertyNames(src).forEach(k => {
    switch (k) {
      // TODO: see stack comment above
      // case 'stack':
      // case 'originalStack': 
      case 'region':
      case 'extendedRequestId':
      case 'retryable':
      case 'retryDelay':
        return;
      default:
        dst[k] = transport(src[k]);
    }
  });
  return dst;
}

function transport(v) {
  let t = type(v);

  switch (t) {
    case 'Object':
      return copySafe({}, v);
    case 'Error':
      return copySafe({
        name: v.constructor.name
      }, v);
    case 'Array':
      return v.map(x => transport(x));
    default:
      return v;
  }
}

const templateParamRe = /{{(\w+)}}/g;

function renderTemplate(tmpl, params) {
  if (typeof tmpl !== 'string') {
    return tmpl;
  }
  return tmpl.replace(templateParamRe, (match, param) => {
    if (typeof params[param] !== 'string') {
      return '';
    }
    return params[param];
  });
}

const typeRe = /^\[object\s(\w+)\]$/;

function type(v) {
  let m = typeRe.exec(Object.prototype.toString.call(v));

  if (!m) {
    throw new RangeError('wtf');
  }

  return m[1];
}
