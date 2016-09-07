(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":1}],3:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Check the x and y axis to see if two worms crashed with each other.
var _require = require('./Interactions');

var generateWorm = _require.generateWorm;
var fight = _require.fight;
var match = _require.match;


var checkCrash = function checkCrash(w1, w2) {
  return w1.pos.x === w2.pos.x || w1.pos.x === w2.pos.y || w1.pos.y === w2.pos.x;
};

/*
  Find all the worms that have crashed while moving through the map.
  It returns an array of objects with two parameters: { w1, w2} that references
  the two worms that have crashed.
*/

var findCrashes = function findCrashes(worms) {
  var crashes = worms.map(function (w1) {
    var found = worms.filter(function (worm) {
      return worm.uniqueName !== w1.uniqueName;
    }).filter(function (fWorm) {
      return checkCrash(w1, fWorm);
    });
    return found.length > 0 ? { w1: w1, w2: found[0] } : null;
  }).filter(function (worm) {
    return worm != null;
  });
  return crashes;
};

/*
  Responsible for knowing what is going to happen to two worms that have crashed.
  If they are from the same gender, they will fight and one of them will die.
  If they are from different genders, they have a chance to generate a new Worm
*/
var resolveCrashes = function resolveCrashes(crashes, arrayOfWorms) {
  crashes.forEach(function (pair) {
    if (pair.w1.gender === pair.w2.gender) {
      (function () {
        var loser = fight(pair.w1, pair.w2);
        arrayOfWorms = arrayOfWorms.filter(function (worm) {
          return worm.uniqueName !== loser.uniqueName;
        });
      })();
    } else {
      if (match(pair.w1, pair.w2)) {
        var son = generateWorm(pair.w1, pair.w2);
        arrayOfWorms = [].concat(_toConsumableArray(arrayOfWorms), [son]);
      }
    }
  });
  return arrayOfWorms;
};

// Removes duplicated crashes from the array of crashes.
var uniqueCrashes = function uniqueCrashes() {
  var crashes = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

  var uniqCrashes = [];
  var values = {};
  crashes.forEach(function (crash) {
    var w1Name = crash.w1.uniqueName,
        w2Name = crash.w2.uniqueName;
    var isUniq = uniqCrashes.filter(function (value) {
      return value.indexOf(w1Name) != -1 || value.indexOf(w2Name) != -1;
    }).length == 0;
    if (isUniq) uniqCrashes.push(w1Name + '#' + w2Name);
    values[w1Name + '#' + w2Name] = crash;
  });
  return uniqCrashes.map(function (v) {
    return values[v];
  });
};

module.exports = { uniqueCrashes: uniqueCrashes, resolveCrashes: resolveCrashes, findCrashes: findCrashes, checkCrash: checkCrash };

},{"./Interactions":4}],4:[function(require,module,exports){
'use strict';

var Worm = require('../Model/Worm');

/*
  Function that takes two worms and generate a combination of the best assets
  of them.
*/
var generateWorm = function generateWorm(w1, w2) {
  var bestStrength = w1.attr.strength > w2.attr.strength ? w1 : w2;
  var bestCharisma = w1.attr.charisma > w2.attr.charisma ? w1 : w2;
  return Worm(bestStrength, bestCharisma);
};
// Function responsible for check who wins in a fight between two worms of the same gender
var fight = function fight(w1, w2) {
  var w1Value = w1.attr.strength + Math.random() * w1.strength;
  var w2Value = w2.attr.strength + Math.random() * w2.strength;
  return w1Value > w2Value ? w2 : w1;
};
/*
  Function responsible for checking if two worms match with each other. The parameter chosen
  is that, if the difference between their charismas is higher than 50%, they will not match.
*/
var match = function match(w1, w2) {
  var w1Char = w1.attr.charisma,
      w2Char = w2.attr.charisma;
  var percentageDifference = Math.abs(w1Char - w2Char) / ((w1Char + w2Char) / 2) * 100;
  return percentageDifference <= 50;
};

module.exports = { generateWorm: generateWorm, fight: fight, match: match };

},{"../Model/Worm":7}],5:[function(require,module,exports){
"use strict";

module.exports = function () {
  var initialStr = arguments.length <= 0 || arguments[0] === undefined ? 5 : arguments[0];
  var initialChar = arguments.length <= 1 || arguments[1] === undefined ? 5 : arguments[1];

  var BIGGEST_STRENGTH = initialStr;
  var BIGGEST_CHARISMA = initialChar;
  return Object.create({
    getValues: function getValues() {
      return { STR: BIGGEST_STRENGTH, CHA: BIGGEST_CHARISMA };
    },
    setValues: function setValues(STR, CHA) {
      this.BIGGEST_STRENGTH = STR;
      this.BIGGEST_CHARISMA = CHA;
    }
  });
};

},{}],6:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*
  This function will apply the randomly generated orientation on a worm.
  Incrementing or decrementing it's x or y axis on canvas.
