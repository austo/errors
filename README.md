[![Build Status](https://travis-ci.org/austo/swerrs.svg?branch=master)](https://travis-ci.org/austo/swerrs)

Stop Sw'erring, use swerrs

```javascript

'use strict';

const SwError = require('swerrs');

const InvalidFileError = SwError.extend({
  name: 'InvalidFileError',
  onPush: function(v) {
    if (v.statusCode === 404) {
      this.fileMissing = true;
    }
  }
});

if (!process.env['XANAX']) {
  let err = new InvalidFileError('OMG!!!');

  // or supply it to the constructor... supports varargs and arrays
  err.push({ msg: `where's my file?!!`, statusCode: 404 });

  process.nextTick(() => {
    console.log(JSON.stringify(err, null, 2));
  });
}

```