*/
var applyNewOrientation = function applyNewOrientation(worm) {
  var orientation = function orientation() {
    return ['up', 'down', 'left', 'right'][parseInt(Math.random() * 100 / 25)];
  };
  var pos = worm.pos;

  switch (orientation()) {
    case 'up':
      return _extends({}, worm, { pos: _extends({}, pos, { y: pos.y + 1, orientation: 'up' }) });
    case 'down':
      return _extends({}, worm, { pos: _extends({}, pos, { y: pos.y - 1, orientation: 'down' }) });
    case 'left':
      return _extends({}, worm, { pos: _extends({}, pos, { x: pos.x - 1, orientation: 'left' }) });
    case 'right':
      return _extends({}, worm, { pos: _extends({}, pos, { x: pos.x + 1, orientation: 'right' }) });
    default:
      return worm;
  }
};

module.exports = applyNewOrientation;

},{}],7:[function(require,module,exports){
'use strict';

/*
  The worm object. You can initialize it with custom strength and charisma like in the generation process.
  But you can also generate a new Worm without initialize the values, and i'm thinking in using this as a form
  of mutation.
*/

var Worm = function Worm() {
  var strength = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  var charisma = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var gender = parseInt(Math.random() * 10) < 5 ? 'MALE' : 'FEMALE';
  var uniqueName = require('uuid').v1();

  var _require$getValues = require('../App/MaximumValues')().getValues();

  var STR = _require$getValues.STR;
  var CHA = _require$getValues.CHA;


  var attr = {
    strength: strength == 0 ? parseInt(Math.random() * STR) + parseInt(STR / 3 * 2) : strength,
    charisma: charisma == 0 ? parseInt(Math.random() * CHA) + parseInt(CHA / 3 * 2) : charisma
  };
  // The position of the worm. It's used to render the object on canvas and to check for colisions
  var pos = {
    x: parseInt(Math.random() * 300),
    y: parseInt(Math.random() * 150),
    orientation: 'left'
  };
  var toString = function toString() {
    return '('.concat(pos.x).concat(', ').concat(pos.y).concat(') UNIQUE: ').concat(uniqueName);
  };

  return { gender: gender, attr: attr, pos: pos, uniqueName: uniqueName, toString: toString };
};

module.exports = Worm;

},{"../App/MaximumValues":5,"uuid":2}],8:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Worm = require('./Model/Worm');
var Orientation = require('./App/Orientation');
var Interactions = require('./App/Interactions');

var _require = require('./App/Crash');

var uniqueCrashes = _require.uniqueCrashes;
var resolveCrashes = _require.resolveCrashes;
var findCrashes = _require.findCrashes;
var checkCrash = _require.checkCrash;


var worms = [].concat(_toConsumableArray(new Array(20))).map(function (value) {
  return Worm();
});
var worms2 = resolveCrashes(uniqueCrashes(findCrashes(worms)), worms);

},{"./App/Crash":3,"./App/Interactions":4,"./App/Orientation":6,"./Model/Worm":7}]},{},[8]);
