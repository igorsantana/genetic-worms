(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":1,"ieee754":4,"isarray":5}],3:[function(require,module,exports){
(function (Buffer){
//  Chance.js 1.0.4
//  http://chancejs.com
//  (c) 2013 Victor Quinn
//  Chance may be freely distributed or modified under the MIT license.

(function () {

    // Constants
    var MAX_INT = 9007199254740992;
    var MIN_INT = -MAX_INT;
    var NUMBERS = '0123456789';
    var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
    var CHARS_UPPER = CHARS_LOWER.toUpperCase();
    var HEX_POOL  = NUMBERS + "abcdef";

    // Cached array helpers
    var slice = Array.prototype.slice;

    // Constructor
    function Chance (seed) {
        if (!(this instanceof Chance)) {
            return seed == null ? new Chance() : new Chance(seed);
        }

        // if user has provided a function, use that as the generator
        if (typeof seed === 'function') {
            this.random = seed;
            return this;
        }

        if (arguments.length) {
            // set a starting value of zero so we can add to it
            this.seed = 0;
        }

        // otherwise, leave this.seed blank so that MT will receive a blank

        for (var i = 0; i < arguments.length; i++) {
            var seedling = 0;
            if (Object.prototype.toString.call(arguments[i]) === '[object String]') {
                for (var j = 0; j < arguments[i].length; j++) {
                    // create a numeric hash for each argument, add to seedling
                    var hash = 0;
                    for (var k = 0; k < arguments[i].length; k++) {
                        hash = arguments[i].charCodeAt(k) + (hash << 6) + (hash << 16) - hash;
                    }
                    seedling += hash;
                }
            } else {
                seedling = arguments[i];
            }
            this.seed += (arguments.length - i) * seedling;
        }

        // If no generator function was provided, use our MT
        this.mt = this.mersenne_twister(this.seed);
        this.bimd5 = this.blueimp_md5();
        this.random = function () {
            return this.mt.random(this.seed);
        };

        return this;
    }

    Chance.prototype.VERSION = "1.0.4";

    // Random helper functions
    function initOptions(options, defaults) {
        options || (options = {});

        if (defaults) {
            for (var i in defaults) {
                if (typeof options[i] === 'undefined') {
                    options[i] = defaults[i];
                }
            }
        }

        return options;
    }

    function testRange(test, errorMessage) {
        if (test) {
            throw new RangeError(errorMessage);
        }
    }

    /**
     * Encode the input string with Base64.
     */
    var base64 = function() {
        throw new Error('No Base64 encoder available.');
    };

    // Select proper Base64 encoder.
    (function determineBase64Encoder() {
        if (typeof btoa === 'function') {
            base64 = btoa;
        } else if (typeof Buffer === 'function') {
            base64 = function(input) {
                return new Buffer(input).toString('base64');
            };
        }
    })();

    // -- Basics --

    /**
     *  Return a random bool, either true or false
     *
     *  @param {Object} [options={ likelihood: 50 }] alter the likelihood of
     *    receiving a true or false value back.
     *  @throws {RangeError} if the likelihood is out of bounds
     *  @returns {Bool} either true or false
     */
    Chance.prototype.bool = function (options) {
        // likelihood of success (true)
        options = initOptions(options, {likelihood : 50});

        // Note, we could get some minor perf optimizations by checking range
        // prior to initializing defaults, but that makes code a bit messier
        // and the check more complicated as we have to check existence of
        // the object then existence of the key before checking constraints.
        // Since the options initialization should be minor computationally,
        // decision made for code cleanliness intentionally. This is mentioned
        // here as it's the first occurrence, will not be mentioned again.
        testRange(
            options.likelihood < 0 || options.likelihood > 100,
            "Chance: Likelihood accepts values from 0 to 100."
        );

        return this.random() * 100 < options.likelihood;
    };

    /**
     *  Return a random character.
     *
     *  @param {Object} [options={}] can specify a character pool, only alpha,
     *    only symbols, and casing (lower or upper)
     *  @returns {String} a single random character
     *  @throws {RangeError} Can only specify alpha or symbols, not both
     */
    Chance.prototype.character = function (options) {
        options = initOptions(options);
        testRange(
            options.alpha && options.symbols,
            "Chance: Cannot specify both alpha and symbols."
        );

        var symbols = "!@#$%^&*()[]",
            letters, pool;

        if (options.casing === 'lower') {
            letters = CHARS_LOWER;
        } else if (options.casing === 'upper') {
            letters = CHARS_UPPER;
        } else {
            letters = CHARS_LOWER + CHARS_UPPER;
        }

        if (options.pool) {
            pool = options.pool;
        } else if (options.alpha) {
            pool = letters;
        } else if (options.symbols) {
            pool = symbols;
        } else {
            pool = letters + NUMBERS + symbols;
        }

        return pool.charAt(this.natural({max: (pool.length - 1)}));
    };

    // Note, wanted to use "float" or "double" but those are both JS reserved words.

    // Note, fixed means N OR LESS digits after the decimal. This because
    // It could be 14.9000 but in JavaScript, when this is cast as a number,
    // the trailing zeroes are dropped. Left to the consumer if trailing zeroes are
    // needed
    /**
     *  Return a random floating point number
     *
     *  @param {Object} [options={}] can specify a fixed precision, min, max
     *  @returns {Number} a single floating point number
     *  @throws {RangeError} Can only specify fixed or precision, not both. Also
     *    min cannot be greater than max
     */
    Chance.prototype.floating = function (options) {
        options = initOptions(options, {fixed : 4});
        testRange(
            options.fixed && options.precision,
            "Chance: Cannot specify both fixed and precision."
        );

        var num;
        var fixed = Math.pow(10, options.fixed);

        var max = MAX_INT / fixed;
        var min = -max;

        testRange(
            options.min && options.fixed && options.min < min,
            "Chance: Min specified is out of range with fixed. Min should be, at least, " + min
        );
        testRange(
            options.max && options.fixed && options.max > max,
            "Chance: Max specified is out of range with fixed. Max should be, at most, " + max
        );

        options = initOptions(options, { min : min, max : max });

        // Todo - Make this work!
        // options.precision = (typeof options.precision !== "undefined") ? options.precision : false;

        num = this.integer({min: options.min * fixed, max: options.max * fixed});
        var num_fixed = (num / fixed).toFixed(options.fixed);

        return parseFloat(num_fixed);
    };

    /**
     *  Return a random integer
     *
     *  NOTE the max and min are INCLUDED in the range. So:
     *  chance.integer({min: 1, max: 3});
     *  would return either 1, 2, or 3.
     *
     *  @param {Object} [options={}] can specify a min and/or max
     *  @returns {Number} a single random integer number
     *  @throws {RangeError} min cannot be greater than max
     */
    Chance.prototype.integer = function (options) {
        // 9007199254740992 (2^53) is the max integer number in JavaScript
        // See: http://vq.io/132sa2j
        options = initOptions(options, {min: MIN_INT, max: MAX_INT});
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return Math.floor(this.random() * (options.max - options.min + 1) + options.min);
    };

    /**
     *  Return a random natural
     *
     *  NOTE the max and min are INCLUDED in the range. So:
     *  chance.natural({min: 1, max: 3});
     *  would return either 1, 2, or 3.
     *
     *  @param {Object} [options={}] can specify a min and/or max
     *  @returns {Number} a single random integer number
     *  @throws {RangeError} min cannot be greater than max
     */
    Chance.prototype.natural = function (options) {
        options = initOptions(options, {min: 0, max: MAX_INT});
        testRange(options.min < 0, "Chance: Min cannot be less than zero.");
        return this.integer(options);
    };

    /**
     *  Return a random string
     *
     *  @param {Object} [options={}] can specify a length
     *  @returns {String} a string of random length
     *  @throws {RangeError} length cannot be less than zero
     */
    Chance.prototype.string = function (options) {
        options = initOptions(options, { length: this.natural({min: 5, max: 20}) });
        testRange(options.length < 0, "Chance: Length cannot be less than zero.");
        var length = options.length,
            text = this.n(this.character, length, options);

        return text.join("");
    };

    // -- End Basics --

    // -- Helpers --

    Chance.prototype.capitalize = function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1);
    };

    Chance.prototype.mixin = function (obj) {
        for (var func_name in obj) {
            Chance.prototype[func_name] = obj[func_name];
        }
        return this;
    };

    /**
     *  Given a function that generates something random and a number of items to generate,
     *    return an array of items where none repeat.
     *
     *  @param {Function} fn the function that generates something random
     *  @param {Number} num number of terms to generate
     *  @param {Object} options any options to pass on to the generator function
     *  @returns {Array} an array of length `num` with every item generated by `fn` and unique
     *
     *  There can be more parameters after these. All additional parameters are provided to the given function
     */
    Chance.prototype.unique = function(fn, num, options) {
        testRange(
            typeof fn !== "function",
            "Chance: The first argument must be a function."
        );

        var comparator = function(arr, val) { return arr.indexOf(val) !== -1; };

        if (options) {
            comparator = options.comparator || comparator;
        }

        var arr = [], count = 0, result, MAX_DUPLICATES = num * 50, params = slice.call(arguments, 2);

        while (arr.length < num) {
            var clonedParams = JSON.parse(JSON.stringify(params));
            result = fn.apply(this, clonedParams);
            if (!comparator(arr, result)) {
                arr.push(result);
                // reset count when unique found
                count = 0;
            }

            if (++count > MAX_DUPLICATES) {
                throw new RangeError("Chance: num is likely too large for sample set");
            }
        }
        return arr;
    };

    /**
     *  Gives an array of n random terms
     *
     *  @param {Function} fn the function that generates something random
     *  @param {Number} n number of terms to generate
     *  @returns {Array} an array of length `n` with items generated by `fn`
     *
     *  There can be more parameters after these. All additional parameters are provided to the given function
     */
    Chance.prototype.n = function(fn, n) {
        testRange(
            typeof fn !== "function",
            "Chance: The first argument must be a function."
        );

        if (typeof n === 'undefined') {
            n = 1;
        }
        var i = n, arr = [], params = slice.call(arguments, 2);

        // Providing a negative count should result in a noop.
        i = Math.max( 0, i );

        for (null; i--; null) {
            arr.push(fn.apply(this, params));
        }

        return arr;
    };

    // H/T to SO for this one: http://vq.io/OtUrZ5
    Chance.prototype.pad = function (number, width, pad) {
        // Default pad to 0 if none provided
        pad = pad || '0';
        // Convert number to a string
        number = number + '';
        return number.length >= width ? number : new Array(width - number.length + 1).join(pad) + number;
    };

    // DEPRECATED on 2015-10-01
    Chance.prototype.pick = function (arr, count) {
        if (arr.length === 0) {
            throw new RangeError("Chance: Cannot pick() from an empty array");
        }
        if (!count || count === 1) {
            return arr[this.natural({max: arr.length - 1})];
        } else {
            return this.shuffle(arr).slice(0, count);
        }
    };

    // Given an array, returns a single random element
    Chance.prototype.pickone = function (arr) {
        if (arr.length === 0) {
          throw new RangeError("Chance: Cannot pickone() from an empty array");
        }
        return arr[this.natural({max: arr.length - 1})];
    };

    // Given an array, returns a random set with 'count' elements
    Chance.prototype.pickset = function (arr, count) {
        if (count === 0) {
            return [];
        }
        if (arr.length === 0) {
            throw new RangeError("Chance: Cannot pickset() from an empty array");
        }
        if (count < 0) {
            throw new RangeError("Chance: count must be positive number");
        }
        if (!count || count === 1) {
            return [ this.pickone(arr) ];
        } else {
            return this.shuffle(arr).slice(0, count);
        }
    };

    Chance.prototype.shuffle = function (arr) {
        var old_array = arr.slice(0),
            new_array = [],
            j = 0,
            length = Number(old_array.length);

        for (var i = 0; i < length; i++) {
            // Pick a random index from the array
            j = this.natural({max: old_array.length - 1});
            // Add it to the new array
            new_array[i] = old_array[j];
            // Remove that element from the original array
            old_array.splice(j, 1);
        }

        return new_array;
    };

    // Returns a single item from an array with relative weighting of odds
    Chance.prototype.weighted = function (arr, weights, trim) {
        if (arr.length !== weights.length) {
            throw new RangeError("Chance: length of array and weights must match");
        }

        // scan weights array and sum valid entries
        var sum = 0;
        var val;
        for (var weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
            val = weights[weightIndex];
            if (val > 0) {
                sum += val;
            }
        }

        if (sum === 0) {
            throw new RangeError("Chance: no valid entries in array weights");
        }

        // select a value within range
        var selected = this.random() * sum;

        // find array entry corresponding to selected value
        var total = 0;
        var lastGoodIdx = -1;
        var chosenIdx;
        for (weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
            val = weights[weightIndex];
            total += val;
            if (val > 0) {
                if (selected <= total) {
                    chosenIdx = weightIndex;
                    break;
                }
                lastGoodIdx = weightIndex;
            }

            // handle any possible rounding error comparison to ensure something is picked
            if (weightIndex === (weights.length - 1)) {
                chosenIdx = lastGoodIdx;
            }
        }

        var chosen = arr[chosenIdx];
        trim = (typeof trim === 'undefined') ? false : trim;
        if (trim) {
            arr.splice(chosenIdx, 1);
            weights.splice(chosenIdx, 1);
        }

        return chosen;
    };

    // -- End Helpers --

    // -- Text --

    Chance.prototype.paragraph = function (options) {
        options = initOptions(options);

        var sentences = options.sentences || this.natural({min: 3, max: 7}),
            sentence_array = this.n(this.sentence, sentences);

        return sentence_array.join(' ');
    };

    // Could get smarter about this than generating random words and
    // chaining them together. Such as: http://vq.io/1a5ceOh
    Chance.prototype.sentence = function (options) {
        options = initOptions(options);

        var words = options.words || this.natural({min: 12, max: 18}),
            punctuation = options.punctuation,
            text, word_array = this.n(this.word, words);

        text = word_array.join(' ');

        // Capitalize first letter of sentence
        text = this.capitalize(text);

        // Make sure punctuation has a usable value
        if (punctuation !== false && !/^[\.\?;!:]$/.test(punctuation)) {
            punctuation = '.';
        }

        // Add punctuation mark
        if (punctuation) {
            text += punctuation;
        }

        return text;
    };

    Chance.prototype.syllable = function (options) {
        options = initOptions(options);

        var length = options.length || this.natural({min: 2, max: 3}),
            consonants = 'bcdfghjklmnprstvwz', // consonants except hard to speak ones
            vowels = 'aeiou', // vowels
            all = consonants + vowels, // all
            text = '',
            chr;

        // I'm sure there's a more elegant way to do this, but this works
        // decently well.
        for (var i = 0; i < length; i++) {
            if (i === 0) {
                // First character can be anything
                chr = this.character({pool: all});
            } else if (consonants.indexOf(chr) === -1) {
                // Last character was a vowel, now we want a consonant
                chr = this.character({pool: consonants});
            } else {
                // Last character was a consonant, now we want a vowel
                chr = this.character({pool: vowels});
            }

            text += chr;
        }

        if (options.capitalize) {
            text = this.capitalize(text);
        }

        return text;
    };

    Chance.prototype.word = function (options) {
        options = initOptions(options);

        testRange(
            options.syllables && options.length,
            "Chance: Cannot specify both syllables AND length."
        );

        var syllables = options.syllables || this.natural({min: 1, max: 3}),
            text = '';

        if (options.length) {
            // Either bound word by length
            do {
                text += this.syllable();
            } while (text.length < options.length);
            text = text.substring(0, options.length);
        } else {
            // Or by number of syllables
            for (var i = 0; i < syllables; i++) {
                text += this.syllable();
            }
        }

        if (options.capitalize) {
            text = this.capitalize(text);
        }

        return text;
    };

    // -- End Text --

    // -- Person --

    Chance.prototype.age = function (options) {
        options = initOptions(options);
        var ageRange;

        switch (options.type) {
            case 'child':
                ageRange = {min: 0, max: 12};
                break;
            case 'teen':
                ageRange = {min: 13, max: 19};
                break;
            case 'adult':
                ageRange = {min: 18, max: 65};
                break;
            case 'senior':
                ageRange = {min: 65, max: 100};
                break;
            case 'all':
                ageRange = {min: 0, max: 100};
                break;
            default:
                ageRange = {min: 18, max: 65};
                break;
        }

        return this.natural(ageRange);
    };

    Chance.prototype.birthday = function (options) {
        var age = this.age(options);
        var currentYear = new Date().getFullYear();

        if (options && options.type) {
            var min = new Date();
            var max = new Date();
            min.setFullYear(currentYear - age - 1);
            max.setFullYear(currentYear - age);

            options = initOptions(options, {
                min: min,
                max: max
            });
        } else {
            options = initOptions(options, {
                year: currentYear - age
            });
        }

        return this.date(options);
    };

    // CPF; ID to identify taxpayers in Brazil
    Chance.prototype.cpf = function (options) {
        options = initOptions(options, {
            formatted: true
        });

        var n = this.n(this.natural, 9, { max: 9 });
        var d1 = n[8]*2+n[7]*3+n[6]*4+n[5]*5+n[4]*6+n[3]*7+n[2]*8+n[1]*9+n[0]*10;
        d1 = 11 - (d1 % 11);
        if (d1>=10) {
            d1 = 0;
        }
        var d2 = d1*2+n[8]*3+n[7]*4+n[6]*5+n[5]*6+n[4]*7+n[3]*8+n[2]*9+n[1]*10+n[0]*11;
        d2 = 11 - (d2 % 11);
        if (d2>=10) {
            d2 = 0;
        }
        var cpf = ''+n[0]+n[1]+n[2]+'.'+n[3]+n[4]+n[5]+'.'+n[6]+n[7]+n[8]+'-'+d1+d2;
        return options.formatted ? cpf : cpf.replace(/\D/g,'');
    };

    // CNPJ: ID to identify companies in Brazil
    Chance.prototype.cnpj = function (options) {
        options = initOptions(options, {
            formatted: true
        });

        var n = this.n(this.natural, 12, { max: 12 });
        var d1 = n[11]*2+n[10]*3+n[9]*4+n[8]*5+n[7]*6+n[6]*7+n[5]*8+n[4]*9+n[3]*2+n[2]*3+n[1]*4+n[0]*5;
        d1 = 11 - (d1 % 11);
        if (d1<2) {
            d1 = 0;
        }
        var d2 = d1*2+n[11]*3+n[10]*4+n[9]*5+n[8]*6+n[7]*7+n[6]*8+n[5]*9+n[4]*2+n[3]*3+n[2]*4+n[1]*5+n[0]*6;
        d2 = 11 - (d2 % 11);
        if (d2<2) {
            d2 = 0;
        }
        var cnpj = ''+n[0]+n[1]+'.'+n[2]+n[3]+n[4]+'.'+n[5]+n[6]+n[7]+'/'+n[8]+n[9]+n[10]+n[11]+'-'+d1+d2;
        return options.formatted ? cnpj : cnpj.replace(/\D/g,'');
    };

    Chance.prototype.first = function (options) {
        options = initOptions(options, {gender: this.gender(), nationality: 'en'});
        return this.pick(this.get("firstNames")[options.gender.toLowerCase()][options.nationality.toLowerCase()]);
    };

    Chance.prototype.gender = function (options) {
        options = initOptions(options, {extraGenders: []});
        return this.pick(['Male', 'Female'].concat(options.extraGenders));
    };

    Chance.prototype.last = function (options) {
        options = initOptions(options, {nationality: 'en'});
        return this.pick(this.get("lastNames")[options.nationality.toLowerCase()]);
    };

    Chance.prototype.israelId=function(){
        var x=this.string({pool: '0123456789',length:8});
        var y=0;
        for (var i=0;i<x.length;i++){
            var thisDigit=  x[i] *  (i/2===parseInt(i/2) ? 1 : 2);
            thisDigit=this.pad(thisDigit,2).toString();
            thisDigit=parseInt(thisDigit[0]) + parseInt(thisDigit[1]);
            y=y+thisDigit;
        }
        x=x+(10-parseInt(y.toString().slice(-1))).toString().slice(-1);
        return x;
    };

    Chance.prototype.mrz = function (options) {
        var checkDigit = function (input) {
            var alpha = "<ABCDEFGHIJKLMNOPQRSTUVWXYXZ".split(''),
                multipliers = [ 7, 3, 1 ],
                runningTotal = 0;

            if (typeof input !== 'string') {
                input = input.toString();
            }

            input.split('').forEach(function(character, idx) {
                var pos = alpha.indexOf(character);

                if(pos !== -1) {
                    character = pos === 0 ? 0 : pos + 9;
                } else {
                    character = parseInt(character, 10);
                }
                character *= multipliers[idx % multipliers.length];
                runningTotal += character;
            });
            return runningTotal % 10;
        };
        var generate = function (opts) {
            var pad = function (length) {
                return new Array(length + 1).join('<');
            };
            var number = [ 'P<',
                           opts.issuer,
                           opts.last.toUpperCase(),
                           '<<',
                           opts.first.toUpperCase(),
                           pad(39 - (opts.last.length + opts.first.length + 2)),
                           opts.passportNumber,
                           checkDigit(opts.passportNumber),
                           opts.nationality,
                           opts.dob,
                           checkDigit(opts.dob),
                           opts.gender,
                           opts.expiry,
                           checkDigit(opts.expiry),
                           pad(14),
                           checkDigit(pad(14)) ].join('');

            return number +
                (checkDigit(number.substr(44, 10) +
                            number.substr(57, 7) +
                            number.substr(65, 7)));
        };

        var that = this;

        options = initOptions(options, {
            first: this.first(),
            last: this.last(),
            passportNumber: this.integer({min: 100000000, max: 999999999}),
            dob: (function () {
                var date = that.birthday({type: 'adult'});
                return [date.getFullYear().toString().substr(2),
                        that.pad(date.getMonth() + 1, 2),
                        that.pad(date.getDate(), 2)].join('');
            }()),
            expiry: (function () {
                var date = new Date();
                return [(date.getFullYear() + 5).toString().substr(2),
                        that.pad(date.getMonth() + 1, 2),
                        that.pad(date.getDate(), 2)].join('');
            }()),
            gender: this.gender() === 'Female' ? 'F': 'M',
            issuer: 'GBR',
            nationality: 'GBR'
        });
        return generate (options);
    };

    Chance.prototype.name = function (options) {
        options = initOptions(options);

        var first = this.first(options),
            last = this.last(options),
            name;

        if (options.middle) {
            name = first + ' ' + this.first(options) + ' ' + last;
        } else if (options.middle_initial) {
            name = first + ' ' + this.character({alpha: true, casing: 'upper'}) + '. ' + last;
        } else {
            name = first + ' ' + last;
        }

        if (options.prefix) {
            name = this.prefix(options) + ' ' + name;
        }

        if (options.suffix) {
            name = name + ' ' + this.suffix(options);
        }

        return name;
    };

    // Return the list of available name prefixes based on supplied gender.
    // @todo introduce internationalization
    Chance.prototype.name_prefixes = function (gender) {
        gender = gender || "all";
        gender = gender.toLowerCase();

        var prefixes = [
            { name: 'Doctor', abbreviation: 'Dr.' }
        ];

        if (gender === "male" || gender === "all") {
            prefixes.push({ name: 'Mister', abbreviation: 'Mr.' });
        }

        if (gender === "female" || gender === "all") {
            prefixes.push({ name: 'Miss', abbreviation: 'Miss' });
            prefixes.push({ name: 'Misses', abbreviation: 'Mrs.' });
        }

        return prefixes;
    };

    // Alias for name_prefix
    Chance.prototype.prefix = function (options) {
        return this.name_prefix(options);
    };

    Chance.prototype.name_prefix = function (options) {
        options = initOptions(options, { gender: "all" });
        return options.full ?
            this.pick(this.name_prefixes(options.gender)).name :
            this.pick(this.name_prefixes(options.gender)).abbreviation;
    };
    //Hungarian ID number
    Chance.prototype.HIDN= function(){
     //Hungarian ID nuber structure: XXXXXXYY (X=number,Y=Capital Latin letter)
      var idn_pool="0123456789";
      var idn_chrs="ABCDEFGHIJKLMNOPQRSTUVWXYXZ";
      var idn="";
        idn+=this.string({pool:idn_pool,length:6});
        idn+=this.string({pool:idn_chrs,length:2});
        return idn;
    };


    Chance.prototype.ssn = function (options) {
        options = initOptions(options, {ssnFour: false, dashes: true});
        var ssn_pool = "1234567890",
            ssn,
            dash = options.dashes ? '-' : '';

        if(!options.ssnFour) {
            ssn = this.string({pool: ssn_pool, length: 3}) + dash +
            this.string({pool: ssn_pool, length: 2}) + dash +
            this.string({pool: ssn_pool, length: 4});
        } else {
            ssn = this.string({pool: ssn_pool, length: 4});
        }
        return ssn;
    };

    // Return the list of available name suffixes
    // @todo introduce internationalization
    Chance.prototype.name_suffixes = function () {
        var suffixes = [
            { name: 'Doctor of Osteopathic Medicine', abbreviation: 'D.O.' },
            { name: 'Doctor of Philosophy', abbreviation: 'Ph.D.' },
            { name: 'Esquire', abbreviation: 'Esq.' },
            { name: 'Junior', abbreviation: 'Jr.' },
            { name: 'Juris Doctor', abbreviation: 'J.D.' },
            { name: 'Master of Arts', abbreviation: 'M.A.' },
            { name: 'Master of Business Administration', abbreviation: 'M.B.A.' },
            { name: 'Master of Science', abbreviation: 'M.S.' },
            { name: 'Medical Doctor', abbreviation: 'M.D.' },
            { name: 'Senior', abbreviation: 'Sr.' },
            { name: 'The Third', abbreviation: 'III' },
            { name: 'The Fourth', abbreviation: 'IV' },
            { name: 'Bachelor of Engineering', abbreviation: 'B.E' },
            { name: 'Bachelor of Technology', abbreviation: 'B.TECH' }
        ];
        return suffixes;
    };

    // Alias for name_suffix
    Chance.prototype.suffix = function (options) {
        return this.name_suffix(options);
    };

    Chance.prototype.name_suffix = function (options) {
        options = initOptions(options);
        return options.full ?
            this.pick(this.name_suffixes()).name :
            this.pick(this.name_suffixes()).abbreviation;
    };

    Chance.prototype.nationalities = function () {
        return this.get("nationalities");
    };

    // Generate random nationality based on json list
    Chance.prototype.nationality = function () {
        var nationality = this.pick(this.nationalities());
        return nationality.name;
    };

    // -- End Person --

    // -- Mobile --
    // Android GCM Registration ID
    Chance.prototype.android_id = function () {
        return "APA91" + this.string({ pool: "0123456789abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_", length: 178 });
    };

    // Apple Push Token
    Chance.prototype.apple_token = function () {
        return this.string({ pool: "abcdef1234567890", length: 64 });
    };

    // Windows Phone 8 ANID2
    Chance.prototype.wp8_anid2 = function () {
        return base64( this.hash( { length : 32 } ) );
    };

    // Windows Phone 7 ANID
    Chance.prototype.wp7_anid = function () {
        return 'A=' + this.guid().replace(/-/g, '').toUpperCase() + '&E=' + this.hash({ length:3 }) + '&W=' + this.integer({ min:0, max:9 });
    };

    // BlackBerry Device PIN
    Chance.prototype.bb_pin = function () {
        return this.hash({ length: 8 });
    };

    // -- End Mobile --

    // -- Web --
    Chance.prototype.avatar = function (options) {
        var url = null;
        var URL_BASE = '//www.gravatar.com/avatar/';
        var PROTOCOLS = {
            http: 'http',
            https: 'https'
        };
        var FILE_TYPES = {
            bmp: 'bmp',
            gif: 'gif',
            jpg: 'jpg',
            png: 'png'
        };
        var FALLBACKS = {
            '404': '404', // Return 404 if not found
            mm: 'mm', // Mystery man
            identicon: 'identicon', // Geometric pattern based on hash
            monsterid: 'monsterid', // A generated monster icon
            wavatar: 'wavatar', // A generated face
            retro: 'retro', // 8-bit icon
            blank: 'blank' // A transparent png
        };
        var RATINGS = {
            g: 'g',
            pg: 'pg',
            r: 'r',
            x: 'x'
        };
        var opts = {
            protocol: null,
            email: null,
            fileExtension: null,
            size: null,
            fallback: null,
            rating: null
        };

        if (!options) {
            // Set to a random email
            opts.email = this.email();
            options = {};
        }
        else if (typeof options === 'string') {
            opts.email = options;
            options = {};
        }
        else if (typeof options !== 'object') {
            return null;
        }
        else if (options.constructor === 'Array') {
            return null;
        }

        opts = initOptions(options, opts);

        if (!opts.email) {
            // Set to a random email
            opts.email = this.email();
        }

        // Safe checking for params
        opts.protocol = PROTOCOLS[opts.protocol] ? opts.protocol + ':' : '';
        opts.size = parseInt(opts.size, 0) ? opts.size : '';
        opts.rating = RATINGS[opts.rating] ? opts.rating : '';
        opts.fallback = FALLBACKS[opts.fallback] ? opts.fallback : '';
        opts.fileExtension = FILE_TYPES[opts.fileExtension] ? opts.fileExtension : '';

        url =
            opts.protocol +
            URL_BASE +
            this.bimd5.md5(opts.email) +
            (opts.fileExtension ? '.' + opts.fileExtension : '') +
            (opts.size || opts.rating || opts.fallback ? '?' : '') +
            (opts.size ? '&s=' + opts.size.toString() : '') +
            (opts.rating ? '&r=' + opts.rating : '') +
            (opts.fallback ? '&d=' + opts.fallback : '')
            ;

        return url;
    };

    /**
     * #Description:
     * ===============================================
     * Generate random color value base on color type:
     * -> hex
     * -> rgb
     * -> rgba
     * -> 0x
     * -> named color
     *
     * #Examples:
     * ===============================================
     * * Geerate random hex color
     * chance.color() => '#79c157' / 'rgb(110,52,164)' / '0x67ae0b' / '#e2e2e2' / '#29CFA7'
     *
     * * Generate Hex based color value
     * chance.color({format: 'hex'})    => '#d67118'
     *
     * * Generate simple rgb value
     * chance.color({format: 'rgb'})    => 'rgb(110,52,164)'
     *
     * * Generate Ox based color value
     * chance.color({format: '0x'})     => '0x67ae0b'
     *
     * * Generate graiscale based value
     * chance.color({grayscale: true})  => '#e2e2e2'
     *
     * * Return valide color name
     * chance.color({format: 'name'})   => 'red'
     *
     * * Make color uppercase
     * chance.color({casing: 'upper'})  => '#29CFA7'
     *
     * @param  [object] options
     * @return [string] color value
     */
    Chance.prototype.color = function (options) {

        function gray(value, delimiter) {
            return [value, value, value].join(delimiter || '');
        }

        function rgb(hasAlpha) {

            var rgbValue    = (hasAlpha)    ? 'rgba' : 'rgb';
            var alphaChanal = (hasAlpha)    ? (',' + this.floating({min:0, max:1})) : "";
            var colorValue  = (isGrayscale) ? (gray(this.natural({max: 255}), ',')) : (this.natural({max: 255}) + ',' + this.natural({max: 255}) + ',' + this.natural({max: 255}));

            return rgbValue + '(' + colorValue + alphaChanal + ')';
        }

        function hex(start, end, withHash) {

            var simbol = (withHash) ? "#" : "";
            var expression  = (isGrayscale ? gray(this.hash({length: start})) : this.hash({length: end}));
            return simbol + expression;
        }

        options = initOptions(options, {
            format: this.pick(['hex', 'shorthex', 'rgb', 'rgba', '0x', 'name']),
            grayscale: false,
            casing: 'lower'
        });

        var isGrayscale = options.grayscale;
        var colorValue;

        if (options.format === 'hex') {
            colorValue =  hex.call(this, 2, 6, true);
        }
        else if (options.format === 'shorthex') {
            colorValue = hex.call(this, 1, 3, true);
        }
        else if (options.format === 'rgb') {
            colorValue = rgb.call(this, false);
        }
        else if (options.format === 'rgba') {
            colorValue = rgb.call(this, true);
        }
        else if (options.format === '0x') {
            colorValue = '0x' + hex.call(this, 2, 6);
        }
        else if(options.format === 'name') {
            return this.pick(this.get("colorNames"));
        }
        else {
            throw new RangeError('Invalid format provided. Please provide one of "hex", "shorthex", "rgb", "rgba", "0x" or "name".');
        }

        if (options.casing === 'upper' ) {
            colorValue = colorValue.toUpperCase();
        }

        return colorValue;
    };

    Chance.prototype.domain = function (options) {
        options = initOptions(options);
        return this.word() + '.' + (options.tld || this.tld());
    };

    Chance.prototype.email = function (options) {
        options = initOptions(options);
        return this.word({length: options.length}) + '@' + (options.domain || this.domain());
    };

    Chance.prototype.fbid = function () {
        return parseInt('10000' + this.natural({max: 100000000000}), 10);
    };

    Chance.prototype.google_analytics = function () {
        var account = this.pad(this.natural({max: 999999}), 6);
        var property = this.pad(this.natural({max: 99}), 2);

        return 'UA-' + account + '-' + property;
    };

    Chance.prototype.hashtag = function () {
        return '#' + this.word();
    };

    Chance.prototype.ip = function () {
        // Todo: This could return some reserved IPs. See http://vq.io/137dgYy
        // this should probably be updated to account for that rare as it may be
        return this.natural({min: 1, max: 254}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({min: 1, max: 254});
    };

    Chance.prototype.ipv6 = function () {
        var ip_addr = this.n(this.hash, 8, {length: 4});

        return ip_addr.join(":");
    };

    Chance.prototype.klout = function () {
        return this.natural({min: 1, max: 99});
    };

    Chance.prototype.semver = function (options) {
        options = initOptions(options, { include_prerelease: true });

        var range = this.pickone(["^", "~", "<", ">", "<=", ">=", "="]);
        if (options.range) {
            range = options.range;
        }

        var prerelease = "";
        if (options.include_prerelease) {
            prerelease = this.weighted(["", "-dev", "-beta", "-alpha"], [50, 10, 5, 1]);
        }
        return range + this.rpg('3d10').join('.') + prerelease;
    };

    Chance.prototype.tlds = function () {
        return ['com', 'org', 'edu', 'gov', 'co.uk', 'net', 'io', 'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'an', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tp', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'];
    };

    Chance.prototype.tld = function () {
        return this.pick(this.tlds());
    };

    Chance.prototype.twitter = function () {
        return '@' + this.word();
    };

    Chance.prototype.url = function (options) {
        options = initOptions(options, { protocol: "http", domain: this.domain(options), domain_prefix: "", path: this.word(), extensions: []});

        var extension = options.extensions.length > 0 ? "." + this.pick(options.extensions) : "";
        var domain = options.domain_prefix ? options.domain_prefix + "." + options.domain : options.domain;

        return options.protocol + "://" + domain + "/" + options.path + extension;
    };

    // -- End Web --

    // -- Location --

    Chance.prototype.address = function (options) {
        options = initOptions(options);
        return this.natural({min: 5, max: 2000}) + ' ' + this.street(options);
    };

    Chance.prototype.altitude = function (options) {
        options = initOptions(options, {fixed: 5, min: 0, max: 8848});
        return this.floating({
            min: options.min,
            max: options.max,
            fixed: options.fixed
        });
    };

    Chance.prototype.areacode = function (options) {
        options = initOptions(options, {parens : true});
        // Don't want area codes to start with 1, or have a 9 as the second digit
        var areacode = this.natural({min: 2, max: 9}).toString() +
                this.natural({min: 0, max: 8}).toString() +
                this.natural({min: 0, max: 9}).toString();

        return options.parens ? '(' + areacode + ')' : areacode;
    };

    Chance.prototype.city = function () {
        return this.capitalize(this.word({syllables: 3}));
    };

    Chance.prototype.coordinates = function (options) {
        return this.latitude(options) + ', ' + this.longitude(options);
    };

    Chance.prototype.countries = function () {
        return this.get("countries");
    };

    Chance.prototype.country = function (options) {
        options = initOptions(options);
        var country = this.pick(this.countries());
        return options.full ? country.name : country.abbreviation;
    };

    Chance.prototype.depth = function (options) {
        options = initOptions(options, {fixed: 5, min: -10994, max: 0});
        return this.floating({
            min: options.min,
            max: options.max,
            fixed: options.fixed
        });
    };

    Chance.prototype.geohash = function (options) {
        options = initOptions(options, { length: 7 });
        return this.string({ length: options.length, pool: '0123456789bcdefghjkmnpqrstuvwxyz' });
    };

    Chance.prototype.geojson = function (options) {
        return this.latitude(options) + ', ' + this.longitude(options) + ', ' + this.altitude(options);
    };

    Chance.prototype.latitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -90, max: 90});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.longitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -180, max: 180});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.phone = function (options) {
        var self = this,
            numPick,
            ukNum = function (parts) {
                var section = [];
                //fills the section part of the phone number with random numbers.
                parts.sections.forEach(function(n) {
                    section.push(self.string({ pool: '0123456789', length: n}));
                });
                return parts.area + section.join(' ');
            };
        options = initOptions(options, {
            formatted: true,
            country: 'us',
            mobile: false
        });
        if (!options.formatted) {
            options.parens = false;
        }
        var phone;
        switch (options.country) {
            case 'fr':
                if (!options.mobile) {
                    numPick = this.pick([
                        // Valid zone and département codes.
                        '01' + this.pick(['30', '34', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '53', '55', '56', '58', '60', '64', '69', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83']) + self.string({ pool: '0123456789', length: 6}),
                        '02' + this.pick(['14', '18', '22', '23', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '40', '41', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '56', '57', '61', '62', '69', '72', '76', '77', '78', '85', '90', '96', '97', '98', '99']) + self.string({ pool: '0123456789', length: 6}),
                        '03' + this.pick(['10', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '39', '44', '45', '51', '52', '54', '55', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90']) + self.string({ pool: '0123456789', length: 6}),
                        '04' + this.pick(['11', '13', '15', '20', '22', '26', '27', '30', '32', '34', '37', '42', '43', '44', '50', '56', '57', '63', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '97', '98']) + self.string({ pool: '0123456789', length: 6}),
                        '05' + this.pick(['08', '16', '17', '19', '24', '31', '32', '33', '34', '35', '40', '45', '46', '47', '49', '53', '55', '56', '57', '58', '59', '61', '62', '63', '64', '65', '67', '79', '81', '82', '86', '87', '90', '94']) + self.string({ pool: '0123456789', length: 6}),
                        '09' + self.string({ pool: '0123456789', length: 8}),
                    ]);
                    phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
                } else {
                    numPick = this.pick(['06', '07']) + self.string({ pool: '0123456789', length: 8});
                    phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
                }
                break;
            case 'uk':
                if (!options.mobile) {
                    numPick = this.pick([
                        //valid area codes of major cities/counties followed by random numbers in required format.
                        { area: '01' + this.character({ pool: '234569' }) + '1 ', sections: [3,4] },
                        { area: '020 ' + this.character({ pool: '378' }), sections: [3,4] },
                        { area: '023 ' + this.character({ pool: '89' }), sections: [3,4] },
                        { area: '024 7', sections: [3,4] },
                        { area: '028 ' + this.pick(['25','28','37','71','82','90','92','95']), sections: [2,4] },
                        { area: '012' + this.pick(['04','08','54','76','97','98']) + ' ', sections: [6] },
                        { area: '013' + this.pick(['63','64','84','86']) + ' ', sections: [6] },
                        { area: '014' + this.pick(['04','20','60','61','80','88']) + ' ', sections: [6] },
                        { area: '015' + this.pick(['24','27','62','66']) + ' ', sections: [6] },
                        { area: '016' + this.pick(['06','29','35','47','59','95']) + ' ', sections: [6] },
                        { area: '017' + this.pick(['26','44','50','68']) + ' ', sections: [6] },
                        { area: '018' + this.pick(['27','37','84','97']) + ' ', sections: [6] },
                        { area: '019' + this.pick(['00','05','35','46','49','63','95']) + ' ', sections: [6] }
                    ]);
                    phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '', 'g');
                } else {
                    numPick = this.pick([
                        { area: '07' + this.pick(['4','5','7','8','9']), sections: [2,6] },
                        { area: '07624 ', sections: [6] }
                    ]);
                    phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '');
                }
                break;
            case 'us':
                var areacode = this.areacode(options).toString();
                var exchange = this.natural({ min: 2, max: 9 }).toString() +
                    this.natural({ min: 0, max: 9 }).toString() +
                    this.natural({ min: 0, max: 9 }).toString();
                var subscriber = this.natural({ min: 1000, max: 9999 }).toString(); // this could be random [0-9]{4}
                phone = options.formatted ? areacode + ' ' + exchange + '-' + subscriber : areacode + exchange + subscriber;
        }
        return phone;
    };

    Chance.prototype.postal = function () {
        // Postal District
        var pd = this.character({pool: "XVTSRPNKLMHJGECBA"});
        // Forward Sortation Area (FSA)
        var fsa = pd + this.natural({max: 9}) + this.character({alpha: true, casing: "upper"});
        // Local Delivery Unut (LDU)
        var ldu = this.natural({max: 9}) + this.character({alpha: true, casing: "upper"}) + this.natural({max: 9});

        return fsa + " " + ldu;
    };

    Chance.prototype.counties = function (options) {
        options = initOptions(options, { country: 'uk' });
        return this.get("counties")[options.country.toLowerCase()];
    };

    Chance.prototype.county = function (options) {
        return this.pick(this.counties(options)).name;
    };

    Chance.prototype.provinces = function (options) {
        options = initOptions(options, { country: 'ca' });
        return this.get("provinces")[options.country.toLowerCase()];
    };

    Chance.prototype.province = function (options) {
        return (options && options.full) ?
            this.pick(this.provinces(options)).name :
            this.pick(this.provinces(options)).abbreviation;
    };

    Chance.prototype.state = function (options) {
        return (options && options.full) ?
            this.pick(this.states(options)).name :
            this.pick(this.states(options)).abbreviation;
    };

    Chance.prototype.states = function (options) {
        options = initOptions(options, { country: 'us', us_states_and_dc: true } );

        var states;

        switch (options.country.toLowerCase()) {
            case 'us':
                var us_states_and_dc = this.get("us_states_and_dc"),
                    territories = this.get("territories"),
                    armed_forces = this.get("armed_forces");

                states = [];

                if (options.us_states_and_dc) {
                    states = states.concat(us_states_and_dc);
                }
                if (options.territories) {
                    states = states.concat(territories);
                }
                if (options.armed_forces) {
                    states = states.concat(armed_forces);
                }
                break;
            case 'it':
                states = this.get("country_regions")[options.country.toLowerCase()];
                break;
            case 'uk':
                states = this.get("counties")[options.country.toLowerCase()];
                break;
        }

        return states;
    };

    Chance.prototype.street = function (options) {
        options = initOptions(options, { country: 'us', syllables: 2 });
        var     street;

        switch (options.country.toLowerCase()) {
            case 'us':
                street = this.word({ syllables: options.syllables });
                street = this.capitalize(street);
                street += ' ';
                street += options.short_suffix ?
                    this.street_suffix(options).abbreviation :
                    this.street_suffix(options).name;
                break;
            case 'it':
                street = this.word({ syllables: options.syllables });
                street = this.capitalize(street);
                street = (options.short_suffix ?
                    this.street_suffix(options).abbreviation :
                    this.street_suffix(options).name) + " " + street;
                break;
        }
        return street;
    };

    Chance.prototype.street_suffix = function (options) {
        options = initOptions(options, { country: 'us' });
        return this.pick(this.street_suffixes(options));
    };

    Chance.prototype.street_suffixes = function (options) {
        options = initOptions(options, { country: 'us' });
        // These are the most common suffixes.
        return this.get("street_suffixes")[options.country.toLowerCase()];
    };

    // Note: only returning US zip codes, internationalization will be a whole
    // other beast to tackle at some point.
    Chance.prototype.zip = function (options) {
        var zip = this.n(this.natural, 5, {max: 9});

        if (options && options.plusfour === true) {
            zip.push('-');
            zip = zip.concat(this.n(this.natural, 4, {max: 9}));
        }

        return zip.join("");
    };

    // -- End Location --

    // -- Time

    Chance.prototype.ampm = function () {
        return this.bool() ? 'am' : 'pm';
    };

    Chance.prototype.date = function (options) {
        var date_string, date;

        // If interval is specified we ignore preset
        if(options && (options.min || options.max)) {
            options = initOptions(options, {
                american: true,
                string: false
            });
            var min = typeof options.min !== "undefined" ? options.min.getTime() : 1;
            // 100,000,000 days measured relative to midnight at the beginning of 01 January, 1970 UTC. http://es5.github.io/#x15.9.1.1
            var max = typeof options.max !== "undefined" ? options.max.getTime() : 8640000000000000;

            date = new Date(this.integer({min: min, max: max}));
        } else {
            var m = this.month({raw: true});
            var daysInMonth = m.days;

            if(options && options.month) {
                // Mod 12 to allow months outside range of 0-11 (not encouraged, but also not prevented).
                daysInMonth = this.get('months')[((options.month % 12) + 12) % 12].days;
            }

            options = initOptions(options, {
                year: parseInt(this.year(), 10),
                // Necessary to subtract 1 because Date() 0-indexes month but not day or year
                // for some reason.
                month: m.numeric - 1,
                day: this.natural({min: 1, max: daysInMonth}),
                hour: this.hour({twentyfour: true}),
                minute: this.minute(),
                second: this.second(),
                millisecond: this.millisecond(),
                american: true,
                string: false
            });

            date = new Date(options.year, options.month, options.day, options.hour, options.minute, options.second, options.millisecond);
        }

        if (options.american) {
            // Adding 1 to the month is necessary because Date() 0-indexes
            // months but not day for some odd reason.
            date_string = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        } else {
            date_string = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        }

        return options.string ? date_string : date;
    };

    Chance.prototype.hammertime = function (options) {
        return this.date(options).getTime();
    };

    Chance.prototype.hour = function (options) {
        options = initOptions(options, {
            min: options && options.twentyfour ? 0 : 1,
            max: options && options.twentyfour ? 23 : 12
        });

        testRange(options.min < 0, "Chance: Min cannot be less than 0.");
        testRange(options.twentyfour && options.max > 23, "Chance: Max cannot be greater than 23 for twentyfour option.");
        testRange(!options.twentyfour && options.max > 12, "Chance: Max cannot be greater than 12.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return this.natural({min: options.min, max: options.max});
    };

    Chance.prototype.millisecond = function () {
        return this.natural({max: 999});
    };

    Chance.prototype.minute = Chance.prototype.second = function (options) {
        options = initOptions(options, {min: 0, max: 59});

        testRange(options.min < 0, "Chance: Min cannot be less than 0.");
        testRange(options.max > 59, "Chance: Max cannot be greater than 59.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return this.natural({min: options.min, max: options.max});
    };

    Chance.prototype.month = function (options) {
        options = initOptions(options, {min: 1, max: 12});

        testRange(options.min < 1, "Chance: Min cannot be less than 1.");
        testRange(options.max > 12, "Chance: Max cannot be greater than 12.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        var month = this.pick(this.months().slice(options.min - 1, options.max));
        return options.raw ? month : month.name;
    };

    Chance.prototype.months = function () {
        return this.get("months");
    };

    Chance.prototype.second = function () {
        return this.natural({max: 59});
    };

    Chance.prototype.timestamp = function () {
        return this.natural({min: 1, max: parseInt(new Date().getTime() / 1000, 10)});
    };

    Chance.prototype.weekday = function (options) {
        options = initOptions(options, {weekday_only: false});
        var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        if (!options.weekday_only) {
            weekdays.push("Saturday");
            weekdays.push("Sunday");
        }
        return this.pickone(weekdays);
    };

    Chance.prototype.year = function (options) {
        // Default to current year as min if none specified
        options = initOptions(options, {min: new Date().getFullYear()});

        // Default to one century after current year as max if none specified
        options.max = (typeof options.max !== "undefined") ? options.max : options.min + 100;

        return this.natural(options).toString();
    };

    // -- End Time

    // -- Finance --

    Chance.prototype.cc = function (options) {
        options = initOptions(options);

        var type, number, to_generate;

        type = (options.type) ?
                    this.cc_type({ name: options.type, raw: true }) :
                    this.cc_type({ raw: true });

        number = type.prefix.split("");
        to_generate = type.length - type.prefix.length - 1;

        // Generates n - 1 digits
        number = number.concat(this.n(this.integer, to_generate, {min: 0, max: 9}));

        // Generates the last digit according to Luhn algorithm
        number.push(this.luhn_calculate(number.join("")));

        return number.join("");
    };

    Chance.prototype.cc_types = function () {
        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        return this.get("cc_types");
    };

    Chance.prototype.cc_type = function (options) {
        options = initOptions(options);
        var types = this.cc_types(),
            type = null;

        if (options.name) {
            for (var i = 0; i < types.length; i++) {
                // Accept either name or short_name to specify card type
                if (types[i].name === options.name || types[i].short_name === options.name) {
                    type = types[i];
                    break;
                }
            }
            if (type === null) {
                throw new RangeError("Credit card type '" + options.name + "'' is not supported");
            }
        } else {
            type = this.pick(types);
        }

        return options.raw ? type : type.name;
    };

    //return all world currency by ISO 4217
    Chance.prototype.currency_types = function () {
        return this.get("currency_types");
    };

    //return random world currency by ISO 4217
    Chance.prototype.currency = function () {
        return this.pick(this.currency_types());
    };

    //return all timezones availabel
    Chance.prototype.timezones = function () {
        return this.get("timezones");
    };

    //return random timezone
    Chance.prototype.timezone = function () {
        return this.pick(this.timezones());
    };

    //Return random correct currency exchange pair (e.g. EUR/USD) or array of currency code
    Chance.prototype.currency_pair = function (returnAsString) {
        var currencies = this.unique(this.currency, 2, {
            comparator: function(arr, val) {

                return arr.reduce(function(acc, item) {
                    // If a match has been found, short circuit check and just return
                    return acc || (item.code === val.code);
                }, false);
            }
        });

        if (returnAsString) {
            return currencies[0].code + '/' + currencies[1].code;
        } else {
            return currencies;
        }
    };

    Chance.prototype.dollar = function (options) {
        // By default, a somewhat more sane max for dollar than all available numbers
        options = initOptions(options, {max : 10000, min : 0});

        var dollar = this.floating({min: options.min, max: options.max, fixed: 2}).toString(),
            cents = dollar.split('.')[1];

        if (cents === undefined) {
            dollar += '.00';
        } else if (cents.length < 2) {
            dollar = dollar + '0';
        }

        if (dollar < 0) {
            return '-$' + dollar.replace('-', '');
        } else {
            return '$' + dollar;
        }
    };

    Chance.prototype.euro = function (options) {
        return Number(this.dollar(options).replace("$", "")).toLocaleString() + "€";
    };

    Chance.prototype.exp = function (options) {
        options = initOptions(options);
        var exp = {};

        exp.year = this.exp_year();

        // If the year is this year, need to ensure month is greater than the
        // current month or this expiration will not be valid
        if (exp.year === (new Date().getFullYear()).toString()) {
            exp.month = this.exp_month({future: true});
        } else {
            exp.month = this.exp_month();
        }

        return options.raw ? exp : exp.month + '/' + exp.year;
    };

    Chance.prototype.exp_month = function (options) {
        options = initOptions(options);
        var month, month_int,
            // Date object months are 0 indexed
            curMonth = new Date().getMonth() + 1;

        if (options.future && (curMonth !== 12)) {
            do {
                month = this.month({raw: true}).numeric;
                month_int = parseInt(month, 10);
            } while (month_int <= curMonth);
        } else {
            month = this.month({raw: true}).numeric;
        }

        return month;
    };

    Chance.prototype.exp_year = function () {
        var curMonth = new Date().getMonth() + 1,
            curYear = new Date().getFullYear();

        return this.year({min: ((curMonth === 12) ? (curYear + 1) : curYear), max: (curYear + 10)});
    };

    Chance.prototype.vat = function (options) {
        options = initOptions(options, { country: 'it' });
        switch (options.country.toLowerCase()) {
            case 'it':
                return this.it_vat();
        }
    };

    // -- End Finance

    // -- Regional

    Chance.prototype.it_vat = function () {
        var it_vat = this.natural({min: 1, max: 1800000});

        it_vat = this.pad(it_vat, 7) + this.pad(this.pick(this.provinces({ country: 'it' })).code, 3);
        return it_vat + this.luhn_calculate(it_vat);
    };

    /*
     * this generator is written following the official algorithm
     * all data can be passed explicitely or randomized by calling chance.cf() without options
     * the code does not check that the input data is valid (it goes beyond the scope of the generator)
     *
     * @param  [Object] options = { first: first name,
     *                              last: last name,
     *                              gender: female|male,
                                    birthday: JavaScript date object,
                                    city: string(4), 1 letter + 3 numbers
                                   }
     * @return [string] codice fiscale
     *
    */
    Chance.prototype.cf = function (options) {
        options = options || {};
        var gender = !!options.gender ? options.gender : this.gender(),
            first = !!options.first ? options.first : this.first( { gender: gender, nationality: 'it'} ),
            last = !!options.last ? options.last : this.last( { nationality: 'it'} ),
            birthday = !!options.birthday ? options.birthday : this.birthday(),
            city = !!options.city ? options.city : this.pickone(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'Z']) + this.pad(this.natural({max:999}), 3),
            cf = [],
            name_generator = function(name, isLast) {
                var temp,
                    return_value = [];

                if (name.length < 3) {
                    return_value = name.split("").concat("XXX".split("")).splice(0,3);
                }
                else {
                    temp = name.toUpperCase().split('').map(function(c){
                        return ("BCDFGHJKLMNPRSTVWZ".indexOf(c) !== -1) ? c : undefined;
                    }).join('');
                    if (temp.length > 3) {
                        if (isLast) {
                            temp = temp.substr(0,3);
                        } else {
                            temp = temp[0] + temp.substr(2,2);
                        }
                    }
                    if (temp.length < 3) {
                        return_value = temp;
                        temp = name.toUpperCase().split('').map(function(c){
                            return ("AEIOU".indexOf(c) !== -1) ? c : undefined;
                        }).join('').substr(0, 3 - return_value.length);
                    }
                    return_value = return_value + temp;
                }

                return return_value;
            },
            date_generator = function(birthday, gender, that) {
                var lettermonths = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];

                return  birthday.getFullYear().toString().substr(2) +
                        lettermonths[birthday.getMonth()] +
                        that.pad(birthday.getDate() + ((gender.toLowerCase() === "female") ? 40 : 0), 2);
            },
            checkdigit_generator = function(cf) {
                var range1 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                    range2 = "ABCDEFGHIJABCDEFGHIJKLMNOPQRSTUVWXYZ",
                    evens  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                    odds   = "BAKPLCQDREVOSFTGUHMINJWZYX",
                    digit  = 0;


                for(var i = 0; i < 15; i++) {
                    if (i % 2 !== 0) {
                        digit += evens.indexOf(range2[range1.indexOf(cf[i])]);
                    }
                    else {
                        digit +=  odds.indexOf(range2[range1.indexOf(cf[i])]);
                    }
                }
                return evens[digit % 26];
            };

        cf = cf.concat(name_generator(last, true), name_generator(first), date_generator(birthday, gender, this), city.toUpperCase().split("")).join("");
        cf += checkdigit_generator(cf.toUpperCase(), this);

        return cf.toUpperCase();
    };

    Chance.prototype.pl_pesel = function () {
        var number = this.natural({min: 1, max: 9999999999});
        var arr = this.pad(number, 10).split('');
        for (var i = 0; i < arr.length; i++) {
            arr[i] = parseInt(arr[i]);
        }

        var controlNumber = (1 * arr[0] + 3 * arr[1] + 7 * arr[2] + 9 * arr[3] + 1 * arr[4] + 3 * arr[5] + 7 * arr[6] + 9 * arr[7] + 1 * arr[8] + 3 * arr[9]) % 10;
        if(controlNumber !== 0) {
            controlNumber = 10 - controlNumber;
        }

        return arr.join('') + controlNumber;
    };

    Chance.prototype.pl_nip = function () {
        var number = this.natural({min: 1, max: 999999999});
        var arr = this.pad(number, 9).split('');
        for (var i = 0; i < arr.length; i++) {
            arr[i] = parseInt(arr[i]);
        }

        var controlNumber = (6 * arr[0] + 5 * arr[1] + 7 * arr[2] + 2 * arr[3] + 3 * arr[4] + 4 * arr[5] + 5 * arr[6] + 6 * arr[7] + 7 * arr[8]) % 11;
        if(controlNumber === 10) {
            return this.pl_nip();
        }

        return arr.join('') + controlNumber;
    };

    Chance.prototype.pl_regon = function () {
        var number = this.natural({min: 1, max: 99999999});
        var arr = this.pad(number, 8).split('');
        for (var i = 0; i < arr.length; i++) {
            arr[i] = parseInt(arr[i]);
        }

        var controlNumber = (8 * arr[0] + 9 * arr[1] + 2 * arr[2] + 3 * arr[3] + 4 * arr[4] + 5 * arr[5] + 6 * arr[6] + 7 * arr[7]) % 11;
        if(controlNumber === 10) {
            controlNumber = 0;
        }

        return arr.join('') + controlNumber;
    };

    // -- End Regional

    // -- Miscellaneous --

    // Dice - For all the board game geeks out there, myself included ;)
    function diceFn (range) {
        return function () {
            return this.natural(range);
        };
    }
    Chance.prototype.d4 = diceFn({min: 1, max: 4});
    Chance.prototype.d6 = diceFn({min: 1, max: 6});
    Chance.prototype.d8 = diceFn({min: 1, max: 8});
    Chance.prototype.d10 = diceFn({min: 1, max: 10});
    Chance.prototype.d12 = diceFn({min: 1, max: 12});
    Chance.prototype.d20 = diceFn({min: 1, max: 20});
    Chance.prototype.d30 = diceFn({min: 1, max: 30});
    Chance.prototype.d100 = diceFn({min: 1, max: 100});

    Chance.prototype.rpg = function (thrown, options) {
        options = initOptions(options);
        if (!thrown) {
            throw new RangeError("A type of die roll must be included");
        } else {
            var bits = thrown.toLowerCase().split("d"),
                rolls = [];

            if (bits.length !== 2 || !parseInt(bits[0], 10) || !parseInt(bits[1], 10)) {
                throw new Error("Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
            }
            for (var i = bits[0]; i > 0; i--) {
                rolls[i - 1] = this.natural({min: 1, max: bits[1]});
            }
            return (typeof options.sum !== 'undefined' && options.sum) ? rolls.reduce(function (p, c) { return p + c; }) : rolls;
        }
    };

    // Guid
    Chance.prototype.guid = function (options) {
        options = initOptions(options, { version: 5 });

        var guid_pool = "abcdef1234567890",
            variant_pool = "ab89",
            guid = this.string({ pool: guid_pool, length: 8 }) + '-' +
                   this.string({ pool: guid_pool, length: 4 }) + '-' +
                   // The Version
                   options.version +
                   this.string({ pool: guid_pool, length: 3 }) + '-' +
                   // The Variant
                   this.string({ pool: variant_pool, length: 1 }) +
                   this.string({ pool: guid_pool, length: 3 }) + '-' +
                   this.string({ pool: guid_pool, length: 12 });
        return guid;
    };

    // Hash
    Chance.prototype.hash = function (options) {
        options = initOptions(options, {length : 40, casing: 'lower'});
        var pool = options.casing === 'upper' ? HEX_POOL.toUpperCase() : HEX_POOL;
        return this.string({pool: pool, length: options.length});
    };

    Chance.prototype.luhn_check = function (num) {
        var str = num.toString();
        var checkDigit = +str.substring(str.length - 1);
        return checkDigit === this.luhn_calculate(+str.substring(0, str.length - 1));
    };

    Chance.prototype.luhn_calculate = function (num) {
        var digits = num.toString().split("").reverse();
        var sum = 0;
        var digit;

        for (var i = 0, l = digits.length; l > i; ++i) {
            digit = +digits[i];
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return (sum * 9) % 10;
    };

    // MD5 Hash
    Chance.prototype.md5 = function(options) {
        var opts = { str: '', key: null, raw: false };

        if (!options) {
            opts.str = this.string();
            options = {};
        }
        else if (typeof options === 'string') {
            opts.str = options;
            options = {};
        }
        else if (typeof options !== 'object') {
            return null;
        }
        else if(options.constructor === 'Array') {
            return null;
        }

        opts = initOptions(options, opts);

        if(!opts.str){
            throw new Error('A parameter is required to return an md5 hash.');
        }

        return this.bimd5.md5(opts.str, opts.key, opts.raw);
    };

    /**
     * #Description:
     * =====================================================
     * Generate random file name with extention
     *
     * The argument provide extention type
     * -> raster
     * -> vector
     * -> 3d
     * -> document
     *
     * If noting is provided the function return random file name with random
     * extention type of any kind
     *
     * The user can validate the file name length range
     * If noting provided the generated file name is radom
     *
     * #Extention Pool :
     * * Currently the supported extentions are
     *  -> some of the most popular raster image extentions
     *  -> some of the most popular vector image extentions
     *  -> some of the most popular 3d image extentions
     *  -> some of the most popular document extentions
     *
     * #Examples :
     * =====================================================
     *
     * Return random file name with random extention. The file extention
     * is provided by a predifined collection of extentions. More abouth the extention
     * pool can be fond in #Extention Pool section
     *
     * chance.file()
     * => dsfsdhjf.xml
     *
     * In order to generate a file name with sspecific length, specify the
     * length property and integer value. The extention is going to be random
     *
     * chance.file({length : 10})
     * => asrtineqos.pdf
     *
     * In order to geerate file with extention form some of the predifined groups
     * of the extention pool just specify the extenton pool category in fileType property
     *
     * chance.file({fileType : 'raster'})
     * => dshgssds.psd
     *
     * You can provide specific extention for your files
     * chance.file({extention : 'html'})
     * => djfsd.html
     *
     * Or you could pass custom collection of extentons bt array or by object
     * chance.file({extentions : [...]})
     * => dhgsdsd.psd
     *
     * chance.file({extentions : { key : [...], key : [...]}})
     * => djsfksdjsd.xml
     *
     * @param  [collection] options
     * @return [string]
     *
     */
    Chance.prototype.file = function(options) {

        var fileOptions = options || {};
        var poolCollectionKey = "fileExtension";
        var typeRange   = Object.keys(this.get("fileExtension"));//['raster', 'vector', '3d', 'document'];
        var fileName;
        var fileExtention;

        // Generate random file name
        fileName = this.word({length : fileOptions.length});

        // Generate file by specific extention provided by the user
        if(fileOptions.extention) {

            fileExtention = fileOptions.extention;
            return (fileName + '.' + fileExtention);
        }

        // Generate file by specific axtention collection
        if(fileOptions.extentions) {

            if(Array.isArray(fileOptions.extentions)) {

                fileExtention = this.pickone(fileOptions.extentions);
                return (fileName + '.' + fileExtention);
            }
            else if(fileOptions.extentions.constructor === Object) {

                var extentionObjectCollection = fileOptions.extentions;
                var keys = Object.keys(extentionObjectCollection);

                fileExtention = this.pickone(extentionObjectCollection[this.pickone(keys)]);
                return (fileName + '.' + fileExtention);
            }

            throw new Error("Expect collection of type Array or Object to be passed as an argument ");
        }

        // Generate file extention based on specific file type
        if(fileOptions.fileType) {

            var fileType = fileOptions.fileType;
            if(typeRange.indexOf(fileType) !== -1) {

                fileExtention = this.pickone(this.get(poolCollectionKey)[fileType]);
                return (fileName + '.' + fileExtention);
            }

            throw new Error("Expect file type value to be 'raster', 'vector', '3d' or 'document' ");
        }

        // Generate random file name if no extenton options are passed
        fileExtention = this.pickone(this.get(poolCollectionKey)[this.pickone(typeRange)]);
        return (fileName + '.' + fileExtention);
    };

    var data = {

        firstNames: {
            "male": {
                "en": ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
                // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0163
                "it": ["Adolfo", "Alberto", "Aldo", "Alessandro", "Alessio", "Alfredo", "Alvaro", "Andrea", "Angelo", "Angiolo", "Antonino", "Antonio", "Attilio", "Benito", "Bernardo", "Bruno", "Carlo", "Cesare", "Christian", "Claudio", "Corrado", "Cosimo", "Cristian", "Cristiano", "Daniele", "Dario", "David", "Davide", "Diego", "Dino", "Domenico", "Duccio", "Edoardo", "Elia", "Elio", "Emanuele", "Emiliano", "Emilio", "Enrico", "Enzo", "Ettore", "Fabio", "Fabrizio", "Federico", "Ferdinando", "Fernando", "Filippo", "Francesco", "Franco", "Gabriele", "Giacomo", "Giampaolo", "Giampiero", "Giancarlo", "Gianfranco", "Gianluca", "Gianmarco", "Gianni", "Gino", "Giorgio", "Giovanni", "Giuliano", "Giulio", "Giuseppe", "Graziano", "Gregorio", "Guido", "Iacopo", "Jacopo", "Lapo", "Leonardo", "Lorenzo", "Luca", "Luciano", "Luigi", "Manuel", "Marcello", "Marco", "Marino", "Mario", "Massimiliano", "Massimo", "Matteo", "Mattia", "Maurizio", "Mauro", "Michele", "Mirko", "Mohamed", "Nello", "Neri", "Niccolò", "Nicola", "Osvaldo", "Otello", "Paolo", "Pier Luigi", "Piero", "Pietro", "Raffaele", "Remo", "Renato", "Renzo", "Riccardo", "Roberto", "Rolando", "Romano", "Salvatore", "Samuele", "Sandro", "Sergio", "Silvano", "Simone", "Stefano", "Thomas", "Tommaso", "Ubaldo", "Ugo", "Umberto", "Valerio", "Valter", "Vasco", "Vincenzo", "Vittorio"]
            },
            "female": {
                "en": ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "John", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"],
                // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0162
                "it": ["Ada", "Adriana", "Alessandra", "Alessia", "Alice", "Angela", "Anna", "Anna Maria", "Annalisa", "Annita", "Annunziata", "Antonella", "Arianna", "Asia", "Assunta", "Aurora", "Barbara", "Beatrice", "Benedetta", "Bianca", "Bruna", "Camilla", "Carla", "Carlotta", "Carmela", "Carolina", "Caterina", "Catia", "Cecilia", "Chiara", "Cinzia", "Clara", "Claudia", "Costanza", "Cristina", "Daniela", "Debora", "Diletta", "Dina", "Donatella", "Elena", "Eleonora", "Elisa", "Elisabetta", "Emanuela", "Emma", "Eva", "Federica", "Fernanda", "Fiorella", "Fiorenza", "Flora", "Franca", "Francesca", "Gabriella", "Gaia", "Gemma", "Giada", "Gianna", "Gina", "Ginevra", "Giorgia", "Giovanna", "Giulia", "Giuliana", "Giuseppa", "Giuseppina", "Grazia", "Graziella", "Greta", "Ida", "Ilaria", "Ines", "Iolanda", "Irene", "Irma", "Isabella", "Jessica", "Laura", "Leda", "Letizia", "Licia", "Lidia", "Liliana", "Lina", "Linda", "Lisa", "Livia", "Loretta", "Luana", "Lucia", "Luciana", "Lucrezia", "Luisa", "Manuela", "Mara", "Marcella", "Margherita", "Maria", "Maria Cristina", "Maria Grazia", "Maria Luisa", "Maria Pia", "Maria Teresa", "Marina", "Marisa", "Marta", "Martina", "Marzia", "Matilde", "Melissa", "Michela", "Milena", "Mirella", "Monica", "Natalina", "Nella", "Nicoletta", "Noemi", "Olga", "Paola", "Patrizia", "Piera", "Pierina", "Raffaella", "Rebecca", "Renata", "Rina", "Rita", "Roberta", "Rosa", "Rosanna", "Rossana", "Rossella", "Sabrina", "Sandra", "Sara", "Serena", "Silvana", "Silvia", "Simona", "Simonetta", "Sofia", "Sonia", "Stefania", "Susanna", "Teresa", "Tina", "Tiziana", "Tosca", "Valentina", "Valeria", "Vanda", "Vanessa", "Vanna", "Vera", "Veronica", "Vilma", "Viola", "Virginia", "Vittoria"]
            }
        },

        lastNames: {
            "en": ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler', 'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer', 'Bishop', 'McCoy', 'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza', 'Harvey', 'Little', 'Burton', 'Stanley', 'Nguyen', 'George', 'Jacobs', 'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero', 'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman', 'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson', 'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis', 'Neal', 'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton', 'Shelton', 'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles', 'Craig', 'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates', 'Hale', 'Rhodes', 'Pena', 'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez', 'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago', 'Norris', 'Hardy', 'Love', 'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page', 'Munoz', 'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey', 'Wolfe', 'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin', 'Griffith', 'Valdez', 'Hubbard', 'Salazar', 'Reeves', 'Warner', 'Stevenson', 'Burgess', 'Santos', 'Tate', 'Cross', 'Garner', 'Mann', 'Mack', 'Moss', 'Thornton', 'Dennis', 'McGee', 'Farmer', 'Delgado', 'Aguilar', 'Vega', 'Glover', 'Manning', 'Cohen', 'Harmon', 'Rodgers', 'Robbins', 'Newton', 'Todd', 'Blair', 'Higgins', 'Ingram', 'Reese', 'Cannon', 'Strickland', 'Townsend', 'Potter', 'Goodwin', 'Walton', 'Rowe', 'Hampton', 'Ortega', 'Patton', 'Swanson', 'Joseph', 'Francis', 'Goodman', 'Maldonado', 'Yates', 'Becker', 'Erickson', 'Hodges', 'Rios', 'Conner', 'Adkins', 'Webster', 'Norman', 'Malone', 'Hammond', 'Flowers', 'Cobb', 'Moody', 'Quinn', 'Blake', 'Maxwell', 'Pope', 'Floyd', 'Osborne', 'Paul', 'McCarthy', 'Guerrero', 'Lindsey', 'Estrada', 'Sandoval', 'Gibbs', 'Tyler', 'Gross', 'Fitzgerald', 'Stokes', 'Doyle', 'Sherman', 'Saunders', 'Wise', 'Colon', 'Gill', 'Alvarado', 'Greer', 'Padilla', 'Simon', 'Waters', 'Nunez', 'Ballard', 'Schwartz', 'McBride', 'Houston', 'Christensen', 'Klein', 'Pratt', 'Briggs', 'Parsons', 'McLaughlin', 'Zimmerman', 'French', 'Buchanan', 'Moran', 'Copeland', 'Roy', 'Pittman', 'Brady', 'McCormick', 'Holloway', 'Brock', 'Poole', 'Frank', 'Logan', 'Owen', 'Bass', 'Marsh', 'Drake', 'Wong', 'Jefferson', 'Park', 'Morton', 'Abbott', 'Sparks', 'Patrick', 'Norton', 'Huff', 'Clayton', 'Massey', 'Lloyd', 'Figueroa', 'Carson', 'Bowers', 'Roberson', 'Barton', 'Tran', 'Lamb', 'Harrington', 'Casey', 'Boone', 'Cortez', 'Clarke', 'Mathis', 'Singleton', 'Wilkins', 'Cain', 'Bryan', 'Underwood', 'Hogan', 'McKenzie', 'Collier', 'Luna', 'Phelps', 'McGuire', 'Allison', 'Bridges', 'Wilkerson', 'Nash', 'Summers', 'Atkins'],
                // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0164 (first 1000)
            "it": ["Acciai", "Aglietti", "Agostini", "Agresti", "Ahmed", "Aiazzi", "Albanese", "Alberti", "Alessi", "Alfani", "Alinari", "Alterini", "Amato", "Ammannati", "Ancillotti", "Andrei", "Andreini", "Andreoni", "Angeli", "Anichini", "Antonelli", "Antonini", "Arena", "Ariani", "Arnetoli", "Arrighi", "Baccani", "Baccetti", "Bacci", "Bacherini", "Badii", "Baggiani", "Baglioni", "Bagni", "Bagnoli", "Baldassini", "Baldi", "Baldini", "Ballerini", "Balli", "Ballini", "Balloni", "Bambi", "Banchi", "Bandinelli", "Bandini", "Bani", "Barbetti", "Barbieri", "Barchielli", "Bardazzi", "Bardelli", "Bardi", "Barducci", "Bargellini", "Bargiacchi", "Barni", "Baroncelli", "Baroncini", "Barone", "Baroni", "Baronti", "Bartalesi", "Bartoletti", "Bartoli", "Bartolini", "Bartoloni", "Bartolozzi", "Basagni", "Basile", "Bassi", "Batacchi", "Battaglia", "Battaglini", "Bausi", "Becagli", "Becattini", "Becchi", "Becucci", "Bellandi", "Bellesi", "Belli", "Bellini", "Bellucci", "Bencini", "Benedetti", "Benelli", "Beni", "Benini", "Bensi", "Benucci", "Benvenuti", "Berlincioni", "Bernacchioni", "Bernardi", "Bernardini", "Berni", "Bernini", "Bertelli", "Berti", "Bertini", "Bessi", "Betti", "Bettini", "Biagi", "Biagini", "Biagioni", "Biagiotti", "Biancalani", "Bianchi", "Bianchini", "Bianco", "Biffoli", "Bigazzi", "Bigi", "Biliotti", "Billi", "Binazzi", "Bindi", "Bini", "Biondi", "Bizzarri", "Bocci", "Bogani", "Bolognesi", "Bonaiuti", "Bonanni", "Bonciani", "Boncinelli", "Bondi", "Bonechi", "Bongini", "Boni", "Bonini", "Borchi", "Boretti", "Borghi", "Borghini", "Borgioli", "Borri", "Borselli", "Boschi", "Bottai", "Bracci", "Braccini", "Brandi", "Braschi", "Bravi", "Brazzini", "Breschi", "Brilli", "Brizzi", "Brogelli", "Brogi", "Brogioni", "Brunelli", "Brunetti", "Bruni", "Bruno", "Brunori", "Bruschi", "Bucci", "Bucciarelli", "Buccioni", "Bucelli", "Bulli", "Burberi", "Burchi", "Burgassi", "Burroni", "Bussotti", "Buti", "Caciolli", "Caiani", "Calabrese", "Calamai", "Calamandrei", "Caldini", "Calo'", "Calonaci", "Calosi", "Calvelli", "Cambi", "Camiciottoli", "Cammelli", "Cammilli", "Campolmi", "Cantini", "Capanni", "Capecchi", "Caponi", "Cappelletti", "Cappelli", "Cappellini", "Cappugi", "Capretti", "Caputo", "Carbone", "Carboni", "Cardini", "Carlesi", "Carletti", "Carli", "Caroti", "Carotti", "Carrai", "Carraresi", "Carta", "Caruso", "Casalini", "Casati", "Caselli", "Casini", "Castagnoli", "Castellani", "Castelli", "Castellucci", "Catalano", "Catarzi", "Catelani", "Cavaciocchi", "Cavallaro", "Cavallini", "Cavicchi", "Cavini", "Ceccarelli", "Ceccatelli", "Ceccherelli", "Ceccherini", "Cecchi", "Cecchini", "Cecconi", "Cei", "Cellai", "Celli", "Cellini", "Cencetti", "Ceni", "Cenni", "Cerbai", "Cesari", "Ceseri", "Checcacci", "Checchi", "Checcucci", "Cheli", "Chellini", "Chen", "Cheng", "Cherici", "Cherubini", "Chiaramonti", "Chiarantini", "Chiarelli", "Chiari", "Chiarini", "Chiarugi", "Chiavacci", "Chiesi", "Chimenti", "Chini", "Chirici", "Chiti", "Ciabatti", "Ciampi", "Cianchi", "Cianfanelli", "Cianferoni", "Ciani", "Ciapetti", "Ciappi", "Ciardi", "Ciatti", "Cicali", "Ciccone", "Cinelli", "Cini", "Ciobanu", "Ciolli", "Cioni", "Cipriani", "Cirillo", "Cirri", "Ciucchi", "Ciuffi", "Ciulli", "Ciullini", "Clemente", "Cocchi", "Cognome", "Coli", "Collini", "Colombo", "Colzi", "Comparini", "Conforti", "Consigli", "Conte", "Conti", "Contini", "Coppini", "Coppola", "Corsi", "Corsini", "Corti", "Cortini", "Cosi", "Costa", "Costantini", "Costantino", "Cozzi", "Cresci", "Crescioli", "Cresti", "Crini", "Curradi", "D'Agostino", "D'Alessandro", "D'Amico", "D'Angelo", "Daddi", "Dainelli", "Dallai", "Danti", "Davitti", "De Angelis", "De Luca", "De Marco", "De Rosa", "De Santis", "De Simone", "De Vita", "Degl'Innocenti", "Degli Innocenti", "Dei", "Del Lungo", "Del Re", "Di Marco", "Di Stefano", "Dini", "Diop", "Dobre", "Dolfi", "Donati", "Dondoli", "Dong", "Donnini", "Ducci", "Dumitru", "Ermini", "Esposito", "Evangelisti", "Fabbri", "Fabbrini", "Fabbrizzi", "Fabbroni", "Fabbrucci", "Fabiani", "Facchini", "Faggi", "Fagioli", "Failli", "Faini", "Falciani", "Falcini", "Falcone", "Fallani", "Falorni", "Falsini", "Falugiani", "Fancelli", "Fanelli", "Fanetti", "Fanfani", "Fani", "Fantappie'", "Fantechi", "Fanti", "Fantini", "Fantoni", "Farina", "Fattori", "Favilli", "Fedi", "Fei", "Ferrante", "Ferrara", "Ferrari", "Ferraro", "Ferretti", "Ferri", "Ferrini", "Ferroni", "Fiaschi", "Fibbi", "Fiesoli", "Filippi", "Filippini", "Fini", "Fioravanti", "Fiore", "Fiorentini", "Fiorini", "Fissi", "Focardi", "Foggi", "Fontana", "Fontanelli", "Fontani", "Forconi", "Formigli", "Forte", "Forti", "Fortini", "Fossati", "Fossi", "Francalanci", "Franceschi", "Franceschini", "Franchi", "Franchini", "Franci", "Francini", "Francioni", "Franco", "Frassineti", "Frati", "Fratini", "Frilli", "Frizzi", "Frosali", "Frosini", "Frullini", "Fusco", "Fusi", "Gabbrielli", "Gabellini", "Gagliardi", "Galanti", "Galardi", "Galeotti", "Galletti", "Galli", "Gallo", "Gallori", "Gambacciani", "Gargani", "Garofalo", "Garuglieri", "Gashi", "Gasperini", "Gatti", "Gelli", "Gensini", "Gentile", "Gentili", "Geri", "Gerini", "Gheri", "Ghini", "Giachetti", "Giachi", "Giacomelli", "Gianassi", "Giani", "Giannelli", "Giannetti", "Gianni", "Giannini", "Giannoni", "Giannotti", "Giannozzi", "Gigli", "Giordano", "Giorgetti", "Giorgi", "Giovacchini", "Giovannelli", "Giovannetti", "Giovannini", "Giovannoni", "Giuliani", "Giunti", "Giuntini", "Giusti", "Gonnelli", "Goretti", "Gori", "Gradi", "Gramigni", "Grassi", "Grasso", "Graziani", "Grazzini", "Greco", "Grifoni", "Grillo", "Grimaldi", "Grossi", "Gualtieri", "Guarducci", "Guarino", "Guarnieri", "Guasti", "Guerra", "Guerri", "Guerrini", "Guidi", "Guidotti", "He", "Hoxha", "Hu", "Huang", "Iandelli", "Ignesti", "Innocenti", "Jin", "La Rosa", "Lai", "Landi", "Landini", "Lanini", "Lapi", "Lapini", "Lari", "Lascialfari", "Lastrucci", "Latini", "Lazzeri", "Lazzerini", "Lelli", "Lenzi", "Leonardi", "Leoncini", "Leone", "Leoni", "Lepri", "Li", "Liao", "Lin", "Linari", "Lippi", "Lisi", "Livi", "Lombardi", "Lombardini", "Lombardo", "Longo", "Lopez", "Lorenzi", "Lorenzini", "Lorini", "Lotti", "Lu", "Lucchesi", "Lucherini", "Lunghi", "Lupi", "Madiai", "Maestrini", "Maffei", "Maggi", "Maggini", "Magherini", "Magini", "Magnani", "Magnelli", "Magni", "Magnolfi", "Magrini", "Malavolti", "Malevolti", "Manca", "Mancini", "Manetti", "Manfredi", "Mangani", "Mannelli", "Manni", "Mannini", "Mannucci", "Manuelli", "Manzini", "Marcelli", "Marchese", "Marchetti", "Marchi", "Marchiani", "Marchionni", "Marconi", "Marcucci", "Margheri", "Mari", "Mariani", "Marilli", "Marinai", "Marinari", "Marinelli", "Marini", "Marino", "Mariotti", "Marsili", "Martelli", "Martinelli", "Martini", "Martino", "Marzi", "Masi", "Masini", "Masoni", "Massai", "Materassi", "Mattei", "Matteini", "Matteucci", "Matteuzzi", "Mattioli", "Mattolini", "Matucci", "Mauro", "Mazzanti", "Mazzei", "Mazzetti", "Mazzi", "Mazzini", "Mazzocchi", "Mazzoli", "Mazzoni", "Mazzuoli", "Meacci", "Mecocci", "Meini", "Melani", "Mele", "Meli", "Mengoni", "Menichetti", "Meoni", "Merlini", "Messeri", "Messina", "Meucci", "Miccinesi", "Miceli", "Micheli", "Michelini", "Michelozzi", "Migliori", "Migliorini", "Milani", "Miniati", "Misuri", "Monaco", "Montagnani", "Montagni", "Montanari", "Montelatici", "Monti", "Montigiani", "Montini", "Morandi", "Morandini", "Morelli", "Moretti", "Morganti", "Mori", "Morini", "Moroni", "Morozzi", "Mugnai", "Mugnaini", "Mustafa", "Naldi", "Naldini", "Nannelli", "Nanni", "Nannini", "Nannucci", "Nardi", "Nardini", "Nardoni", "Natali", "Ndiaye", "Nencetti", "Nencini", "Nencioni", "Neri", "Nesi", "Nesti", "Niccolai", "Niccoli", "Niccolini", "Nigi", "Nistri", "Nocentini", "Noferini", "Novelli", "Nucci", "Nuti", "Nutini", "Oliva", "Olivieri", "Olmi", "Orlandi", "Orlandini", "Orlando", "Orsini", "Ortolani", "Ottanelli", "Pacciani", "Pace", "Paci", "Pacini", "Pagani", "Pagano", "Paggetti", "Pagliai", "Pagni", "Pagnini", "Paladini", "Palagi", "Palchetti", "Palloni", "Palmieri", "Palumbo", "Pampaloni", "Pancani", "Pandolfi", "Pandolfini", "Panerai", "Panichi", "Paoletti", "Paoli", "Paolini", "Papi", "Papini", "Papucci", "Parenti", "Parigi", "Parisi", "Parri", "Parrini", "Pasquini", "Passeri", "Pecchioli", "Pecorini", "Pellegrini", "Pepi", "Perini", "Perrone", "Peruzzi", "Pesci", "Pestelli", "Petri", "Petrini", "Petrucci", "Pettini", "Pezzati", "Pezzatini", "Piani", "Piazza", "Piazzesi", "Piazzini", "Piccardi", "Picchi", "Piccini", "Piccioli", "Pieraccini", "Pieraccioni", "Pieralli", "Pierattini", "Pieri", "Pierini", "Pieroni", "Pietrini", "Pini", "Pinna", "Pinto", "Pinzani", "Pinzauti", "Piras", "Pisani", "Pistolesi", "Poggesi", "Poggi", "Poggiali", "Poggiolini", "Poli", "Pollastri", "Porciani", "Pozzi", "Pratellesi", "Pratesi", "Prosperi", "Pruneti", "Pucci", "Puccini", "Puccioni", "Pugi", "Pugliese", "Puliti", "Querci", "Quercioli", "Raddi", "Radu", "Raffaelli", "Ragazzini", "Ranfagni", "Ranieri", "Rastrelli", "Raugei", "Raveggi", "Renai", "Renzi", "Rettori", "Ricci", "Ricciardi", "Ridi", "Ridolfi", "Rigacci", "Righi", "Righini", "Rinaldi", "Risaliti", "Ristori", "Rizzo", "Rocchi", "Rocchini", "Rogai", "Romagnoli", "Romanelli", "Romani", "Romano", "Romei", "Romeo", "Romiti", "Romoli", "Romolini", "Rontini", "Rosati", "Roselli", "Rosi", "Rossetti", "Rossi", "Rossini", "Rovai", "Ruggeri", "Ruggiero", "Russo", "Sabatini", "Saccardi", "Sacchetti", "Sacchi", "Sacco", "Salerno", "Salimbeni", "Salucci", "Salvadori", "Salvestrini", "Salvi", "Salvini", "Sanesi", "Sani", "Sanna", "Santi", "Santini", "Santoni", "Santoro", "Santucci", "Sardi", "Sarri", "Sarti", "Sassi", "Sbolci", "Scali", "Scarpelli", "Scarselli", "Scopetani", "Secci", "Selvi", "Senatori", "Senesi", "Serafini", "Sereni", "Serra", "Sestini", "Sguanci", "Sieni", "Signorini", "Silvestri", "Simoncini", "Simonetti", "Simoni", "Singh", "Sodi", "Soldi", "Somigli", "Sorbi", "Sorelli", "Sorrentino", "Sottili", "Spina", "Spinelli", "Staccioli", "Staderini", "Stefanelli", "Stefani", "Stefanini", "Stella", "Susini", "Tacchi", "Tacconi", "Taddei", "Tagliaferri", "Tamburini", "Tanganelli", "Tani", "Tanini", "Tapinassi", "Tarchi", "Tarchiani", "Targioni", "Tassi", "Tassini", "Tempesti", "Terzani", "Tesi", "Testa", "Testi", "Tilli", "Tinti", "Tirinnanzi", "Toccafondi", "Tofanari", "Tofani", "Tognaccini", "Tonelli", "Tonini", "Torelli", "Torrini", "Tosi", "Toti", "Tozzi", "Trambusti", "Trapani", "Tucci", "Turchi", "Ugolini", "Ulivi", "Valente", "Valenti", "Valentini", "Vangelisti", "Vanni", "Vannini", "Vannoni", "Vannozzi", "Vannucchi", "Vannucci", "Ventura", "Venturi", "Venturini", "Vestri", "Vettori", "Vichi", "Viciani", "Vieri", "Vigiani", "Vignoli", "Vignolini", "Vignozzi", "Villani", "Vinci", "Visani", "Vitale", "Vitali", "Viti", "Viviani", "Vivoli", "Volpe", "Volpi", "Wang", "Wu", "Xu", "Yang", "Ye", "Zagli", "Zani", "Zanieri", "Zanobini", "Zecchi", "Zetti", "Zhang", "Zheng", "Zhou", "Zhu", "Zingoni", "Zini", "Zoppi"]
        },

        // Data taken from https://github.com/umpirsky/country-list/blob/master/data/en_US/country.json
        countries: [{"name":"Afghanistan","abbreviation":"AF"},{"name":"Åland Islands","abbreviation":"AX"},{"name":"Albania","abbreviation":"AL"},{"name":"Algeria","abbreviation":"DZ"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Andorra","abbreviation":"AD"},{"name":"Angola","abbreviation":"AO"},{"name":"Anguilla","abbreviation":"AI"},{"name":"Antarctica","abbreviation":"AQ"},{"name":"Antigua & Barbuda","abbreviation":"AG"},{"name":"Argentina","abbreviation":"AR"},{"name":"Armenia","abbreviation":"AM"},{"name":"Aruba","abbreviation":"AW"},{"name":"Ascension Island","abbreviation":"AC"},{"name":"Australia","abbreviation":"AU"},{"name":"Austria","abbreviation":"AT"},{"name":"Azerbaijan","abbreviation":"AZ"},{"name":"Bahamas","abbreviation":"BS"},{"name":"Bahrain","abbreviation":"BH"},{"name":"Bangladesh","abbreviation":"BD"},{"name":"Barbados","abbreviation":"BB"},{"name":"Belarus","abbreviation":"BY"},{"name":"Belgium","abbreviation":"BE"},{"name":"Belize","abbreviation":"BZ"},{"name":"Benin","abbreviation":"BJ"},{"name":"Bermuda","abbreviation":"BM"},{"name":"Bhutan","abbreviation":"BT"},{"name":"Bolivia","abbreviation":"BO"},{"name":"Bosnia & Herzegovina","abbreviation":"BA"},{"name":"Botswana","abbreviation":"BW"},{"name":"Brazil","abbreviation":"BR"},{"name":"British Indian Ocean Territory","abbreviation":"IO"},{"name":"British Virgin Islands","abbreviation":"VG"},{"name":"Brunei","abbreviation":"BN"},{"name":"Bulgaria","abbreviation":"BG"},{"name":"Burkina Faso","abbreviation":"BF"},{"name":"Burundi","abbreviation":"BI"},{"name":"Cambodia","abbreviation":"KH"},{"name":"Cameroon","abbreviation":"CM"},{"name":"Canada","abbreviation":"CA"},{"name":"Canary Islands","abbreviation":"IC"},{"name":"Cape Verde","abbreviation":"CV"},{"name":"Caribbean Netherlands","abbreviation":"BQ"},{"name":"Cayman Islands","abbreviation":"KY"},{"name":"Central African Republic","abbreviation":"CF"},{"name":"Ceuta & Melilla","abbreviation":"EA"},{"name":"Chad","abbreviation":"TD"},{"name":"Chile","abbreviation":"CL"},{"name":"China","abbreviation":"CN"},{"name":"Christmas Island","abbreviation":"CX"},{"name":"Cocos (Keeling) Islands","abbreviation":"CC"},{"name":"Colombia","abbreviation":"CO"},{"name":"Comoros","abbreviation":"KM"},{"name":"Congo - Brazzaville","abbreviation":"CG"},{"name":"Congo - Kinshasa","abbreviation":"CD"},{"name":"Cook Islands","abbreviation":"CK"},{"name":"Costa Rica","abbreviation":"CR"},{"name":"Côte d'Ivoire","abbreviation":"CI"},{"name":"Croatia","abbreviation":"HR"},{"name":"Cuba","abbreviation":"CU"},{"name":"Curaçao","abbreviation":"CW"},{"name":"Cyprus","abbreviation":"CY"},{"name":"Czech Republic","abbreviation":"CZ"},{"name":"Denmark","abbreviation":"DK"},{"name":"Diego Garcia","abbreviation":"DG"},{"name":"Djibouti","abbreviation":"DJ"},{"name":"Dominica","abbreviation":"DM"},{"name":"Dominican Republic","abbreviation":"DO"},{"name":"Ecuador","abbreviation":"EC"},{"name":"Egypt","abbreviation":"EG"},{"name":"El Salvador","abbreviation":"SV"},{"name":"Equatorial Guinea","abbreviation":"GQ"},{"name":"Eritrea","abbreviation":"ER"},{"name":"Estonia","abbreviation":"EE"},{"name":"Ethiopia","abbreviation":"ET"},{"name":"Falkland Islands","abbreviation":"FK"},{"name":"Faroe Islands","abbreviation":"FO"},{"name":"Fiji","abbreviation":"FJ"},{"name":"Finland","abbreviation":"FI"},{"name":"France","abbreviation":"FR"},{"name":"French Guiana","abbreviation":"GF"},{"name":"French Polynesia","abbreviation":"PF"},{"name":"French Southern Territories","abbreviation":"TF"},{"name":"Gabon","abbreviation":"GA"},{"name":"Gambia","abbreviation":"GM"},{"name":"Georgia","abbreviation":"GE"},{"name":"Germany","abbreviation":"DE"},{"name":"Ghana","abbreviation":"GH"},{"name":"Gibraltar","abbreviation":"GI"},{"name":"Greece","abbreviation":"GR"},{"name":"Greenland","abbreviation":"GL"},{"name":"Grenada","abbreviation":"GD"},{"name":"Guadeloupe","abbreviation":"GP"},{"name":"Guam","abbreviation":"GU"},{"name":"Guatemala","abbreviation":"GT"},{"name":"Guernsey","abbreviation":"GG"},{"name":"Guinea","abbreviation":"GN"},{"name":"Guinea-Bissau","abbreviation":"GW"},{"name":"Guyana","abbreviation":"GY"},{"name":"Haiti","abbreviation":"HT"},{"name":"Honduras","abbreviation":"HN"},{"name":"Hong Kong SAR China","abbreviation":"HK"},{"name":"Hungary","abbreviation":"HU"},{"name":"Iceland","abbreviation":"IS"},{"name":"India","abbreviation":"IN"},{"name":"Indonesia","abbreviation":"ID"},{"name":"Iran","abbreviation":"IR"},{"name":"Iraq","abbreviation":"IQ"},{"name":"Ireland","abbreviation":"IE"},{"name":"Isle of Man","abbreviation":"IM"},{"name":"Israel","abbreviation":"IL"},{"name":"Italy","abbreviation":"IT"},{"name":"Jamaica","abbreviation":"JM"},{"name":"Japan","abbreviation":"JP"},{"name":"Jersey","abbreviation":"JE"},{"name":"Jordan","abbreviation":"JO"},{"name":"Kazakhstan","abbreviation":"KZ"},{"name":"Kenya","abbreviation":"KE"},{"name":"Kiribati","abbreviation":"KI"},{"name":"Kosovo","abbreviation":"XK"},{"name":"Kuwait","abbreviation":"KW"},{"name":"Kyrgyzstan","abbreviation":"KG"},{"name":"Laos","abbreviation":"LA"},{"name":"Latvia","abbreviation":"LV"},{"name":"Lebanon","abbreviation":"LB"},{"name":"Lesotho","abbreviation":"LS"},{"name":"Liberia","abbreviation":"LR"},{"name":"Libya","abbreviation":"LY"},{"name":"Liechtenstein","abbreviation":"LI"},{"name":"Lithuania","abbreviation":"LT"},{"name":"Luxembourg","abbreviation":"LU"},{"name":"Macau SAR China","abbreviation":"MO"},{"name":"Macedonia","abbreviation":"MK"},{"name":"Madagascar","abbreviation":"MG"},{"name":"Malawi","abbreviation":"MW"},{"name":"Malaysia","abbreviation":"MY"},{"name":"Maldives","abbreviation":"MV"},{"name":"Mali","abbreviation":"ML"},{"name":"Malta","abbreviation":"MT"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Martinique","abbreviation":"MQ"},{"name":"Mauritania","abbreviation":"MR"},{"name":"Mauritius","abbreviation":"MU"},{"name":"Mayotte","abbreviation":"YT"},{"name":"Mexico","abbreviation":"MX"},{"name":"Micronesia","abbreviation":"FM"},{"name":"Moldova","abbreviation":"MD"},{"name":"Monaco","abbreviation":"MC"},{"name":"Mongolia","abbreviation":"MN"},{"name":"Montenegro","abbreviation":"ME"},{"name":"Montserrat","abbreviation":"MS"},{"name":"Morocco","abbreviation":"MA"},{"name":"Mozambique","abbreviation":"MZ"},{"name":"Myanmar (Burma)","abbreviation":"MM"},{"name":"Namibia","abbreviation":"NA"},{"name":"Nauru","abbreviation":"NR"},{"name":"Nepal","abbreviation":"NP"},{"name":"Netherlands","abbreviation":"NL"},{"name":"New Caledonia","abbreviation":"NC"},{"name":"New Zealand","abbreviation":"NZ"},{"name":"Nicaragua","abbreviation":"NI"},{"name":"Niger","abbreviation":"NE"},{"name":"Nigeria","abbreviation":"NG"},{"name":"Niue","abbreviation":"NU"},{"name":"Norfolk Island","abbreviation":"NF"},{"name":"North Korea","abbreviation":"KP"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Norway","abbreviation":"NO"},{"name":"Oman","abbreviation":"OM"},{"name":"Pakistan","abbreviation":"PK"},{"name":"Palau","abbreviation":"PW"},{"name":"Palestinian Territories","abbreviation":"PS"},{"name":"Panama","abbreviation":"PA"},{"name":"Papua New Guinea","abbreviation":"PG"},{"name":"Paraguay","abbreviation":"PY"},{"name":"Peru","abbreviation":"PE"},{"name":"Philippines","abbreviation":"PH"},{"name":"Pitcairn Islands","abbreviation":"PN"},{"name":"Poland","abbreviation":"PL"},{"name":"Portugal","abbreviation":"PT"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Qatar","abbreviation":"QA"},{"name":"Réunion","abbreviation":"RE"},{"name":"Romania","abbreviation":"RO"},{"name":"Russia","abbreviation":"RU"},{"name":"Rwanda","abbreviation":"RW"},{"name":"Samoa","abbreviation":"WS"},{"name":"San Marino","abbreviation":"SM"},{"name":"São Tomé and Príncipe","abbreviation":"ST"},{"name":"Saudi Arabia","abbreviation":"SA"},{"name":"Senegal","abbreviation":"SN"},{"name":"Serbia","abbreviation":"RS"},{"name":"Seychelles","abbreviation":"SC"},{"name":"Sierra Leone","abbreviation":"SL"},{"name":"Singapore","abbreviation":"SG"},{"name":"Sint Maarten","abbreviation":"SX"},{"name":"Slovakia","abbreviation":"SK"},{"name":"Slovenia","abbreviation":"SI"},{"name":"Solomon Islands","abbreviation":"SB"},{"name":"Somalia","abbreviation":"SO"},{"name":"South Africa","abbreviation":"ZA"},{"name":"South Georgia & South Sandwich Islands","abbreviation":"GS"},{"name":"South Korea","abbreviation":"KR"},{"name":"South Sudan","abbreviation":"SS"},{"name":"Spain","abbreviation":"ES"},{"name":"Sri Lanka","abbreviation":"LK"},{"name":"St. Barthélemy","abbreviation":"BL"},{"name":"St. Helena","abbreviation":"SH"},{"name":"St. Kitts & Nevis","abbreviation":"KN"},{"name":"St. Lucia","abbreviation":"LC"},{"name":"St. Martin","abbreviation":"MF"},{"name":"St. Pierre & Miquelon","abbreviation":"PM"},{"name":"St. Vincent & Grenadines","abbreviation":"VC"},{"name":"Sudan","abbreviation":"SD"},{"name":"Suriname","abbreviation":"SR"},{"name":"Svalbard & Jan Mayen","abbreviation":"SJ"},{"name":"Swaziland","abbreviation":"SZ"},{"name":"Sweden","abbreviation":"SE"},{"name":"Switzerland","abbreviation":"CH"},{"name":"Syria","abbreviation":"SY"},{"name":"Taiwan","abbreviation":"TW"},{"name":"Tajikistan","abbreviation":"TJ"},{"name":"Tanzania","abbreviation":"TZ"},{"name":"Thailand","abbreviation":"TH"},{"name":"Timor-Leste","abbreviation":"TL"},{"name":"Togo","abbreviation":"TG"},{"name":"Tokelau","abbreviation":"TK"},{"name":"Tonga","abbreviation":"TO"},{"name":"Trinidad & Tobago","abbreviation":"TT"},{"name":"Tristan da Cunha","abbreviation":"TA"},{"name":"Tunisia","abbreviation":"TN"},{"name":"Turkey","abbreviation":"TR"},{"name":"Turkmenistan","abbreviation":"TM"},{"name":"Turks & Caicos Islands","abbreviation":"TC"},{"name":"Tuvalu","abbreviation":"TV"},{"name":"U.S. Outlying Islands","abbreviation":"UM"},{"name":"U.S. Virgin Islands","abbreviation":"VI"},{"name":"Uganda","abbreviation":"UG"},{"name":"Ukraine","abbreviation":"UA"},{"name":"United Arab Emirates","abbreviation":"AE"},{"name":"United Kingdom","abbreviation":"GB"},{"name":"United States","abbreviation":"US"},{"name":"Uruguay","abbreviation":"UY"},{"name":"Uzbekistan","abbreviation":"UZ"},{"name":"Vanuatu","abbreviation":"VU"},{"name":"Vatican City","abbreviation":"VA"},{"name":"Venezuela","abbreviation":"VE"},{"name":"Vietnam","abbreviation":"VN"},{"name":"Wallis & Futuna","abbreviation":"WF"},{"name":"Western Sahara","abbreviation":"EH"},{"name":"Yemen","abbreviation":"YE"},{"name":"Zambia","abbreviation":"ZM"},{"name":"Zimbabwe","abbreviation":"ZW"}],

		counties: {
            // Data taken from http://www.downloadexcelfiles.com/gb_en/download-excel-file-list-counties-uk
            "uk": [
                {name: 'Bath and North East Somerset'},
                {name: 'Bedford'},
                {name: 'Blackburn with Darwen'},
                {name: 'Blackpool'},
                {name: 'Bournemouth'},
                {name: 'Bracknell Forest'},
                {name: 'Brighton & Hove'},
                {name: 'Bristol'},
                {name: 'Buckinghamshire'},
                {name: 'Cambridgeshire'},
                {name: 'Central Bedfordshire'},
                {name: 'Cheshire East'},
                {name: 'Cheshire West and Chester'},
                {name: 'Cornwall'},
                {name: 'County Durham'},
                {name: 'Cumbria'},
                {name: 'Darlington'},
                {name: 'Derby'},
                {name: 'Derbyshire'},
                {name: 'Devon'},
                {name: 'Dorset'},
                {name: 'East Riding of Yorkshire'},
                {name: 'East Sussex'},
                {name: 'Essex'},
                {name: 'Gloucestershire'},
                {name: 'Greater London'},
                {name: 'Greater Manchester'},
                {name: 'Halton'},
                {name: 'Hampshire'},
                {name: 'Hartlepool'},
                {name: 'Herefordshire'},
                {name: 'Hertfordshire'},
                {name: 'Hull'},
                {name: 'Isle of Wight'},
                {name: 'Isles of Scilly'},
                {name: 'Kent'},
                {name: 'Lancashire'},
                {name: 'Leicester'},
                {name: 'Leicestershire'},
                {name: 'Lincolnshire'},
                {name: 'Luton'},
                {name: 'Medway'},
                {name: 'Merseyside'},
                {name: 'Middlesbrough'},
                {name: 'Milton Keynes'},
                {name: 'Norfolk'},
                {name: 'North East Lincolnshire'},
                {name: 'North Lincolnshire'},
                {name: 'North Somerset'},
                {name: 'North Yorkshire'},
                {name: 'Northamptonshire'},
                {name: 'Northumberland'},
                {name: 'Nottingham'},
                {name: 'Nottinghamshire'},
                {name: 'Oxfordshire'},
                {name: 'Peterborough'},
                {name: 'Plymouth'},
                {name: 'Poole'},
                {name: 'Portsmouth'},
                {name: 'Reading'},
                {name: 'Redcar and Cleveland'},
                {name: 'Rutland'},
                {name: 'Shropshire'},
                {name: 'Slough'},
                {name: 'Somerset'},
                {name: 'South Gloucestershire'},
                {name: 'South Yorkshire'},
                {name: 'Southampton'},
                {name: 'Southend-on-Sea'},
                {name: 'Staffordshire'},
                {name: 'Stockton-on-Tees'},
                {name: 'Stoke-on-Trent'},
                {name: 'Suffolk'},
                {name: 'Surrey'},
                {name: 'Swindon'},
                {name: 'Telford and Wrekin'},
                {name: 'Thurrock'},
                {name: 'Torbay'},
                {name: 'Tyne and Wear'},
                {name: 'Warrington'},
                {name: 'Warwickshire'},
                {name: 'West Berkshire'},
                {name: 'West Midlands'},
                {name: 'West Sussex'},
                {name: 'West Yorkshire'},
                {name: 'Wiltshire'},
                {name: 'Windsor and Maidenhead'},
                {name: 'Wokingham'},
                {name: 'Worcestershire'},
                {name: 'York'}]
				},
        provinces: {
            "ca": [
                {name: 'Alberta', abbreviation: 'AB'},
                {name: 'British Columbia', abbreviation: 'BC'},
                {name: 'Manitoba', abbreviation: 'MB'},
                {name: 'New Brunswick', abbreviation: 'NB'},
                {name: 'Newfoundland and Labrador', abbreviation: 'NL'},
                {name: 'Nova Scotia', abbreviation: 'NS'},
                {name: 'Ontario', abbreviation: 'ON'},
                {name: 'Prince Edward Island', abbreviation: 'PE'},
                {name: 'Quebec', abbreviation: 'QC'},
                {name: 'Saskatchewan', abbreviation: 'SK'},

                // The case could be made that the following are not actually provinces
                // since they are technically considered "territories" however they all
                // look the same on an envelope!
                {name: 'Northwest Territories', abbreviation: 'NT'},
                {name: 'Nunavut', abbreviation: 'NU'},
                {name: 'Yukon', abbreviation: 'YT'}
            ],
            "it": [
                { name: "Agrigento", abbreviation: "AG", code: 84 },
                { name: "Alessandria", abbreviation: "AL", code: 6 },
                { name: "Ancona", abbreviation: "AN", code: 42 },
                { name: "Aosta", abbreviation: "AO", code: 7 },
                { name: "L'Aquila", abbreviation: "AQ", code: 66 },
                { name: "Arezzo", abbreviation: "AR", code: 51 },
                { name: "Ascoli-Piceno", abbreviation: "AP", code: 44 },
                { name: "Asti", abbreviation: "AT", code: 5 },
                { name: "Avellino", abbreviation: "AV", code: 64 },
                { name: "Bari", abbreviation: "BA", code: 72 },
                { name: "Barletta-Andria-Trani", abbreviation: "BT", code: 72 },
                { name: "Belluno", abbreviation: "BL", code: 25 },
                { name: "Benevento", abbreviation: "BN", code: 62 },
                { name: "Bergamo", abbreviation: "BG", code: 16 },
                { name: "Biella", abbreviation: "BI", code: 96 },
                { name: "Bologna", abbreviation: "BO", code: 37 },
                { name: "Bolzano", abbreviation: "BZ", code: 21 },
                { name: "Brescia", abbreviation: "BS", code: 17 },
                { name: "Brindisi", abbreviation: "BR", code: 74 },
                { name: "Cagliari", abbreviation: "CA", code: 92 },
                { name: "Caltanissetta", abbreviation: "CL", code: 85 },
                { name: "Campobasso", abbreviation: "CB", code: 70 },
                { name: "Carbonia Iglesias", abbreviation: "CI", code: 70 },
                { name: "Caserta", abbreviation: "CE", code: 61 },
                { name: "Catania", abbreviation: "CT", code: 87 },
                { name: "Catanzaro", abbreviation: "CZ", code: 79 },
                { name: "Chieti", abbreviation: "CH", code: 69 },
                { name: "Como", abbreviation: "CO", code: 13 },
                { name: "Cosenza", abbreviation: "CS", code: 78 },
                { name: "Cremona", abbreviation: "CR", code: 19 },
                { name: "Crotone", abbreviation: "KR", code: 101 },
                { name: "Cuneo", abbreviation: "CN", code: 4 },
                { name: "Enna", abbreviation: "EN", code: 86 },
                { name: "Fermo", abbreviation: "FM", code: 86 },
                { name: "Ferrara", abbreviation: "FE", code: 38 },
                { name: "Firenze", abbreviation: "FI", code: 48 },
                { name: "Foggia", abbreviation: "FG", code: 71 },
                { name: "Forli-Cesena", abbreviation: "FC", code: 71 },
                { name: "Frosinone", abbreviation: "FR", code: 60 },
                { name: "Genova", abbreviation: "GE", code: 10 },
                { name: "Gorizia", abbreviation: "GO", code: 31 },
                { name: "Grosseto", abbreviation: "GR", code: 53 },
                { name: "Imperia", abbreviation: "IM", code: 8 },
                { name: "Isernia", abbreviation: "IS", code: 94 },
                { name: "La-Spezia", abbreviation: "SP", code: 66 },
                { name: "Latina", abbreviation: "LT", code: 59 },
                { name: "Lecce", abbreviation: "LE", code: 75 },
                { name: "Lecco", abbreviation: "LC", code: 97 },
                { name: "Livorno", abbreviation: "LI", code: 49 },
                { name: "Lodi", abbreviation: "LO", code: 98 },
                { name: "Lucca", abbreviation: "LU", code: 46 },
                { name: "Macerata", abbreviation: "MC", code: 43 },
                { name: "Mantova", abbreviation: "MN", code: 20 },
                { name: "Massa-Carrara", abbreviation: "MS", code: 45 },
                { name: "Matera", abbreviation: "MT", code: 77 },
                { name: "Medio Campidano", abbreviation: "VS", code: 77 },
                { name: "Messina", abbreviation: "ME", code: 83 },
                { name: "Milano", abbreviation: "MI", code: 15 },
                { name: "Modena", abbreviation: "MO", code: 36 },
                { name: "Monza-Brianza", abbreviation: "MB", code: 36 },
                { name: "Napoli", abbreviation: "NA", code: 63 },
                { name: "Novara", abbreviation: "NO", code: 3 },
                { name: "Nuoro", abbreviation: "NU", code: 91 },
                { name: "Ogliastra", abbreviation: "OG", code: 91 },
                { name: "Olbia Tempio", abbreviation: "OT", code: 91 },
                { name: "Oristano", abbreviation: "OR", code: 95 },
                { name: "Padova", abbreviation: "PD", code: 28 },
                { name: "Palermo", abbreviation: "PA", code: 82 },
                { name: "Parma", abbreviation: "PR", code: 34 },
                { name: "Pavia", abbreviation: "PV", code: 18 },
                { name: "Perugia", abbreviation: "PG", code: 54 },
                { name: "Pesaro-Urbino", abbreviation: "PU", code: 41 },
                { name: "Pescara", abbreviation: "PE", code: 68 },
                { name: "Piacenza", abbreviation: "PC", code: 33 },
                { name: "Pisa", abbreviation: "PI", code: 50 },
                { name: "Pistoia", abbreviation: "PT", code: 47 },
                { name: "Pordenone", abbreviation: "PN", code: 93 },
                { name: "Potenza", abbreviation: "PZ", code: 76 },
                { name: "Prato", abbreviation: "PO", code: 100 },
                { name: "Ragusa", abbreviation: "RG", code: 88 },
                { name: "Ravenna", abbreviation: "RA", code: 39 },
                { name: "Reggio-Calabria", abbreviation: "RC", code: 35 },
                { name: "Reggio-Emilia", abbreviation: "RE", code: 35 },
                { name: "Rieti", abbreviation: "RI", code: 57 },
                { name: "Rimini", abbreviation: "RN", code: 99 },
                { name: "Roma", abbreviation: "Roma", code: 58 },
                { name: "Rovigo", abbreviation: "RO", code: 29 },
                { name: "Salerno", abbreviation: "SA", code: 65 },
                { name: "Sassari", abbreviation: "SS", code: 90 },
                { name: "Savona", abbreviation: "SV", code: 9 },
                { name: "Siena", abbreviation: "SI", code: 52 },
                { name: "Siracusa", abbreviation: "SR", code: 89 },
                { name: "Sondrio", abbreviation: "SO", code: 14 },
                { name: "Taranto", abbreviation: "TA", code: 73 },
                { name: "Teramo", abbreviation: "TE", code: 67 },
                { name: "Terni", abbreviation: "TR", code: 55 },
                { name: "Torino", abbreviation: "TO", code: 1 },
                { name: "Trapani", abbreviation: "TP", code: 81 },
                { name: "Trento", abbreviation: "TN", code: 22 },
                { name: "Treviso", abbreviation: "TV", code: 26 },
                { name: "Trieste", abbreviation: "TS", code: 32 },
                { name: "Udine", abbreviation: "UD", code: 30 },
                { name: "Varese", abbreviation: "VA", code: 12 },
                { name: "Venezia", abbreviation: "VE", code: 27 },
                { name: "Verbania", abbreviation: "VB", code: 27 },
                { name: "Vercelli", abbreviation: "VC", code: 2 },
                { name: "Verona", abbreviation: "VR", code: 23 },
                { name: "Vibo-Valentia", abbreviation: "VV", code: 102 },
                { name: "Vicenza", abbreviation: "VI", code: 24 },
                { name: "Viterbo", abbreviation: "VT", code: 56 }
            ]
        },

            // from: https://github.com/samsargent/Useful-Autocomplete-Data/blob/master/data/nationalities.json
        nationalities: [
           {name: 'Afghan'},
           {name: 'Albanian'},
           {name: 'Algerian'},
           {name: 'American'},
           {name: 'Andorran'},
           {name: 'Angolan'},
           {name: 'Antiguans'},
           {name: 'Argentinean'},
           {name: 'Armenian'},
           {name: 'Australian'},
           {name: 'Austrian'},
           {name: 'Azerbaijani'},
           {name: 'Bahami'},
           {name: 'Bahraini'},
           {name: 'Bangladeshi'},
           {name: 'Barbadian'},
           {name: 'Barbudans'},
           {name: 'Batswana'},
           {name: 'Belarusian'},
           {name: 'Belgian'},
           {name: 'Belizean'},
           {name: 'Beninese'},
           {name: 'Bhutanese'},
           {name: 'Bolivian'},
           {name: 'Bosnian'},
           {name: 'Brazilian'},
           {name: 'British'},
           {name: 'Bruneian'},
           {name: 'Bulgarian'},
           {name: 'Burkinabe'},
           {name: 'Burmese'},
           {name: 'Burundian'},
           {name: 'Cambodian'},
           {name: 'Cameroonian'},
           {name: 'Canadian'},
           {name: 'Cape Verdean'},
           {name: 'Central African'},
           {name: 'Chadian'},
           {name: 'Chilean'},
           {name: 'Chinese'},
           {name: 'Colombian'},
           {name: 'Comoran'},
           {name: 'Congolese'},
           {name: 'Costa Rican'},
           {name: 'Croatian'},
           {name: 'Cuban'},
           {name: 'Cypriot'},
           {name: 'Czech'},
           {name: 'Danish'},
           {name: 'Djibouti'},
           {name: 'Dominican'},
           {name: 'Dutch'},
           {name: 'East Timorese'},
           {name: 'Ecuadorean'},
           {name: 'Egyptian'},
           {name: 'Emirian'},
           {name: 'Equatorial Guinean'},
           {name: 'Eritrean'},
           {name: 'Estonian'},
           {name: 'Ethiopian'},
           {name: 'Fijian'},
           {name: 'Filipino'},
           {name: 'Finnish'},
           {name: 'French'},
           {name: 'Gabonese'},
           {name: 'Gambian'},
           {name: 'Georgian'},
           {name: 'German'},
           {name: 'Ghanaian'},
           {name: 'Greek'},
           {name: 'Grenadian'},
           {name: 'Guatemalan'},
           {name: 'Guinea-Bissauan'},
           {name: 'Guinean'},
           {name: 'Guyanese'},
           {name: 'Haitian'},
           {name: 'Herzegovinian'},
           {name: 'Honduran'},
           {name: 'Hungarian'},
           {name: 'I-Kiribati'},
           {name: 'Icelander'},
           {name: 'Indian'},
           {name: 'Indonesian'},
           {name: 'Iranian'},
           {name: 'Iraqi'},
           {name: 'Irish'},
           {name: 'Israeli'},
           {name: 'Italian'},
           {name: 'Ivorian'},
           {name: 'Jamaican'},
           {name: 'Japanese'},
           {name: 'Jordanian'},
           {name: 'Kazakhstani'},
           {name: 'Kenyan'},
           {name: 'Kittian and Nevisian'},
           {name: 'Kuwaiti'},
           {name: 'Kyrgyz'},
           {name: 'Laotian'},
           {name: 'Latvian'},
           {name: 'Lebanese'},
           {name: 'Liberian'},
           {name: 'Libyan'},
           {name: 'Liechtensteiner'},
           {name: 'Lithuanian'},
           {name: 'Luxembourger'},
           {name: 'Macedonian'},
           {name: 'Malagasy'},
           {name: 'Malawian'},
           {name: 'Malaysian'},
           {name: 'Maldivan'},
           {name: 'Malian'},
           {name: 'Maltese'},
           {name: 'Marshallese'},
           {name: 'Mauritanian'},
           {name: 'Mauritian'},
           {name: 'Mexican'},
           {name: 'Micronesian'},
           {name: 'Moldovan'},
           {name: 'Monacan'},
           {name: 'Mongolian'},
           {name: 'Moroccan'},
           {name: 'Mosotho'},
           {name: 'Motswana'},
           {name: 'Mozambican'},
           {name: 'Namibian'},
           {name: 'Nauruan'},
           {name: 'Nepalese'},
           {name: 'New Zealander'},
           {name: 'Nicaraguan'},
           {name: 'Nigerian'},
           {name: 'Nigerien'},
           {name: 'North Korean'},
           {name: 'Northern Irish'},
           {name: 'Norwegian'},
           {name: 'Omani'},
           {name: 'Pakistani'},
           {name: 'Palauan'},
           {name: 'Panamanian'},
           {name: 'Papua New Guinean'},
           {name: 'Paraguayan'},
           {name: 'Peruvian'},
           {name: 'Polish'},
           {name: 'Portuguese'},
           {name: 'Qatari'},
           {name: 'Romani'},
           {name: 'Russian'},
           {name: 'Rwandan'},
           {name: 'Saint Lucian'},
           {name: 'Salvadoran'},
           {name: 'Samoan'},
           {name: 'San Marinese'},
           {name: 'Sao Tomean'},
           {name: 'Saudi'},
           {name: 'Scottish'},
           {name: 'Senegalese'},
           {name: 'Serbian'},
           {name: 'Seychellois'},
           {name: 'Sierra Leonean'},
           {name: 'Singaporean'},
           {name: 'Slovakian'},
           {name: 'Slovenian'},
           {name: 'Solomon Islander'},
           {name: 'Somali'},
           {name: 'South African'},
           {name: 'South Korean'},
           {name: 'Spanish'},
           {name: 'Sri Lankan'},
           {name: 'Sudanese'},
           {name: 'Surinamer'},
           {name: 'Swazi'},
           {name: 'Swedish'},
           {name: 'Swiss'},
           {name: 'Syrian'},
           {name: 'Taiwanese'},
           {name: 'Tajik'},
           {name: 'Tanzanian'},
           {name: 'Thai'},
           {name: 'Togolese'},
           {name: 'Tongan'},
           {name: 'Trinidadian or Tobagonian'},
           {name: 'Tunisian'},
           {name: 'Turkish'},
           {name: 'Tuvaluan'},
           {name: 'Ugandan'},
           {name: 'Ukrainian'},
           {name: 'Uruguaya'},
           {name: 'Uzbekistani'},
           {name: 'Venezuela'},
           {name: 'Vietnamese'},
           {name: 'Wels'},
           {name: 'Yemenit'},
           {name: 'Zambia'},
           {name: 'Zimbabwe'},
        ],

        us_states_and_dc: [
            {name: 'Alabama', abbreviation: 'AL'},
            {name: 'Alaska', abbreviation: 'AK'},
            {name: 'Arizona', abbreviation: 'AZ'},
            {name: 'Arkansas', abbreviation: 'AR'},
            {name: 'California', abbreviation: 'CA'},
            {name: 'Colorado', abbreviation: 'CO'},
            {name: 'Connecticut', abbreviation: 'CT'},
            {name: 'Delaware', abbreviation: 'DE'},
            {name: 'District of Columbia', abbreviation: 'DC'},
            {name: 'Florida', abbreviation: 'FL'},
            {name: 'Georgia', abbreviation: 'GA'},
            {name: 'Hawaii', abbreviation: 'HI'},
            {name: 'Idaho', abbreviation: 'ID'},
            {name: 'Illinois', abbreviation: 'IL'},
            {name: 'Indiana', abbreviation: 'IN'},
            {name: 'Iowa', abbreviation: 'IA'},
            {name: 'Kansas', abbreviation: 'KS'},
            {name: 'Kentucky', abbreviation: 'KY'},
            {name: 'Louisiana', abbreviation: 'LA'},
            {name: 'Maine', abbreviation: 'ME'},
            {name: 'Maryland', abbreviation: 'MD'},
            {name: 'Massachusetts', abbreviation: 'MA'},
            {name: 'Michigan', abbreviation: 'MI'},
            {name: 'Minnesota', abbreviation: 'MN'},
            {name: 'Mississippi', abbreviation: 'MS'},
            {name: 'Missouri', abbreviation: 'MO'},
            {name: 'Montana', abbreviation: 'MT'},
            {name: 'Nebraska', abbreviation: 'NE'},
            {name: 'Nevada', abbreviation: 'NV'},
            {name: 'New Hampshire', abbreviation: 'NH'},
            {name: 'New Jersey', abbreviation: 'NJ'},
            {name: 'New Mexico', abbreviation: 'NM'},
            {name: 'New York', abbreviation: 'NY'},
            {name: 'North Carolina', abbreviation: 'NC'},
            {name: 'North Dakota', abbreviation: 'ND'},
            {name: 'Ohio', abbreviation: 'OH'},
            {name: 'Oklahoma', abbreviation: 'OK'},
            {name: 'Oregon', abbreviation: 'OR'},
            {name: 'Pennsylvania', abbreviation: 'PA'},
            {name: 'Rhode Island', abbreviation: 'RI'},
            {name: 'South Carolina', abbreviation: 'SC'},
            {name: 'South Dakota', abbreviation: 'SD'},
            {name: 'Tennessee', abbreviation: 'TN'},
            {name: 'Texas', abbreviation: 'TX'},
            {name: 'Utah', abbreviation: 'UT'},
            {name: 'Vermont', abbreviation: 'VT'},
            {name: 'Virginia', abbreviation: 'VA'},
            {name: 'Washington', abbreviation: 'WA'},
            {name: 'West Virginia', abbreviation: 'WV'},
            {name: 'Wisconsin', abbreviation: 'WI'},
            {name: 'Wyoming', abbreviation: 'WY'}
        ],

        territories: [
            {name: 'American Samoa', abbreviation: 'AS'},
            {name: 'Federated States of Micronesia', abbreviation: 'FM'},
            {name: 'Guam', abbreviation: 'GU'},
            {name: 'Marshall Islands', abbreviation: 'MH'},
            {name: 'Northern Mariana Islands', abbreviation: 'MP'},
            {name: 'Puerto Rico', abbreviation: 'PR'},
            {name: 'Virgin Islands, U.S.', abbreviation: 'VI'}
        ],

        armed_forces: [
            {name: 'Armed Forces Europe', abbreviation: 'AE'},
            {name: 'Armed Forces Pacific', abbreviation: 'AP'},
            {name: 'Armed Forces the Americas', abbreviation: 'AA'}
        ],

        country_regions: {
            it: [
                { name: "Valle d'Aosta", abbreviation: "VDA" },
                { name: "Piemonte", abbreviation: "PIE" },
                { name: "Lombardia", abbreviation: "LOM" },
                { name: "Veneto", abbreviation: "VEN" },
                { name: "Trentino Alto Adige", abbreviation: "TAA" },
                { name: "Friuli Venezia Giulia", abbreviation: "FVG" },
                { name: "Liguria", abbreviation: "LIG" },
                { name: "Emilia Romagna", abbreviation: "EMR" },
                { name: "Toscana", abbreviation: "TOS" },
                { name: "Umbria", abbreviation: "UMB" },
                { name: "Marche", abbreviation: "MAR" },
                { name: "Abruzzo", abbreviation: "ABR" },
                { name: "Lazio", abbreviation: "LAZ" },
                { name: "Campania", abbreviation: "CAM" },
                { name: "Puglia", abbreviation: "PUG" },
                { name: "Basilicata", abbreviation: "BAS" },
                { name: "Molise", abbreviation: "MOL" },
                { name: "Calabria", abbreviation: "CAL" },
                { name: "Sicilia", abbreviation: "SIC" },
                { name: "Sardegna", abbreviation: "SAR" }
            ]
        },

        street_suffixes: {
            'us': [
                {name: 'Avenue', abbreviation: 'Ave'},
                {name: 'Boulevard', abbreviation: 'Blvd'},
                {name: 'Center', abbreviation: 'Ctr'},
                {name: 'Circle', abbreviation: 'Cir'},
                {name: 'Court', abbreviation: 'Ct'},
                {name: 'Drive', abbreviation: 'Dr'},
                {name: 'Extension', abbreviation: 'Ext'},
                {name: 'Glen', abbreviation: 'Gln'},
                {name: 'Grove', abbreviation: 'Grv'},
                {name: 'Heights', abbreviation: 'Hts'},
                {name: 'Highway', abbreviation: 'Hwy'},
                {name: 'Junction', abbreviation: 'Jct'},
                {name: 'Key', abbreviation: 'Key'},
                {name: 'Lane', abbreviation: 'Ln'},
                {name: 'Loop', abbreviation: 'Loop'},
                {name: 'Manor', abbreviation: 'Mnr'},
                {name: 'Mill', abbreviation: 'Mill'},
                {name: 'Park', abbreviation: 'Park'},
                {name: 'Parkway', abbreviation: 'Pkwy'},
                {name: 'Pass', abbreviation: 'Pass'},
                {name: 'Path', abbreviation: 'Path'},
                {name: 'Pike', abbreviation: 'Pike'},
                {name: 'Place', abbreviation: 'Pl'},
                {name: 'Plaza', abbreviation: 'Plz'},
                {name: 'Point', abbreviation: 'Pt'},
                {name: 'Ridge', abbreviation: 'Rdg'},
                {name: 'River', abbreviation: 'Riv'},
                {name: 'Road', abbreviation: 'Rd'},
                {name: 'Square', abbreviation: 'Sq'},
                {name: 'Street', abbreviation: 'St'},
                {name: 'Terrace', abbreviation: 'Ter'},
                {name: 'Trail', abbreviation: 'Trl'},
                {name: 'Turnpike', abbreviation: 'Tpke'},
                {name: 'View', abbreviation: 'Vw'},
                {name: 'Way', abbreviation: 'Way'}
            ],
            'it': [
                { name: 'Accesso', abbreviation: 'Acc.' },
                { name: 'Alzaia', abbreviation: 'Alz.' },
                { name: 'Arco', abbreviation: 'Arco' },
                { name: 'Archivolto', abbreviation: 'Acv.' },
                { name: 'Arena', abbreviation: 'Arena' },
                { name: 'Argine', abbreviation: 'Argine' },
                { name: 'Bacino', abbreviation: 'Bacino' },
                { name: 'Banchi', abbreviation: 'Banchi' },
                { name: 'Banchina', abbreviation: 'Ban.' },
                { name: 'Bastioni', abbreviation: 'Bas.' },
                { name: 'Belvedere', abbreviation: 'Belv.' },
                { name: 'Borgata', abbreviation: 'B.ta' },
                { name: 'Borgo', abbreviation: 'B.go' },
                { name: 'Calata', abbreviation: 'Cal.' },
                { name: 'Calle', abbreviation: 'Calle' },
                { name: 'Campiello', abbreviation: 'Cam.' },
                { name: 'Campo', abbreviation: 'Cam.' },
                { name: 'Canale', abbreviation: 'Can.' },
                { name: 'Carraia', abbreviation: 'Carr.' },
                { name: 'Cascina', abbreviation: 'Cascina' },
                { name: 'Case sparse', abbreviation: 'c.s.' },
                { name: 'Cavalcavia', abbreviation: 'Cv.' },
                { name: 'Circonvallazione', abbreviation: 'Cv.' },
                { name: 'Complanare', abbreviation: 'C.re' },
                { name: 'Contrada', abbreviation: 'C.da' },
                { name: 'Corso', abbreviation: 'C.so' },
                { name: 'Corte', abbreviation: 'C.te' },
                { name: 'Cortile', abbreviation: 'C.le' },
                { name: 'Diramazione', abbreviation: 'Dir.' },
                { name: 'Fondaco', abbreviation: 'F.co' },
                { name: 'Fondamenta', abbreviation: 'F.ta' },
                { name: 'Fondo', abbreviation: 'F.do' },
                { name: 'Frazione', abbreviation: 'Fr.' },
                { name: 'Isola', abbreviation: 'Is.' },
                { name: 'Largo', abbreviation: 'L.go' },
                { name: 'Litoranea', abbreviation: 'Lit.' },
                { name: 'Lungolago', abbreviation: 'L.go lago' },
                { name: 'Lungo Po', abbreviation: 'l.go Po' },
                { name: 'Molo', abbreviation: 'Molo' },
                { name: 'Mura', abbreviation: 'Mura' },
                { name: 'Passaggio privato', abbreviation: 'pass. priv.' },
                { name: 'Passeggiata', abbreviation: 'Pass.' },
                { name: 'Piazza', abbreviation: 'P.zza' },
                { name: 'Piazzale', abbreviation: 'P.le' },
                { name: 'Ponte', abbreviation: 'P.te' },
                { name: 'Portico', abbreviation: 'P.co' },
                { name: 'Rampa', abbreviation: 'Rampa' },
                { name: 'Regione', abbreviation: 'Reg.' },
                { name: 'Rione', abbreviation: 'R.ne' },
                { name: 'Rio', abbreviation: 'Rio' },
                { name: 'Ripa', abbreviation: 'Ripa' },
                { name: 'Riva', abbreviation: 'Riva' },
                { name: 'Rondò', abbreviation: 'Rondò' },
                { name: 'Rotonda', abbreviation: 'Rot.' },
                { name: 'Sagrato', abbreviation: 'Sagr.' },
                { name: 'Salita', abbreviation: 'Sal.' },
                { name: 'Scalinata', abbreviation: 'Scal.' },
                { name: 'Scalone', abbreviation: 'Scal.' },
                { name: 'Slargo', abbreviation: 'Sl.' },
                { name: 'Sottoportico', abbreviation: 'Sott.' },
                { name: 'Strada', abbreviation: 'Str.' },
                { name: 'Stradale', abbreviation: 'Str.le' },
                { name: 'Strettoia', abbreviation: 'Strett.' },
                { name: 'Traversa', abbreviation: 'Trav.' },
                { name: 'Via', abbreviation: 'V.' },
                { name: 'Viale', abbreviation: 'V.le' },
                { name: 'Vicinale', abbreviation: 'Vic.le' },
                { name: 'Vicolo', abbreviation: 'Vic.' }
            ]
        },

        months: [
            {name: 'January', short_name: 'Jan', numeric: '01', days: 31},
            // Not messing with leap years...
            {name: 'February', short_name: 'Feb', numeric: '02', days: 28},
            {name: 'March', short_name: 'Mar', numeric: '03', days: 31},
            {name: 'April', short_name: 'Apr', numeric: '04', days: 30},
            {name: 'May', short_name: 'May', numeric: '05', days: 31},
            {name: 'June', short_name: 'Jun', numeric: '06', days: 30},
            {name: 'July', short_name: 'Jul', numeric: '07', days: 31},
            {name: 'August', short_name: 'Aug', numeric: '08', days: 31},
            {name: 'September', short_name: 'Sep', numeric: '09', days: 30},
            {name: 'October', short_name: 'Oct', numeric: '10', days: 31},
            {name: 'November', short_name: 'Nov', numeric: '11', days: 30},
            {name: 'December', short_name: 'Dec', numeric: '12', days: 31}
        ],

        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        cc_types: [
            {name: "American Express", short_name: 'amex', prefix: '34', length: 15},
            {name: "Bankcard", short_name: 'bankcard', prefix: '5610', length: 16},
            {name: "China UnionPay", short_name: 'chinaunion', prefix: '62', length: 16},
            {name: "Diners Club Carte Blanche", short_name: 'dccarte', prefix: '300', length: 14},
            {name: "Diners Club enRoute", short_name: 'dcenroute', prefix: '2014', length: 15},
            {name: "Diners Club International", short_name: 'dcintl', prefix: '36', length: 14},
            {name: "Diners Club United States & Canada", short_name: 'dcusc', prefix: '54', length: 16},
            {name: "Discover Card", short_name: 'discover', prefix: '6011', length: 16},
            {name: "InstaPayment", short_name: 'instapay', prefix: '637', length: 16},
            {name: "JCB", short_name: 'jcb', prefix: '3528', length: 16},
            {name: "Laser", short_name: 'laser', prefix: '6304', length: 16},
            {name: "Maestro", short_name: 'maestro', prefix: '5018', length: 16},
            {name: "Mastercard", short_name: 'mc', prefix: '51', length: 16},
            {name: "Solo", short_name: 'solo', prefix: '6334', length: 16},
            {name: "Switch", short_name: 'switch', prefix: '4903', length: 16},
            {name: "Visa", short_name: 'visa', prefix: '4', length: 16},
            {name: "Visa Electron", short_name: 'electron', prefix: '4026', length: 16}
        ],

        //return all world currency by ISO 4217
        currency_types: [
            {'code' : 'AED', 'name' : 'United Arab Emirates Dirham'},
            {'code' : 'AFN', 'name' : 'Afghanistan Afghani'},
            {'code' : 'ALL', 'name' : 'Albania Lek'},
            {'code' : 'AMD', 'name' : 'Armenia Dram'},
            {'code' : 'ANG', 'name' : 'Netherlands Antilles Guilder'},
            {'code' : 'AOA', 'name' : 'Angola Kwanza'},
            {'code' : 'ARS', 'name' : 'Argentina Peso'},
            {'code' : 'AUD', 'name' : 'Australia Dollar'},
            {'code' : 'AWG', 'name' : 'Aruba Guilder'},
            {'code' : 'AZN', 'name' : 'Azerbaijan New Manat'},
            {'code' : 'BAM', 'name' : 'Bosnia and Herzegovina Convertible Marka'},
            {'code' : 'BBD', 'name' : 'Barbados Dollar'},
            {'code' : 'BDT', 'name' : 'Bangladesh Taka'},
            {'code' : 'BGN', 'name' : 'Bulgaria Lev'},
            {'code' : 'BHD', 'name' : 'Bahrain Dinar'},
            {'code' : 'BIF', 'name' : 'Burundi Franc'},
            {'code' : 'BMD', 'name' : 'Bermuda Dollar'},
            {'code' : 'BND', 'name' : 'Brunei Darussalam Dollar'},
            {'code' : 'BOB', 'name' : 'Bolivia Boliviano'},
            {'code' : 'BRL', 'name' : 'Brazil Real'},
            {'code' : 'BSD', 'name' : 'Bahamas Dollar'},
            {'code' : 'BTN', 'name' : 'Bhutan Ngultrum'},
            {'code' : 'BWP', 'name' : 'Botswana Pula'},
            {'code' : 'BYR', 'name' : 'Belarus Ruble'},
            {'code' : 'BZD', 'name' : 'Belize Dollar'},
            {'code' : 'CAD', 'name' : 'Canada Dollar'},
            {'code' : 'CDF', 'name' : 'Congo/Kinshasa Franc'},
            {'code' : 'CHF', 'name' : 'Switzerland Franc'},
            {'code' : 'CLP', 'name' : 'Chile Peso'},
            {'code' : 'CNY', 'name' : 'China Yuan Renminbi'},
            {'code' : 'COP', 'name' : 'Colombia Peso'},
            {'code' : 'CRC', 'name' : 'Costa Rica Colon'},
            {'code' : 'CUC', 'name' : 'Cuba Convertible Peso'},
            {'code' : 'CUP', 'name' : 'Cuba Peso'},
            {'code' : 'CVE', 'name' : 'Cape Verde Escudo'},
            {'code' : 'CZK', 'name' : 'Czech Republic Koruna'},
            {'code' : 'DJF', 'name' : 'Djibouti Franc'},
            {'code' : 'DKK', 'name' : 'Denmark Krone'},
            {'code' : 'DOP', 'name' : 'Dominican Republic Peso'},
            {'code' : 'DZD', 'name' : 'Algeria Dinar'},
            {'code' : 'EGP', 'name' : 'Egypt Pound'},
            {'code' : 'ERN', 'name' : 'Eritrea Nakfa'},
            {'code' : 'ETB', 'name' : 'Ethiopia Birr'},
            {'code' : 'EUR', 'name' : 'Euro Member Countries'},
            {'code' : 'FJD', 'name' : 'Fiji Dollar'},
            {'code' : 'FKP', 'name' : 'Falkland Islands (Malvinas) Pound'},
            {'code' : 'GBP', 'name' : 'United Kingdom Pound'},
            {'code' : 'GEL', 'name' : 'Georgia Lari'},
            {'code' : 'GGP', 'name' : 'Guernsey Pound'},
            {'code' : 'GHS', 'name' : 'Ghana Cedi'},
            {'code' : 'GIP', 'name' : 'Gibraltar Pound'},
            {'code' : 'GMD', 'name' : 'Gambia Dalasi'},
            {'code' : 'GNF', 'name' : 'Guinea Franc'},
            {'code' : 'GTQ', 'name' : 'Guatemala Quetzal'},
            {'code' : 'GYD', 'name' : 'Guyana Dollar'},
            {'code' : 'HKD', 'name' : 'Hong Kong Dollar'},
            {'code' : 'HNL', 'name' : 'Honduras Lempira'},
            {'code' : 'HRK', 'name' : 'Croatia Kuna'},
            {'code' : 'HTG', 'name' : 'Haiti Gourde'},
            {'code' : 'HUF', 'name' : 'Hungary Forint'},
            {'code' : 'IDR', 'name' : 'Indonesia Rupiah'},
            {'code' : 'ILS', 'name' : 'Israel Shekel'},
            {'code' : 'IMP', 'name' : 'Isle of Man Pound'},
            {'code' : 'INR', 'name' : 'India Rupee'},
            {'code' : 'IQD', 'name' : 'Iraq Dinar'},
            {'code' : 'IRR', 'name' : 'Iran Rial'},
            {'code' : 'ISK', 'name' : 'Iceland Krona'},
            {'code' : 'JEP', 'name' : 'Jersey Pound'},
            {'code' : 'JMD', 'name' : 'Jamaica Dollar'},
            {'code' : 'JOD', 'name' : 'Jordan Dinar'},
            {'code' : 'JPY', 'name' : 'Japan Yen'},
            {'code' : 'KES', 'name' : 'Kenya Shilling'},
            {'code' : 'KGS', 'name' : 'Kyrgyzstan Som'},
            {'code' : 'KHR', 'name' : 'Cambodia Riel'},
            {'code' : 'KMF', 'name' : 'Comoros Franc'},
            {'code' : 'KPW', 'name' : 'Korea (North) Won'},
            {'code' : 'KRW', 'name' : 'Korea (South) Won'},
            {'code' : 'KWD', 'name' : 'Kuwait Dinar'},
            {'code' : 'KYD', 'name' : 'Cayman Islands Dollar'},
            {'code' : 'KZT', 'name' : 'Kazakhstan Tenge'},
            {'code' : 'LAK', 'name' : 'Laos Kip'},
            {'code' : 'LBP', 'name' : 'Lebanon Pound'},
            {'code' : 'LKR', 'name' : 'Sri Lanka Rupee'},
            {'code' : 'LRD', 'name' : 'Liberia Dollar'},
            {'code' : 'LSL', 'name' : 'Lesotho Loti'},
            {'code' : 'LTL', 'name' : 'Lithuania Litas'},
            {'code' : 'LYD', 'name' : 'Libya Dinar'},
            {'code' : 'MAD', 'name' : 'Morocco Dirham'},
            {'code' : 'MDL', 'name' : 'Moldova Leu'},
            {'code' : 'MGA', 'name' : 'Madagascar Ariary'},
            {'code' : 'MKD', 'name' : 'Macedonia Denar'},
            {'code' : 'MMK', 'name' : 'Myanmar (Burma) Kyat'},
            {'code' : 'MNT', 'name' : 'Mongolia Tughrik'},
            {'code' : 'MOP', 'name' : 'Macau Pataca'},
            {'code' : 'MRO', 'name' : 'Mauritania Ouguiya'},
            {'code' : 'MUR', 'name' : 'Mauritius Rupee'},
            {'code' : 'MVR', 'name' : 'Maldives (Maldive Islands) Rufiyaa'},
            {'code' : 'MWK', 'name' : 'Malawi Kwacha'},
            {'code' : 'MXN', 'name' : 'Mexico Peso'},
            {'code' : 'MYR', 'name' : 'Malaysia Ringgit'},
            {'code' : 'MZN', 'name' : 'Mozambique Metical'},
            {'code' : 'NAD', 'name' : 'Namibia Dollar'},
            {'code' : 'NGN', 'name' : 'Nigeria Naira'},
            {'code' : 'NIO', 'name' : 'Nicaragua Cordoba'},
            {'code' : 'NOK', 'name' : 'Norway Krone'},
            {'code' : 'NPR', 'name' : 'Nepal Rupee'},
            {'code' : 'NZD', 'name' : 'New Zealand Dollar'},
            {'code' : 'OMR', 'name' : 'Oman Rial'},
            {'code' : 'PAB', 'name' : 'Panama Balboa'},
            {'code' : 'PEN', 'name' : 'Peru Nuevo Sol'},
            {'code' : 'PGK', 'name' : 'Papua New Guinea Kina'},
            {'code' : 'PHP', 'name' : 'Philippines Peso'},
            {'code' : 'PKR', 'name' : 'Pakistan Rupee'},
            {'code' : 'PLN', 'name' : 'Poland Zloty'},
            {'code' : 'PYG', 'name' : 'Paraguay Guarani'},
            {'code' : 'QAR', 'name' : 'Qatar Riyal'},
            {'code' : 'RON', 'name' : 'Romania New Leu'},
            {'code' : 'RSD', 'name' : 'Serbia Dinar'},
            {'code' : 'RUB', 'name' : 'Russia Ruble'},
            {'code' : 'RWF', 'name' : 'Rwanda Franc'},
            {'code' : 'SAR', 'name' : 'Saudi Arabia Riyal'},
            {'code' : 'SBD', 'name' : 'Solomon Islands Dollar'},
            {'code' : 'SCR', 'name' : 'Seychelles Rupee'},
            {'code' : 'SDG', 'name' : 'Sudan Pound'},
            {'code' : 'SEK', 'name' : 'Sweden Krona'},
            {'code' : 'SGD', 'name' : 'Singapore Dollar'},
            {'code' : 'SHP', 'name' : 'Saint Helena Pound'},
            {'code' : 'SLL', 'name' : 'Sierra Leone Leone'},
            {'code' : 'SOS', 'name' : 'Somalia Shilling'},
            {'code' : 'SPL', 'name' : 'Seborga Luigino'},
            {'code' : 'SRD', 'name' : 'Suriname Dollar'},
            {'code' : 'STD', 'name' : 'São Tomé and Príncipe Dobra'},
            {'code' : 'SVC', 'name' : 'El Salvador Colon'},
            {'code' : 'SYP', 'name' : 'Syria Pound'},
            {'code' : 'SZL', 'name' : 'Swaziland Lilangeni'},
            {'code' : 'THB', 'name' : 'Thailand Baht'},
            {'code' : 'TJS', 'name' : 'Tajikistan Somoni'},
            {'code' : 'TMT', 'name' : 'Turkmenistan Manat'},
            {'code' : 'TND', 'name' : 'Tunisia Dinar'},
            {'code' : 'TOP', 'name' : 'Tonga Pa\'anga'},
            {'code' : 'TRY', 'name' : 'Turkey Lira'},
            {'code' : 'TTD', 'name' : 'Trinidad and Tobago Dollar'},
            {'code' : 'TVD', 'name' : 'Tuvalu Dollar'},
            {'code' : 'TWD', 'name' : 'Taiwan New Dollar'},
            {'code' : 'TZS', 'name' : 'Tanzania Shilling'},
            {'code' : 'UAH', 'name' : 'Ukraine Hryvnia'},
            {'code' : 'UGX', 'name' : 'Uganda Shilling'},
            {'code' : 'USD', 'name' : 'United States Dollar'},
            {'code' : 'UYU', 'name' : 'Uruguay Peso'},
            {'code' : 'UZS', 'name' : 'Uzbekistan Som'},
            {'code' : 'VEF', 'name' : 'Venezuela Bolivar'},
            {'code' : 'VND', 'name' : 'Viet Nam Dong'},
            {'code' : 'VUV', 'name' : 'Vanuatu Vatu'},
            {'code' : 'WST', 'name' : 'Samoa Tala'},
            {'code' : 'XAF', 'name' : 'Communauté Financière Africaine (BEAC) CFA Franc BEAC'},
            {'code' : 'XCD', 'name' : 'East Caribbean Dollar'},
            {'code' : 'XDR', 'name' : 'International Monetary Fund (IMF) Special Drawing Rights'},
            {'code' : 'XOF', 'name' : 'Communauté Financière Africaine (BCEAO) Franc'},
            {'code' : 'XPF', 'name' : 'Comptoirs Français du Pacifique (CFP) Franc'},
            {'code' : 'YER', 'name' : 'Yemen Rial'},
            {'code' : 'ZAR', 'name' : 'South Africa Rand'},
            {'code' : 'ZMW', 'name' : 'Zambia Kwacha'},
            {'code' : 'ZWD', 'name' : 'Zimbabwe Dollar'}
        ],

        // return the names of all valide colors
        colorNames : [  "AliceBlue", "Black", "Navy", "DarkBlue", "MediumBlue", "Blue", "DarkGreen", "Green", "Teal", "DarkCyan", "DeepSkyBlue", "DarkTurquoise", "MediumSpringGreen", "Lime", "SpringGreen",
            "Aqua", "Cyan", "MidnightBlue", "DodgerBlue", "LightSeaGreen", "ForestGreen", "SeaGreen", "DarkSlateGray", "LimeGreen", "MediumSeaGreen", "Turquoise", "RoyalBlue", "SteelBlue", "DarkSlateBlue", "MediumTurquoise",
            "Indigo", "DarkOliveGreen", "CadetBlue", "CornflowerBlue", "RebeccaPurple", "MediumAquaMarine", "DimGray", "SlateBlue", "OliveDrab", "SlateGray", "LightSlateGray", "MediumSlateBlue", "LawnGreen", "Chartreuse",
            "Aquamarine", "Maroon", "Purple", "Olive", "Gray", "SkyBlue", "LightSkyBlue", "BlueViolet", "DarkRed", "DarkMagenta", "SaddleBrown", "Ivory", "White",
            "DarkSeaGreen", "LightGreen", "MediumPurple", "DarkViolet", "PaleGreen", "DarkOrchid", "YellowGreen", "Sienna", "Brown", "DarkGray", "LightBlue", "GreenYellow", "PaleTurquoise", "LightSteelBlue", "PowderBlue",
            "FireBrick", "DarkGoldenRod", "MediumOrchid", "RosyBrown", "DarkKhaki", "Silver", "MediumVioletRed", "IndianRed", "Peru", "Chocolate", "Tan", "LightGray", "Thistle", "Orchid", "GoldenRod", "PaleVioletRed",
            "Crimson", "Gainsboro", "Plum", "BurlyWood", "LightCyan", "Lavender", "DarkSalmon", "Violet", "PaleGoldenRod", "LightCoral", "Khaki", "AliceBlue", "HoneyDew", "Azure", "SandyBrown", "Wheat", "Beige", "WhiteSmoke",
            "MintCream", "GhostWhite", "Salmon", "AntiqueWhite", "Linen", "LightGoldenRodYellow", "OldLace", "Red", "Fuchsia", "Magenta", "DeepPink", "OrangeRed", "Tomato", "HotPink", "Coral", "DarkOrange", "LightSalmon", "Orange",
            "LightPink", "Pink", "Gold", "PeachPuff", "NavajoWhite", "Moccasin", "Bisque", "MistyRose", "BlanchedAlmond", "PapayaWhip", "LavenderBlush", "SeaShell", "Cornsilk", "LemonChiffon", "FloralWhite", "Snow", "Yellow", "LightYellow"
        ],

        fileExtension : {
            "raster"    : ["bmp", "gif", "gpl", "ico", "jpeg", "psd", "png", "psp", "raw", "tiff"],
            "vector"    : ["3dv", "amf", "awg", "ai", "cgm", "cdr", "cmx", "dxf", "e2d", "egt", "eps", "fs", "odg", "svg", "xar"],
            "3d"        : ["3dmf", "3dm", "3mf", "3ds", "an8", "aoi", "blend", "cal3d", "cob", "ctm", "iob", "jas", "max", "mb", "mdx", "obj", "x", "x3d"],
            "document"  : ["doc", "docx", "dot", "html", "xml", "odt", "odm", "ott", "csv", "rtf", "tex", "xhtml", "xps"]
        },

        // Data taken from https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
        timezones: [
                  {
                    "name": "Dateline Standard Time",
                    "abbr": "DST",
                    "offset": -12,
                    "isdst": false,
                    "text": "(UTC-12:00) International Date Line West",
                    "utc": [
                      "Etc/GMT+12"
                    ]
                  },
                  {
                    "name": "UTC-11",
                    "abbr": "U",
                    "offset": -11,
                    "isdst": false,
                    "text": "(UTC-11:00) Coordinated Universal Time-11",
                    "utc": [
                      "Etc/GMT+11",
                      "Pacific/Midway",
                      "Pacific/Niue",
                      "Pacific/Pago_Pago"
                    ]
                  },
                  {
                    "name": "Hawaiian Standard Time",
                    "abbr": "HST",
                    "offset": -10,
                    "isdst": false,
                    "text": "(UTC-10:00) Hawaii",
                    "utc": [
                      "Etc/GMT+10",
                      "Pacific/Honolulu",
                      "Pacific/Johnston",
                      "Pacific/Rarotonga",
                      "Pacific/Tahiti"
                    ]
                  },
                  {
                    "name": "Alaskan Standard Time",
                    "abbr": "AKDT",
                    "offset": -8,
                    "isdst": true,
                    "text": "(UTC-09:00) Alaska",
                    "utc": [
                      "America/Anchorage",
                      "America/Juneau",
                      "America/Nome",
                      "America/Sitka",
                      "America/Yakutat"
                    ]
                  },
                  {
                    "name": "Pacific Standard Time (Mexico)",
                    "abbr": "PDT",
                    "offset": -7,
                    "isdst": true,
                    "text": "(UTC-08:00) Baja California",
                    "utc": [
                      "America/Santa_Isabel"
                    ]
                  },
                  {
                    "name": "Pacific Standard Time",
                    "abbr": "PDT",
                    "offset": -7,
                    "isdst": true,
                    "text": "(UTC-08:00) Pacific Time (US & Canada)",
                    "utc": [
                      "America/Dawson",
                      "America/Los_Angeles",
                      "America/Tijuana",
                      "America/Vancouver",
                      "America/Whitehorse",
                      "PST8PDT"
                    ]
                  },
                  {
                    "name": "US Mountain Standard Time",
                    "abbr": "UMST",
                    "offset": -7,
                    "isdst": false,
                    "text": "(UTC-07:00) Arizona",
                    "utc": [
                      "America/Creston",
                      "America/Dawson_Creek",
                      "America/Hermosillo",
                      "America/Phoenix",
                      "Etc/GMT+7"
                    ]
                  },
                  {
                    "name": "Mountain Standard Time (Mexico)",
                    "abbr": "MDT",
                    "offset": -6,
                    "isdst": true,
                    "text": "(UTC-07:00) Chihuahua, La Paz, Mazatlan",
                    "utc": [
                      "America/Chihuahua",
                      "America/Mazatlan"
                    ]
                  },
                  {
                    "name": "Mountain Standard Time",
                    "abbr": "MDT",
                    "offset": -6,
                    "isdst": true,
                    "text": "(UTC-07:00) Mountain Time (US & Canada)",
                    "utc": [
                      "America/Boise",
                      "America/Cambridge_Bay",
                      "America/Denver",
                      "America/Edmonton",
                      "America/Inuvik",
                      "America/Ojinaga",
                      "America/Yellowknife",
                      "MST7MDT"
                    ]
                  },
                  {
                    "name": "Central America Standard Time",
                    "abbr": "CAST",
                    "offset": -6,
                    "isdst": false,
                    "text": "(UTC-06:00) Central America",
                    "utc": [
                      "America/Belize",
                      "America/Costa_Rica",
                      "America/El_Salvador",
                      "America/Guatemala",
                      "America/Managua",
                      "America/Tegucigalpa",
                      "Etc/GMT+6",
                      "Pacific/Galapagos"
                    ]
                  },
                  {
                    "name": "Central Standard Time",
                    "abbr": "CDT",
                    "offset": -5,
                    "isdst": true,
                    "text": "(UTC-06:00) Central Time (US & Canada)",
                    "utc": [
                      "America/Chicago",
                      "America/Indiana/Knox",
                      "America/Indiana/Tell_City",
                      "America/Matamoros",
                      "America/Menominee",
                      "America/North_Dakota/Beulah",
                      "America/North_Dakota/Center",
                      "America/North_Dakota/New_Salem",
                      "America/Rainy_River",
                      "America/Rankin_Inlet",
                      "America/Resolute",
                      "America/Winnipeg",
                      "CST6CDT"
                    ]
                  },
                  {
                    "name": "Central Standard Time (Mexico)",
                    "abbr": "CDT",
                    "offset": -5,
                    "isdst": true,
                    "text": "(UTC-06:00) Guadalajara, Mexico City, Monterrey",
                    "utc": [
                      "America/Bahia_Banderas",
                      "America/Cancun",
                      "America/Merida",
                      "America/Mexico_City",
                      "America/Monterrey"
                    ]
                  },
                  {
                    "name": "Canada Central Standard Time",
                    "abbr": "CCST",
                    "offset": -6,
                    "isdst": false,
                    "text": "(UTC-06:00) Saskatchewan",
                    "utc": [
                      "America/Regina",
                      "America/Swift_Current"
                    ]
                  },
                  {
                    "name": "SA Pacific Standard Time",
                    "abbr": "SPST",
                    "offset": -5,
                    "isdst": false,
                    "text": "(UTC-05:00) Bogota, Lima, Quito",
                    "utc": [
                      "America/Bogota",
                      "America/Cayman",
                      "America/Coral_Harbour",
                      "America/Eirunepe",
                      "America/Guayaquil",
                      "America/Jamaica",
                      "America/Lima",
                      "America/Panama",
                      "America/Rio_Branco",
                      "Etc/GMT+5"
                    ]
                  },
                  {
                    "name": "Eastern Standard Time",
                    "abbr": "EDT",
                    "offset": -4,
                    "isdst": true,
                    "text": "(UTC-05:00) Eastern Time (US & Canada)",
                    "utc": [
                      "America/Detroit",
                      "America/Havana",
                      "America/Indiana/Petersburg",
                      "America/Indiana/Vincennes",
                      "America/Indiana/Winamac",
                      "America/Iqaluit",
                      "America/Kentucky/Monticello",
                      "America/Louisville",
                      "America/Montreal",
                      "America/Nassau",
                      "America/New_York",
                      "America/Nipigon",
                      "America/Pangnirtung",
                      "America/Port-au-Prince",
                      "America/Thunder_Bay",
                      "America/Toronto",
                      "EST5EDT"
                    ]
                  },
                  {
                    "name": "US Eastern Standard Time",
                    "abbr": "UEDT",
                    "offset": -4,
                    "isdst": true,
                    "text": "(UTC-05:00) Indiana (East)",
                    "utc": [
                      "America/Indiana/Marengo",
                      "America/Indiana/Vevay",
                      "America/Indianapolis"
                    ]
                  },
                  {
                    "name": "Venezuela Standard Time",
                    "abbr": "VST",
                    "offset": -4.5,
                    "isdst": false,
                    "text": "(UTC-04:30) Caracas",
                    "utc": [
                      "America/Caracas"
                    ]
                  },
                  {
                    "name": "Paraguay Standard Time",
                    "abbr": "PST",
                    "offset": -4,
                    "isdst": false,
                    "text": "(UTC-04:00) Asuncion",
                    "utc": [
                      "America/Asuncion"
                    ]
                  },
                  {
                    "name": "Atlantic Standard Time",
                    "abbr": "ADT",
                    "offset": -3,
                    "isdst": true,
                    "text": "(UTC-04:00) Atlantic Time (Canada)",
                    "utc": [
                      "America/Glace_Bay",
                      "America/Goose_Bay",
                      "America/Halifax",
                      "America/Moncton",
                      "America/Thule",
                      "Atlantic/Bermuda"
                    ]
                  },
                  {
                    "name": "Central Brazilian Standard Time",
                    "abbr": "CBST",
                    "offset": -4,
                    "isdst": false,
                    "text": "(UTC-04:00) Cuiaba",
                    "utc": [
                      "America/Campo_Grande",
                      "America/Cuiaba"
                    ]
                  },
                  {
                    "name": "SA Western Standard Time",
                    "abbr": "SWST",
                    "offset": -4,
                    "isdst": false,
                    "text": "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan",
                    "utc": [
                      "America/Anguilla",
                      "America/Antigua",
                      "America/Aruba",
                      "America/Barbados",
                      "America/Blanc-Sablon",
                      "America/Boa_Vista",
                      "America/Curacao",
                      "America/Dominica",
                      "America/Grand_Turk",
                      "America/Grenada",
                      "America/Guadeloupe",
                      "America/Guyana",
                      "America/Kralendijk",
                      "America/La_Paz",
                      "America/Lower_Princes",
                      "America/Manaus",
                      "America/Marigot",
                      "America/Martinique",
                      "America/Montserrat",
                      "America/Port_of_Spain",
                      "America/Porto_Velho",
                      "America/Puerto_Rico",
                      "America/Santo_Domingo",
                      "America/St_Barthelemy",
                      "America/St_Kitts",
                      "America/St_Lucia",
                      "America/St_Thomas",
                      "America/St_Vincent",
                      "America/Tortola",
                      "Etc/GMT+4"
                    ]
                  },
                  {
                    "name": "Pacific SA Standard Time",
                    "abbr": "PSST",
                    "offset": -4,
                    "isdst": false,
                    "text": "(UTC-04:00) Santiago",
                    "utc": [
                      "America/Santiago",
                      "Antarctica/Palmer"
                    ]
                  },
                  {
                    "name": "Newfoundland Standard Time",
                    "abbr": "NDT",
                    "offset": -2.5,
                    "isdst": true,
                    "text": "(UTC-03:30) Newfoundland",
                    "utc": [
                      "America/St_Johns"
                    ]
                  },
                  {
                    "name": "E. South America Standard Time",
                    "abbr": "ESAST",
                    "offset": -3,
                    "isdst": false,
                    "text": "(UTC-03:00) Brasilia",
                    "utc": [
                      "America/Sao_Paulo"
                    ]
                  },
                  {
                    "name": "Argentina Standard Time",
                    "abbr": "AST",
                    "offset": -3,
                    "isdst": false,
                    "text": "(UTC-03:00) Buenos Aires",
                    "utc": [
                      "America/Argentina/La_Rioja",
                      "America/Argentina/Rio_Gallegos",
                      "America/Argentina/Salta",
                      "America/Argentina/San_Juan",
                      "America/Argentina/San_Luis",
                      "America/Argentina/Tucuman",
                      "America/Argentina/Ushuaia",
                      "America/Buenos_Aires",
                      "America/Catamarca",
                      "America/Cordoba",
                      "America/Jujuy",
                      "America/Mendoza"
                    ]
                  },
                  {
                    "name": "SA Eastern Standard Time",
                    "abbr": "SEST",
                    "offset": -3,
                    "isdst": false,
                    "text": "(UTC-03:00) Cayenne, Fortaleza",
                    "utc": [
                      "America/Araguaina",
                      "America/Belem",
                      "America/Cayenne",
                      "America/Fortaleza",
                      "America/Maceio",
                      "America/Paramaribo",
                      "America/Recife",
                      "America/Santarem",
                      "Antarctica/Rothera",
                      "Atlantic/Stanley",
                      "Etc/GMT+3"
                    ]
                  },
                  {
                    "name": "Greenland Standard Time",
                    "abbr": "GDT",
                    "offset": -2,
                    "isdst": true,
                    "text": "(UTC-03:00) Greenland",
                    "utc": [
                      "America/Godthab"
                    ]
                  },
                  {
                    "name": "Montevideo Standard Time",
                    "abbr": "MST",
                    "offset": -3,
                    "isdst": false,
                    "text": "(UTC-03:00) Montevideo",
                    "utc": [
                      "America/Montevideo"
                    ]
                  },
                  {
                    "name": "Bahia Standard Time",
                    "abbr": "BST",
                    "offset": -3,
                    "isdst": false,
                    "text": "(UTC-03:00) Salvador",
                    "utc": [
                      "America/Bahia"
                    ]
                  },
                  {
                    "name": "UTC-02",
                    "abbr": "U",
                    "offset": -2,
                    "isdst": false,
                    "text": "(UTC-02:00) Coordinated Universal Time-02",
                    "utc": [
                      "America/Noronha",
                      "Atlantic/South_Georgia",
                      "Etc/GMT+2"
                    ]
                  },
                  {
                    "name": "Mid-Atlantic Standard Time",
                    "abbr": "MDT",
                    "offset": -1,
                    "isdst": true,
                    "text": "(UTC-02:00) Mid-Atlantic - Old"
                  },
                  {
                    "name": "Azores Standard Time",
                    "abbr": "ADT",
                    "offset": 0,
                    "isdst": true,
                    "text": "(UTC-01:00) Azores",
                    "utc": [
                      "America/Scoresbysund",
                      "Atlantic/Azores"
                    ]
                  },
                  {
                    "name": "Cape Verde Standard Time",
                    "abbr": "CVST",
                    "offset": -1,
                    "isdst": false,
                    "text": "(UTC-01:00) Cape Verde Is.",
                    "utc": [
                      "Atlantic/Cape_Verde",
                      "Etc/GMT+1"
                    ]
                  },
                  {
                    "name": "Morocco Standard Time",
                    "abbr": "MDT",
                    "offset": 1,
                    "isdst": true,
                    "text": "(UTC) Casablanca",
                    "utc": [
                      "Africa/Casablanca",
                      "Africa/El_Aaiun"
                    ]
                  },
                  {
                    "name": "UTC",
                    "abbr": "CUT",
                    "offset": 0,
                    "isdst": false,
                    "text": "(UTC) Coordinated Universal Time",
                    "utc": [
                      "America/Danmarkshavn",
                      "Etc/GMT"
                    ]
                  },
                  {
                    "name": "GMT Standard Time",
                    "abbr": "GDT",
                    "offset": 1,
                    "isdst": true,
                    "text": "(UTC) Dublin, Edinburgh, Lisbon, London",
                    "utc": [
                      "Atlantic/Canary",
                      "Atlantic/Faeroe",
                      "Atlantic/Madeira",
                      "Europe/Dublin",
                      "Europe/Guernsey",
                      "Europe/Isle_of_Man",
                      "Europe/Jersey",
                      "Europe/Lisbon",
                      "Europe/London"
                    ]
                  },
                  {
                    "name": "Greenwich Standard Time",
                    "abbr": "GST",
                    "offset": 0,
                    "isdst": false,
                    "text": "(UTC) Monrovia, Reykjavik",
                    "utc": [
                      "Africa/Abidjan",
                      "Africa/Accra",
                      "Africa/Bamako",
                      "Africa/Banjul",
                      "Africa/Bissau",
                      "Africa/Conakry",
                      "Africa/Dakar",
                      "Africa/Freetown",
                      "Africa/Lome",
                      "Africa/Monrovia",
                      "Africa/Nouakchott",
                      "Africa/Ouagadougou",
                      "Africa/Sao_Tome",
                      "Atlantic/Reykjavik",
                      "Atlantic/St_Helena"
                    ]
                  },
                  {
                    "name": "W. Europe Standard Time",
                    "abbr": "WEDT",
                    "offset": 2,
                    "isdst": true,
                    "text": "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna",
                    "utc": [
                      "Arctic/Longyearbyen",
                      "Europe/Amsterdam",
                      "Europe/Andorra",
                      "Europe/Berlin",
                      "Europe/Busingen",
                      "Europe/Gibraltar",
                      "Europe/Luxembourg",
                      "Europe/Malta",
                      "Europe/Monaco",
                      "Europe/Oslo",
                      "Europe/Rome",
                      "Europe/San_Marino",
                      "Europe/Stockholm",
                      "Europe/Vaduz",
                      "Europe/Vatican",
                      "Europe/Vienna",
                      "Europe/Zurich"
                    ]
                  },
                  {
                    "name": "Central Europe Standard Time",
                    "abbr": "CEDT",
                    "offset": 2,
                    "isdst": true,
                    "text": "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague",
                    "utc": [
                      "Europe/Belgrade",
                      "Europe/Bratislava",
                      "Europe/Budapest",
                      "Europe/Ljubljana",
                      "Europe/Podgorica",
                      "Europe/Prague",
                      "Europe/Tirane"
                    ]
                  },
                  {
                    "name": "Romance Standard Time",
                    "abbr": "RDT",
                    "offset": 2,
                    "isdst": true,
                    "text": "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris",
                    "utc": [
                      "Africa/Ceuta",
                      "Europe/Brussels",
                      "Europe/Copenhagen",
                      "Europe/Madrid",
                      "Europe/Paris"
                    ]
                  },
                  {
                    "name": "Central European Standard Time",
                    "abbr": "CEDT",
                    "offset": 2,
                    "isdst": true,
                    "text": "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb",
                    "utc": [
                      "Europe/Sarajevo",
                      "Europe/Skopje",
                      "Europe/Warsaw",
                      "Europe/Zagreb"
                    ]
                  },
                  {
                    "name": "W. Central Africa Standard Time",
                    "abbr": "WCAST",
                    "offset": 1,
                    "isdst": false,
                    "text": "(UTC+01:00) West Central Africa",
                    "utc": [
                      "Africa/Algiers",
                      "Africa/Bangui",
                      "Africa/Brazzaville",
                      "Africa/Douala",
                      "Africa/Kinshasa",
                      "Africa/Lagos",
                      "Africa/Libreville",
                      "Africa/Luanda",
                      "Africa/Malabo",
                      "Africa/Ndjamena",
                      "Africa/Niamey",
                      "Africa/Porto-Novo",
                      "Africa/Tunis",
                      "Etc/GMT-1"
                    ]
                  },
                  {
                    "name": "Namibia Standard Time",
                    "abbr": "NST",
                    "offset": 1,
                    "isdst": false,
                    "text": "(UTC+01:00) Windhoek",
                    "utc": [
                      "Africa/Windhoek"
                    ]
                  },
                  {
                    "name": "GTB Standard Time",
                    "abbr": "GDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Athens, Bucharest",
                    "utc": [
                      "Asia/Nicosia",
                      "Europe/Athens",
                      "Europe/Bucharest",
                      "Europe/Chisinau"
                    ]
                  },
                  {
                    "name": "Middle East Standard Time",
                    "abbr": "MEDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Beirut",
                    "utc": [
                      "Asia/Beirut"
                    ]
                  },
                  {
                    "name": "Egypt Standard Time",
                    "abbr": "EST",
                    "offset": 2,
                    "isdst": false,
                    "text": "(UTC+02:00) Cairo",
                    "utc": [
                      "Africa/Cairo"
                    ]
                  },
                  {
                    "name": "Syria Standard Time",
                    "abbr": "SDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Damascus",
                    "utc": [
                      "Asia/Damascus"
                    ]
                  },
                  {
                    "name": "E. Europe Standard Time",
                    "abbr": "EEDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) E. Europe"
                  },
                  {
                    "name": "South Africa Standard Time",
                    "abbr": "SAST",
                    "offset": 2,
                    "isdst": false,
                    "text": "(UTC+02:00) Harare, Pretoria",
                    "utc": [
                      "Africa/Blantyre",
                      "Africa/Bujumbura",
                      "Africa/Gaborone",
                      "Africa/Harare",
                      "Africa/Johannesburg",
                      "Africa/Kigali",
                      "Africa/Lubumbashi",
                      "Africa/Lusaka",
                      "Africa/Maputo",
                      "Africa/Maseru",
                      "Africa/Mbabane",
                      "Etc/GMT-2"
                    ]
                  },
                  {
                    "name": "FLE Standard Time",
                    "abbr": "FDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
                    "utc": [
                      "Europe/Helsinki",
                      "Europe/Kiev",
                      "Europe/Mariehamn",
                      "Europe/Riga",
                      "Europe/Sofia",
                      "Europe/Tallinn",
                      "Europe/Uzhgorod",
                      "Europe/Vilnius",
                      "Europe/Zaporozhye"
                    ]
                  },
                  {
                    "name": "Turkey Standard Time",
                    "abbr": "TDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Istanbul",
                    "utc": [
                      "Europe/Istanbul"
                    ]
                  },
                  {
                    "name": "Israel Standard Time",
                    "abbr": "JDT",
                    "offset": 3,
                    "isdst": true,
                    "text": "(UTC+02:00) Jerusalem",
                    "utc": [
                      "Asia/Jerusalem"
                    ]
                  },
                  {
                    "name": "Libya Standard Time",
                    "abbr": "LST",
                    "offset": 2,
                    "isdst": false,
                    "text": "(UTC+02:00) Tripoli",
                    "utc": [
                      "Africa/Tripoli"
                    ]
                  },
                  {
                    "name": "Jordan Standard Time",
                    "abbr": "JST",
                    "offset": 3,
                    "isdst": false,
                    "text": "(UTC+03:00) Amman",
                    "utc": [
                      "Asia/Amman"
                    ]
                  },
                  {
                    "name": "Arabic Standard Time",
                    "abbr": "AST",
                    "offset": 3,
                    "isdst": false,
                    "text": "(UTC+03:00) Baghdad",
                    "utc": [
                      "Asia/Baghdad"
                    ]
                  },
                  {
                    "name": "Kaliningrad Standard Time",
                    "abbr": "KST",
                    "offset": 3,
                    "isdst": false,
                    "text": "(UTC+03:00) Kaliningrad, Minsk",
                    "utc": [
                      "Europe/Kaliningrad",
                      "Europe/Minsk"
                    ]
                  },
                  {
                    "name": "Arab Standard Time",
                    "abbr": "AST",
                    "offset": 3,
                    "isdst": false,
                    "text": "(UTC+03:00) Kuwait, Riyadh",
                    "utc": [
                      "Asia/Aden",
                      "Asia/Bahrain",
                      "Asia/Kuwait",
                      "Asia/Qatar",
                      "Asia/Riyadh"
                    ]
                  },
                  {
                    "name": "E. Africa Standard Time",
                    "abbr": "EAST",
                    "offset": 3,
                    "isdst": false,
                    "text": "(UTC+03:00) Nairobi",
                    "utc": [
                      "Africa/Addis_Ababa",
                      "Africa/Asmera",
                      "Africa/Dar_es_Salaam",
                      "Africa/Djibouti",
                      "Africa/Juba",
                      "Africa/Kampala",
                      "Africa/Khartoum",
                      "Africa/Mogadishu",
                      "Africa/Nairobi",
                      "Antarctica/Syowa",
                      "Etc/GMT-3",
                      "Indian/Antananarivo",
                      "Indian/Comoro",
                      "Indian/Mayotte"
                    ]
                  },
                  {
                    "name": "Iran Standard Time",
                    "abbr": "IDT",
                    "offset": 4.5,
                    "isdst": true,
                    "text": "(UTC+03:30) Tehran",
                    "utc": [
                      "Asia/Tehran"
                    ]
                  },
                  {
                    "name": "Arabian Standard Time",
                    "abbr": "AST",
                    "offset": 4,
                    "isdst": false,
                    "text": "(UTC+04:00) Abu Dhabi, Muscat",
                    "utc": [
                      "Asia/Dubai",
                      "Asia/Muscat",
                      "Etc/GMT-4"
                    ]
                  },
                  {
                    "name": "Azerbaijan Standard Time",
                    "abbr": "ADT",
                    "offset": 5,
                    "isdst": true,
                    "text": "(UTC+04:00) Baku",
                    "utc": [
                      "Asia/Baku"
                    ]
                  },
                  {
                    "name": "Russian Standard Time",
                    "abbr": "RST",
                    "offset": 4,
                    "isdst": false,
                    "text": "(UTC+04:00) Moscow, St. Petersburg, Volgograd",
                    "utc": [
                      "Europe/Moscow",
                      "Europe/Samara",
                      "Europe/Simferopol",
                      "Europe/Volgograd"
                    ]
                  },
                  {
                    "name": "Mauritius Standard Time",
                    "abbr": "MST",
                    "offset": 4,
                    "isdst": false,
                    "text": "(UTC+04:00) Port Louis",
                    "utc": [
                      "Indian/Mahe",
                      "Indian/Mauritius",
                      "Indian/Reunion"
                    ]
                  },
                  {
                    "name": "Georgian Standard Time",
                    "abbr": "GST",
                    "offset": 4,
                    "isdst": false,
                    "text": "(UTC+04:00) Tbilisi",
                    "utc": [
                      "Asia/Tbilisi"
                    ]
                  },
                  {
                    "name": "Caucasus Standard Time",
                    "abbr": "CST",
                    "offset": 4,
                    "isdst": false,
                    "text": "(UTC+04:00) Yerevan",
                    "utc": [
                      "Asia/Yerevan"
                    ]
                  },
                  {
                    "name": "Afghanistan Standard Time",
                    "abbr": "AST",
                    "offset": 4.5,
                    "isdst": false,
                    "text": "(UTC+04:30) Kabul",
                    "utc": [
                      "Asia/Kabul"
                    ]
                  },
                  {
                    "name": "West Asia Standard Time",
                    "abbr": "WAST",
                    "offset": 5,
                    "isdst": false,
                    "text": "(UTC+05:00) Ashgabat, Tashkent",
                    "utc": [
                      "Antarctica/Mawson",
                      "Asia/Aqtau",
                      "Asia/Aqtobe",
                      "Asia/Ashgabat",
                      "Asia/Dushanbe",
                      "Asia/Oral",
                      "Asia/Samarkand",
                      "Asia/Tashkent",
                      "Etc/GMT-5",
                      "Indian/Kerguelen",
                      "Indian/Maldives"
                    ]
                  },
                  {
                    "name": "Pakistan Standard Time",
                    "abbr": "PST",
                    "offset": 5,
                    "isdst": false,
                    "text": "(UTC+05:00) Islamabad, Karachi",
                    "utc": [
                      "Asia/Karachi"
                    ]
                  },
                  {
                    "name": "India Standard Time",
                    "abbr": "IST",
                    "offset": 5.5,
                    "isdst": false,
                    "text": "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
                    "utc": [
                      "Asia/Calcutta"
                    ]
                  },
                  {
                    "name": "Sri Lanka Standard Time",
                    "abbr": "SLST",
                    "offset": 5.5,
                    "isdst": false,
                    "text": "(UTC+05:30) Sri Jayawardenepura",
                    "utc": [
                      "Asia/Colombo"
                    ]
                  },
                  {
                    "name": "Nepal Standard Time",
                    "abbr": "NST",
                    "offset": 5.75,
                    "isdst": false,
                    "text": "(UTC+05:45) Kathmandu",
                    "utc": [
                      "Asia/Katmandu"
                    ]
                  },
                  {
                    "name": "Central Asia Standard Time",
                    "abbr": "CAST",
                    "offset": 6,
                    "isdst": false,
                    "text": "(UTC+06:00) Astana",
                    "utc": [
                      "Antarctica/Vostok",
                      "Asia/Almaty",
                      "Asia/Bishkek",
                      "Asia/Qyzylorda",
                      "Asia/Urumqi",
                      "Etc/GMT-6",
                      "Indian/Chagos"
                    ]
                  },
                  {
                    "name": "Bangladesh Standard Time",
                    "abbr": "BST",
                    "offset": 6,
                    "isdst": false,
                    "text": "(UTC+06:00) Dhaka",
                    "utc": [
                      "Asia/Dhaka",
                      "Asia/Thimphu"
                    ]
                  },
                  {
                    "name": "Ekaterinburg Standard Time",
                    "abbr": "EST",
                    "offset": 6,
                    "isdst": false,
                    "text": "(UTC+06:00) Ekaterinburg",
                    "utc": [
                      "Asia/Yekaterinburg"
                    ]
                  },
                  {
                    "name": "Myanmar Standard Time",
                    "abbr": "MST",
                    "offset": 6.5,
                    "isdst": false,
                    "text": "(UTC+06:30) Yangon (Rangoon)",
                    "utc": [
                      "Asia/Rangoon",
                      "Indian/Cocos"
                    ]
                  },
                  {
                    "name": "SE Asia Standard Time",
                    "abbr": "SAST",
                    "offset": 7,
                    "isdst": false,
                    "text": "(UTC+07:00) Bangkok, Hanoi, Jakarta",
                    "utc": [
                      "Antarctica/Davis",
                      "Asia/Bangkok",
                      "Asia/Hovd",
                      "Asia/Jakarta",
                      "Asia/Phnom_Penh",
                      "Asia/Pontianak",
                      "Asia/Saigon",
                      "Asia/Vientiane",
                      "Etc/GMT-7",
                      "Indian/Christmas"
                    ]
                  },
                  {
                    "name": "N. Central Asia Standard Time",
                    "abbr": "NCAST",
                    "offset": 7,
                    "isdst": false,
                    "text": "(UTC+07:00) Novosibirsk",
                    "utc": [
                      "Asia/Novokuznetsk",
                      "Asia/Novosibirsk",
                      "Asia/Omsk"
                    ]
                  },
                  {
                    "name": "China Standard Time",
                    "abbr": "CST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi",
                    "utc": [
                      "Asia/Hong_Kong",
                      "Asia/Macau",
                      "Asia/Shanghai"
                    ]
                  },
                  {
                    "name": "North Asia Standard Time",
                    "abbr": "NAST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Krasnoyarsk",
                    "utc": [
                      "Asia/Krasnoyarsk"
                    ]
                  },
                  {
                    "name": "Singapore Standard Time",
                    "abbr": "MPST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Kuala Lumpur, Singapore",
                    "utc": [
                      "Asia/Brunei",
                      "Asia/Kuala_Lumpur",
                      "Asia/Kuching",
                      "Asia/Makassar",
                      "Asia/Manila",
                      "Asia/Singapore",
                      "Etc/GMT-8"
                    ]
                  },
                  {
                    "name": "W. Australia Standard Time",
                    "abbr": "WAST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Perth",
                    "utc": [
                      "Antarctica/Casey",
                      "Australia/Perth"
                    ]
                  },
                  {
                    "name": "Taipei Standard Time",
                    "abbr": "TST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Taipei",
                    "utc": [
                      "Asia/Taipei"
                    ]
                  },
                  {
                    "name": "Ulaanbaatar Standard Time",
                    "abbr": "UST",
                    "offset": 8,
                    "isdst": false,
                    "text": "(UTC+08:00) Ulaanbaatar",
                    "utc": [
                      "Asia/Choibalsan",
                      "Asia/Ulaanbaatar"
                    ]
                  },
                  {
                    "name": "North Asia East Standard Time",
                    "abbr": "NAEST",
                    "offset": 9,
                    "isdst": false,
                    "text": "(UTC+09:00) Irkutsk",
                    "utc": [
                      "Asia/Irkutsk"
                    ]
                  },
                  {
                    "name": "Tokyo Standard Time",
                    "abbr": "TST",
                    "offset": 9,
                    "isdst": false,
                    "text": "(UTC+09:00) Osaka, Sapporo, Tokyo",
                    "utc": [
                      "Asia/Dili",
                      "Asia/Jayapura",
                      "Asia/Tokyo",
                      "Etc/GMT-9",
                      "Pacific/Palau"
                    ]
                  },
                  {
                    "name": "Korea Standard Time",
                    "abbr": "KST",
                    "offset": 9,
                    "isdst": false,
                    "text": "(UTC+09:00) Seoul",
                    "utc": [
                      "Asia/Pyongyang",
                      "Asia/Seoul"
                    ]
                  },
                  {
                    "name": "Cen. Australia Standard Time",
                    "abbr": "CAST",
                    "offset": 9.5,
                    "isdst": false,
                    "text": "(UTC+09:30) Adelaide",
                    "utc": [
                      "Australia/Adelaide",
                      "Australia/Broken_Hill"
                    ]
                  },
                  {
                    "name": "AUS Central Standard Time",
                    "abbr": "ACST",
                    "offset": 9.5,
                    "isdst": false,
                    "text": "(UTC+09:30) Darwin",
                    "utc": [
                      "Australia/Darwin"
                    ]
                  },
                  {
                    "name": "E. Australia Standard Time",
                    "abbr": "EAST",
                    "offset": 10,
                    "isdst": false,
                    "text": "(UTC+10:00) Brisbane",
                    "utc": [
                      "Australia/Brisbane",
                      "Australia/Lindeman"
                    ]
                  },
                  {
                    "name": "AUS Eastern Standard Time",
                    "abbr": "AEST",
                    "offset": 10,
                    "isdst": false,
                    "text": "(UTC+10:00) Canberra, Melbourne, Sydney",
                    "utc": [
                      "Australia/Melbourne",
                      "Australia/Sydney"
                    ]
                  },
                  {
                    "name": "West Pacific Standard Time",
                    "abbr": "WPST",
                    "offset": 10,
                    "isdst": false,
                    "text": "(UTC+10:00) Guam, Port Moresby",
                    "utc": [
                      "Antarctica/DumontDUrville",
                      "Etc/GMT-10",
                      "Pacific/Guam",
                      "Pacific/Port_Moresby",
                      "Pacific/Saipan",
                      "Pacific/Truk"
                    ]
                  },
                  {
                    "name": "Tasmania Standard Time",
                    "abbr": "TST",
                    "offset": 10,
                    "isdst": false,
                    "text": "(UTC+10:00) Hobart",
                    "utc": [
                      "Australia/Currie",
                      "Australia/Hobart"
                    ]
                  },
                  {
                    "name": "Yakutsk Standard Time",
                    "abbr": "YST",
                    "offset": 10,
                    "isdst": false,
                    "text": "(UTC+10:00) Yakutsk",
                    "utc": [
                      "Asia/Chita",
                      "Asia/Khandyga",
                      "Asia/Yakutsk"
                    ]
                  },
                  {
                    "name": "Central Pacific Standard Time",
                    "abbr": "CPST",
                    "offset": 11,
                    "isdst": false,
                    "text": "(UTC+11:00) Solomon Is., New Caledonia",
                    "utc": [
                      "Antarctica/Macquarie",
                      "Etc/GMT-11",
                      "Pacific/Efate",
                      "Pacific/Guadalcanal",
                      "Pacific/Kosrae",
                      "Pacific/Noumea",
                      "Pacific/Ponape"
                    ]
                  },
                  {
                    "name": "Vladivostok Standard Time",
                    "abbr": "VST",
                    "offset": 11,
                    "isdst": false,
                    "text": "(UTC+11:00) Vladivostok",
                    "utc": [
                      "Asia/Sakhalin",
                      "Asia/Ust-Nera",
                      "Asia/Vladivostok"
                    ]
                  },
                  {
                    "name": "New Zealand Standard Time",
                    "abbr": "NZST",
                    "offset": 12,
                    "isdst": false,
                    "text": "(UTC+12:00) Auckland, Wellington",
                    "utc": [
                      "Antarctica/McMurdo",
                      "Pacific/Auckland"
                    ]
                  },
                  {
                    "name": "UTC+12",
                    "abbr": "U",
                    "offset": 12,
                    "isdst": false,
                    "text": "(UTC+12:00) Coordinated Universal Time+12",
                    "utc": [
                      "Etc/GMT-12",
                      "Pacific/Funafuti",
                      "Pacific/Kwajalein",
                      "Pacific/Majuro",
                      "Pacific/Nauru",
                      "Pacific/Tarawa",
                      "Pacific/Wake",
                      "Pacific/Wallis"
                    ]
                  },
                  {
                    "name": "Fiji Standard Time",
                    "abbr": "FST",
                    "offset": 12,
                    "isdst": false,
                    "text": "(UTC+12:00) Fiji",
                    "utc": [
                      "Pacific/Fiji"
                    ]
                  },
                  {
                    "name": "Magadan Standard Time",
                    "abbr": "MST",
                    "offset": 12,
                    "isdst": false,
                    "text": "(UTC+12:00) Magadan",
                    "utc": [
                      "Asia/Anadyr",
                      "Asia/Kamchatka",
                      "Asia/Magadan",
                      "Asia/Srednekolymsk"
                    ]
                  },
                  {
                    "name": "Kamchatka Standard Time",
                    "abbr": "KDT",
                    "offset": 13,
                    "isdst": true,
                    "text": "(UTC+12:00) Petropavlovsk-Kamchatsky - Old"
                  },
                  {
                    "name": "Tonga Standard Time",
                    "abbr": "TST",
                    "offset": 13,
                    "isdst": false,
                    "text": "(UTC+13:00) Nuku'alofa",
                    "utc": [
                      "Etc/GMT-13",
                      "Pacific/Enderbury",
                      "Pacific/Fakaofo",
                      "Pacific/Tongatapu"
                    ]
                  },
                  {
                    "name": "Samoa Standard Time",
                    "abbr": "SST",
                    "offset": 13,
                    "isdst": false,
                    "text": "(UTC+13:00) Samoa",
                    "utc": [
                      "Pacific/Apia"
                    ]
                  }
                ]
    };

    var o_hasOwnProperty = Object.prototype.hasOwnProperty;
    var o_keys = (Object.keys || function(obj) {
      var result = [];
      for (var key in obj) {
        if (o_hasOwnProperty.call(obj, key)) {
          result.push(key);
        }
      }

      return result;
    });

    function _copyObject(source, target) {
      var keys = o_keys(source);
      var key;

      for (var i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        target[key] = source[key] || target[key];
      }
    }

    function _copyArray(source, target) {
      for (var i = 0, l = source.length; i < l; i++) {
        target[i] = source[i];
      }
    }

    function copyObject(source, _target) {
        var isArray = Array.isArray(source);
        var target = _target || (isArray ? new Array(source.length) : {});

        if (isArray) {
          _copyArray(source, target);
        } else {
          _copyObject(source, target);
        }

        return target;
    }

    /** Get the data based on key**/
    Chance.prototype.get = function (name) {
        return copyObject(data[name]);
    };

    // Mac Address
    Chance.prototype.mac_address = function(options){
        // typically mac addresses are separated by ":"
        // however they can also be separated by "-"
        // the network variant uses a dot every fourth byte

        options = initOptions(options);
        if(!options.separator) {
            options.separator =  options.networkVersion ? "." : ":";
        }

        var mac_pool="ABCDEF1234567890",
            mac = "";
        if(!options.networkVersion) {
            mac = this.n(this.string, 6, { pool: mac_pool, length:2 }).join(options.separator);
        } else {
            mac = this.n(this.string, 3, { pool: mac_pool, length:4 }).join(options.separator);
        }

        return mac;
    };

    Chance.prototype.normal = function (options) {
        options = initOptions(options, {mean : 0, dev : 1, pool : []});

        testRange(
            options.pool.constructor !== Array,
            "Chance: The pool option must be a valid array."
        );

        // If a pool has been passed, then we are returning an item from that pool,
        // using the normal distribution settings that were passed in
        if (options.pool.length > 0) {
            return this.normal_pool(options);
        }

        // The Marsaglia Polar method
        var s, u, v, norm,
            mean = options.mean,
            dev = options.dev;

        do {
            // U and V are from the uniform distribution on (-1, 1)
            u = this.random() * 2 - 1;
            v = this.random() * 2 - 1;

            s = u * u + v * v;
        } while (s >= 1);

        // Compute the standard normal variate
        norm = u * Math.sqrt(-2 * Math.log(s) / s);

        // Shape and scale
        return dev * norm + mean;
    };

    Chance.prototype.normal_pool = function(options) {
        var performanceCounter = 0;
        do {
            var idx = Math.round(this.normal({ mean: options.mean, dev: options.dev }));
            if (idx < options.pool.length && idx >= 0) {
                return options.pool[idx];
            } else {
                performanceCounter++;
            }
        } while(performanceCounter < 100);

        throw new RangeError("Chance: Your pool is too small for the given mean and standard deviation. Please adjust.");
    };

    Chance.prototype.radio = function (options) {
        // Initial Letter (Typically Designated by Side of Mississippi River)
        options = initOptions(options, {side : "?"});
        var fl = "";
        switch (options.side.toLowerCase()) {
        case "east":
        case "e":
            fl = "W";
            break;
        case "west":
        case "w":
            fl = "K";
            break;
        default:
            fl = this.character({pool: "KW"});
            break;
        }

        return fl + this.character({alpha: true, casing: "upper"}) +
                this.character({alpha: true, casing: "upper"}) +
                this.character({alpha: true, casing: "upper"});
    };

    // Set the data as key and data or the data map
    Chance.prototype.set = function (name, values) {
        if (typeof name === "string") {
            data[name] = values;
        } else {
            data = copyObject(name, data);
        }
    };

    Chance.prototype.tv = function (options) {
        return this.radio(options);
    };

    // ID number for Brazil companies
    Chance.prototype.cnpj = function () {
        var n = this.n(this.natural, 8, { max: 9 });
        var d1 = 2+n[7]*6+n[6]*7+n[5]*8+n[4]*9+n[3]*2+n[2]*3+n[1]*4+n[0]*5;
        d1 = 11 - (d1 % 11);
        if (d1>=10){
            d1 = 0;
        }
        var d2 = d1*2+3+n[7]*7+n[6]*8+n[5]*9+n[4]*2+n[3]*3+n[2]*4+n[1]*5+n[0]*6;
        d2 = 11 - (d2 % 11);
        if (d2>=10){
            d2 = 0;
        }
        return ''+n[0]+n[1]+'.'+n[2]+n[3]+n[4]+'.'+n[5]+n[6]+n[7]+'/0001-'+d1+d2;
    };

    // -- End Miscellaneous --

    Chance.prototype.mersenne_twister = function (seed) {
        return new MersenneTwister(seed);
    };

    Chance.prototype.blueimp_md5 = function () {
        return new BlueImpMD5();
    };

    // Mersenne Twister from https://gist.github.com/banksean/300494
    var MersenneTwister = function (seed) {
        if (seed === undefined) {
            // kept random number same size as time used previously to ensure no unexpected results downstream
            seed = Math.floor(Math.random()*Math.pow(10,13));
        }
        /* Period parameters */
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df;   /* constant vector a */
        this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
        this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

        this.mt = new Array(this.N); /* the array for the state vector */
        this.mti = this.N + 1; /* mti==N + 1 means mt[N] is not initialized */

        this.init_genrand(seed);
    };

    /* initializes mt[N] with a seed */
    MersenneTwister.prototype.init_genrand = function (s) {
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
            /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
            /* In the previous versions, MSBs of the seed affect   */
            /* only MSBs of the array mt[].                        */
            /* 2002/01/09 modified by Makoto Matsumoto             */
            this.mt[this.mti] >>>= 0;
            /* for >32 bit machines */
        }
    };

    /* initialize by an array with array-length */
    /* init_key is the array for initializing keys */
    /* key_length is its length */
    /* slight change for C++, 2004/2/26 */
    MersenneTwister.prototype.init_by_array = function (init_key, key_length) {
        var i = 1, j = 0, k, s;
        this.init_genrand(19650218);
        k = (this.N > key_length ? this.N : key_length);
        for (; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            j++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
            if (j >= key_length) { j = 0; }
        }
        for (k = this.N - 1; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
        }

        this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
    };

    /* generates a random number on [0,0xffffffff]-interval */
    MersenneTwister.prototype.genrand_int32 = function () {
        var y;
        var mag01 = new Array(0x0, this.MATRIX_A);
        /* mag01[x] = x * MATRIX_A  for x=0,1 */

        if (this.mti >= this.N) { /* generate N words at one time */
            var kk;

            if (this.mti === this.N + 1) {   /* if init_genrand() has not been called, */
                this.init_genrand(5489); /* a default initial seed is used */
            }
            for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (;kk < this.N - 1; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y = (this.mt[this.N - 1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

            this.mti = 0;
        }

        y = this.mt[this.mti++];

        /* Tempering */
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);

        return y >>> 0;
    };

    /* generates a random number on [0,0x7fffffff]-interval */
    MersenneTwister.prototype.genrand_int31 = function () {
        return (this.genrand_int32() >>> 1);
    };

    /* generates a random number on [0,1]-real-interval */
    MersenneTwister.prototype.genrand_real1 = function () {
        return this.genrand_int32() * (1.0 / 4294967295.0);
        /* divided by 2^32-1 */
    };

    /* generates a random number on [0,1)-real-interval */
    MersenneTwister.prototype.random = function () {
        return this.genrand_int32() * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on (0,1)-real-interval */
    MersenneTwister.prototype.genrand_real3 = function () {
        return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on [0,1) with 53-bit resolution*/
    MersenneTwister.prototype.genrand_res53 = function () {
        var a = this.genrand_int32()>>>5, b = this.genrand_int32()>>>6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    };

    // BlueImp MD5 hashing algorithm from https://github.com/blueimp/JavaScript-MD5
    var BlueImpMD5 = function () {};

    BlueImpMD5.prototype.VERSION = '1.0.1';

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    BlueImpMD5.prototype.safe_add = function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    BlueImpMD5.prototype.bit_roll = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    };

    /*
    * These functions implement the five basic operations the algorithm uses.
    */
    BlueImpMD5.prototype.md5_cmn = function (q, a, b, x, s, t) {
        return this.safe_add(this.bit_roll(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s), b);
    };
    BlueImpMD5.prototype.md5_ff = function (a, b, c, d, x, s, t) {
        return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    };
    BlueImpMD5.prototype.md5_gg = function (a, b, c, d, x, s, t) {
        return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    };
    BlueImpMD5.prototype.md5_hh = function (a, b, c, d, x, s, t) {
        return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
    };
    BlueImpMD5.prototype.md5_ii = function (a, b, c, d, x, s, t) {
        return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    };

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    BlueImpMD5.prototype.binl_md5 = function (x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var i, olda, oldb, oldc, oldd,
            a =  1732584193,
            b = -271733879,
            c = -1732584194,
            d =  271733878;

        for (i = 0; i < x.length; i += 16) {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = this.md5_ff(a, b, c, d, x[i],       7, -680876936);
            d = this.md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
            c = this.md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
            b = this.md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
            a = this.md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
            d = this.md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
            c = this.md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
            b = this.md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
            a = this.md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
            d = this.md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
            c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = this.md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
            d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = this.md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);

            a = this.md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
            d = this.md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
            c = this.md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
            b = this.md5_gg(b, c, d, a, x[i],      20, -373897302);
            a = this.md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
            d = this.md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
            c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = this.md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
            a = this.md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
            d = this.md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
            c = this.md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
            b = this.md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
            a = this.md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
            d = this.md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
            c = this.md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
            b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = this.md5_hh(a, b, c, d, x[i +  5],  4, -378558);
            d = this.md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
            c = this.md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
            b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = this.md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
            d = this.md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
            c = this.md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
            b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = this.md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
            d = this.md5_hh(d, a, b, c, x[i],      11, -358537222);
            c = this.md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
            b = this.md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
            a = this.md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
            d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = this.md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
            b = this.md5_hh(b, c, d, a, x[i +  2], 23, -995338651);

            a = this.md5_ii(a, b, c, d, x[i],       6, -198630844);
            d = this.md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
            c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = this.md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
            a = this.md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
            d = this.md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
            c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = this.md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
            a = this.md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
            d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = this.md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
            b = this.md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
            a = this.md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
            d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = this.md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
            b = this.md5_ii(b, c, d, a, x[i +  9], 21, -343485551);

            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
        }
        return [a, b, c, d];
    };

    /*
    * Convert an array of little-endian words to a string
    */
    BlueImpMD5.prototype.binl2rstr = function (input) {
        var i,
            output = '';
        for (i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
    };

    /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
    BlueImpMD5.prototype.rstr2binl = function (input) {
        var i,
            output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
            output[i] = 0;
        }
        for (i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return output;
    };

    /*
    * Calculate the MD5 of a raw string
    */
    BlueImpMD5.prototype.rstr_md5 = function (s) {
        return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
    };

    /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings)
    */
    BlueImpMD5.prototype.rstr_hmac_md5 = function (key, data) {
        var i,
            bkey = this.rstr2binl(key),
            ipad = [],
            opad = [],
            hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
            bkey = this.binl_md5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
        return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
    };

    /*
    * Convert a raw string to a hex string
    */
    BlueImpMD5.prototype.rstr2hex = function (input) {
        var hex_tab = '0123456789abcdef',
            output = '',
            x,
            i;
        for (i = 0; i < input.length; i += 1) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F) +
                hex_tab.charAt(x & 0x0F);
        }
        return output;
    };

    /*
    * Encode a string as utf-8
    */
    BlueImpMD5.prototype.str2rstr_utf8 = function (input) {
        return unescape(encodeURIComponent(input));
    };

    /*
    * Take string arguments and return either raw or hex encoded strings
    */
    BlueImpMD5.prototype.raw_md5 = function (s) {
        return this.rstr_md5(this.str2rstr_utf8(s));
    };
    BlueImpMD5.prototype.hex_md5 = function (s) {
        return this.rstr2hex(this.raw_md5(s));
    };
    BlueImpMD5.prototype.raw_hmac_md5 = function (k, d) {
        return this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d));
    };
    BlueImpMD5.prototype.hex_hmac_md5 = function (k, d) {
        return this.rstr2hex(this.raw_hmac_md5(k, d));
    };

    BlueImpMD5.prototype.md5 = function (string, key, raw) {
        if (!key) {
            if (!raw) {
                return this.hex_md5(string);
            }

            return this.raw_md5(string);
        }

        if (!raw) {
            return this.hex_hmac_md5(key, string);
        }

        return this.raw_hmac_md5(key, string);
    };

    // CommonJS module
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Chance;
        }
        exports.Chance = Chance;
    }

    // Register as an anonymous AMD module
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return Chance;
        });
    }

    // if there is a importsScrips object define chance for worker
    if (typeof importScripts !== 'undefined') {
        chance = new Chance();
    }

    // If there is a window object, that at least has a document property,
    // instantiate and define chance on the window
    if (typeof window === "object" && typeof window.document === "object") {
        window.Chance = Chance;
        window.chance = new Chance();
    }
})();

}).call(this,require("buffer").Buffer)
},{"buffer":2}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],6:[function(require,module,exports){
var overArg = require('./_overArg');

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

module.exports = getPrototype;

},{"./_overArg":8}],7:[function(require,module,exports){
/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

module.exports = isHostObject;

},{}],8:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],9:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],10:[function(require,module,exports){
var getPrototype = require('./_getPrototype'),
    isHostObject = require('./_isHostObject'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) ||
      objectToString.call(value) != objectTag || isHostObject(value)) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return (typeof Ctor == 'function' &&
    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}

module.exports = isPlainObject;

},{"./_getPrototype":6,"./_isHostObject":7,"./isObjectLike":9}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports['default'] = applyMiddleware;

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
function applyMiddleware() {
  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function (reducer, preloadedState, enhancer) {
      var store = createStore(reducer, preloadedState, enhancer);
      var _dispatch = store.dispatch;
      var chain = [];

      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch(action) {
          return _dispatch(action);
        }
      };
      chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = _compose2['default'].apply(undefined, chain)(store.dispatch);

      return _extends({}, store, {
        dispatch: _dispatch
      });
    };
  };
}
},{"./compose":15}],13:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = bindActionCreators;
function bindActionCreator(actionCreator, dispatch) {
  return function () {
    return dispatch(actionCreator.apply(undefined, arguments));
  };
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
  }

  var keys = Object.keys(actionCreators);
  var boundActionCreators = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }
  return boundActionCreators;
}
},{}],14:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports['default'] = combineReducers;

var _createStore = require('./createStore');

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state.';
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === _createStore.ActionTypes.INIT ? 'preloadedState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!(0, _isPlainObject2['default'])(inputState)) {
    return 'The ' + argumentName + ' has unexpected type of "' + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
  });

  unexpectedKeys.forEach(function (key) {
    unexpectedKeyCache[key] = true;
  });

  if (unexpectedKeys.length > 0) {
    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
  }
}

function assertReducerSanity(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, { type: _createStore.ActionTypes.INIT });

    if (typeof initialState === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined.');
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
    if (typeof reducer(undefined, { type: type }) === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + _createStore.ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined.');
    }
  });
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        (0, _warning2['default'])('No reducer provided for key "' + key + '"');
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  var finalReducerKeys = Object.keys(finalReducers);

  if (process.env.NODE_ENV !== 'production') {
    var unexpectedKeyCache = {};
  }

  var sanityError;
  try {
    assertReducerSanity(finalReducers);
  } catch (e) {
    sanityError = e;
  }

  return function combination() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var action = arguments[1];

    if (sanityError) {
      throw sanityError;
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
      if (warningMessage) {
        (0, _warning2['default'])(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i];
      var reducer = finalReducers[key];
      var previousStateForKey = state[key];
      var nextStateForKey = reducer(previousStateForKey, action);
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action);
        throw new Error(errorMessage);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
}).call(this,require('_process'))
},{"./createStore":16,"./utils/warning":18,"_process":11,"lodash/isPlainObject":10}],15:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = compose;
/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

function compose() {
  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  var last = funcs[funcs.length - 1];
  var rest = funcs.slice(0, -1);
  return function () {
    return rest.reduceRight(function (composed, f) {
      return f(composed);
    }, last.apply(undefined, arguments));
  };
}
},{}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.ActionTypes = undefined;
exports['default'] = createStore;

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var ActionTypes = exports.ActionTypes = {
  INIT: '@@redux/INIT'
};

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} enhancer The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState;
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!(0, _isPlainObject2['default'])(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }

    return action;
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT });
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/zenparsing/es-observable
   */
  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return { unsubscribe: unsubscribe };
      }
    }, _ref[_symbolObservable2['default']] = function () {
      return this;
    }, _ref;
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT });

  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[_symbolObservable2['default']] = observable, _ref2;
}
},{"lodash/isPlainObject":10,"symbol-observable":19}],17:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports.compose = exports.applyMiddleware = exports.bindActionCreators = exports.combineReducers = exports.createStore = undefined;

var _createStore = require('./createStore');

var _createStore2 = _interopRequireDefault(_createStore);

var _combineReducers = require('./combineReducers');

var _combineReducers2 = _interopRequireDefault(_combineReducers);

var _bindActionCreators = require('./bindActionCreators');

var _bindActionCreators2 = _interopRequireDefault(_bindActionCreators);

var _applyMiddleware = require('./applyMiddleware');

var _applyMiddleware2 = _interopRequireDefault(_applyMiddleware);

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*
* This is a dummy function to check if the function name has been altered by minification.
* If the function has been minified and NODE_ENV !== 'production', warn the user.
*/
function isCrushed() {}

if (process.env.NODE_ENV !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  (0, _warning2['default'])('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
}

exports.createStore = _createStore2['default'];
exports.combineReducers = _combineReducers2['default'];
exports.bindActionCreators = _bindActionCreators2['default'];
exports.applyMiddleware = _applyMiddleware2['default'];
exports.compose = _compose2['default'];
}).call(this,require('_process'))
},{"./applyMiddleware":12,"./bindActionCreators":13,"./combineReducers":14,"./compose":15,"./createStore":16,"./utils/warning":18,"_process":11}],18:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = warning;
/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}
},{}],19:[function(require,module,exports){
module.exports = require('./lib/index');

},{"./lib/index":20}],20:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _ponyfill = require('./ponyfill');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var root = undefined; /* global window */

if (typeof global !== 'undefined') {
	root = global;
} else if (typeof window !== 'undefined') {
	root = window;
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./ponyfill":21}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};
},{}],22:[function(require,module,exports){
(function (global){

var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
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
},{}],23:[function(require,module,exports){
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

},{"./rng":22}],24:[function(require,module,exports){
'use strict';

var actionCreator = function actionCreator() {
  var move = function move() {
    var id = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
    var index = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
    return { type: 'MOVE_WORM', id: id, index: index };
  };
  var kill = function kill() {
    var id = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
    return { type: 'KILL_WORM', id: id };
  };
  var generate = function generate() {
    var parent1 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var parent2 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    return { type: 'GENERATE_WORM', parent1: parent1, parent2: parent2 };
  };
  var log = function log() {
    return { type: 'APPEND_LOG' };
  };
  var ranking = function ranking() {
    return { type: 'UPDATE_RANKING' };
  };

  return Object.create({ move: move, kill: kill, generate: generate, log: log, ranking: ranking });
};

module.exports = actionCreator();

},{}],25:[function(require,module,exports){
"use strict";

var findCollisions = function findCollisions(worms) {
  var collisions = worms.map(function (refWorm) {
    return worms.filter(function (wf) {
      return wf.id != refWorm.id && collisionCheckWormWorm(wf, refWorm);
    }).map(function (wm) {
      return { w1: wm, w2: refWorm };
    })[0];
  }).filter(function (col) {
    return !!col;
  }) // Removes undefined values
  .filter(function (_, i) {
    return i % 2 == 0;
  });

  return collisions;
};

function collisionCheckWormWorm(worm1, worm2) {
  var x1 = worm1.pos.x,
      y1 = worm1.pos.y,
      height1 = worm1.pos.height,
      width1 = worm1.pos.width;
  var x2 = worm2.pos.x,
      y2 = worm2.pos.y,
      height2 = worm2.pos.height,
      width2 = worm2.pos.width;
  return x1 < x2 + width2 && x2 < x1 + width1 && y1 < y2 + height2 && y2 < y1 + height1;
}

module.exports = { findCollisions: findCollisions };

},{}],26:[function(require,module,exports){
'use strict';

var Worm = require('../Model/Worm');

/*
  Function that takes two worms and generate a combination of the best assets
  of them.
*/
var generateWorm = function generateWorm(w1, w2) {
  var w1Attributes = w1.getAttributes();
  var w2Attributes = w2.getAttributes();

  var bestStrength = w1Attributes.strength > w2Attributes.strength ? w1 : w2;
  var bestCharisma = w1Attributes.charisma > w2Attributes.charisma ? w1 : w2;

  return Worm(bestStrength, bestCharisma);
};
// Function responsible for check who wins in a fight between two worms of the same gender
var fight = function fight(w1, w2) {
  var w1Attributes = w1.getAttributes();
  var w2Attributes = w2.getAttributes();

  var w1Value = w1Attributes.strength + Math.random() * w1Attributes.strength;
  var w2Value = w2Attributes.strength + Math.random() * w2Attributes.strength;
  return w1Value > w2Value ? w2 : w1;
};

/*
  Function responsible for checking if two worms match with each other. The parameter chosen
  is that, if the difference between their charismas is higher than 50%, they will not match.
*/
var match = function match(w1, w2) {
  var w1Char = w1.getAttributes().charisma,
      w2Char = w2.getAttributes().charisma;

  var percentageDifference = Math.abs(w1Char - w2Char) / ((w1Char + w2Char) / 2) * 100;
  return percentageDifference <= 50;
};

module.exports = { generateWorm: generateWorm, fight: fight, match: match };

},{"../Model/Worm":29}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
'use strict';

var randomOrientation = function randomOrientation() {
  return ['up', 'down', 'left', 'right'][parseInt(Math.random() * 100 / 25)];
};

// updatePos parameters
// x, y, orientation, width, height


var moveWorm = function moveWorm(worm) {
  var orientation = randomOrientation();
  switch (orientation) {
    case 'up':
      worm.updatePosition(worm.pos.x, worm.pos.y - 1, 7.5, 30);
    case 'down':
      worm.updatePosition(worm.pos.x, worm.pos.y + 1, 7.5, 30);
    case 'left':
      worm.updatePosition(worm.pos.x - 1, worm.pos.y, 7.5, 30);
    case 'right':
      worm.updatePosition(worm.pos.x + 1, worm.pos.y, 7.5, 30);
  }
  return worm;
};

module.exports = { moveWorm: moveWorm };

},{}],29:[function(require,module,exports){
'use strict';

/*
  The worm object. You can initialize it with custom strength and charisma like in the generation process.
  But you can also generate a new Worm without initialize the values, and i'm thinking in using this as a form
  of mutation.
*/

var chance = require('chance')();
var uuid = require('uuid');

function updatePosition(x, y, width, height) {
  this.pos = Object.assign({}, this.pos, { x: x, y: y, width: width, height: height });
}

function toString() {
  return 'Gender: ' + this.gender + ' ('.concat(this.pos.x).concat(', ').concat(this.pos.y).concat(') ID: ').concat(this.name);
}

function getAttributes() {
  return this.attr;
}

var WormFactory = function WormFactory() {
  var strength = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  var charisma = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var _require$getValues = require('../App/MaximumValues')().getValues();

  var STR = _require$getValues.STR;
  var CHA = _require$getValues.CHA;


  var proto = { updatePosition: updatePosition, toString: toString, getAttributes: getAttributes };
  var gender = parseInt(Math.random() * 10) < 5 ? 'male' : 'female';
  var Worm = {
    gender: gender.toUpperCase(),
    name: chance.name({ gender: gender }),
    id: uuid.v1(),
    attr: {
      strength: strength == 0 ? parseInt(Math.random() * STR) + parseInt(STR / 3 * 2) : strength,
      charisma: charisma == 0 ? parseInt(Math.random() * CHA) + parseInt(CHA / 3 * 2) : charisma
    },
    pos: {
      x: parseInt(Math.random() * 600),
      y: parseInt(Math.random() * 600),
      width: 30,
      height: 7.5
    }
  };
  Object.setPrototypeOf(Worm, proto);
  return Worm;
};

module.exports = WormFactory;

},{"../App/MaximumValues":27,"chance":3,"uuid":23}],30:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var WormFactory = require('./Model/Worm');
var Orientation = require('./App/Orientation');

var _require = require('./App/Interactions');

var generateWorm = _require.generateWorm;


var initialRanking = { CHA: [], STR: [] };
var initialWorms = [].concat(_toConsumableArray(new Array(20))).map(function (value) {
  return WormFactory();
});
var initialLogs = [];

var worms = function worms() {
  var worms = arguments.length <= 0 || arguments[0] === undefined ? initialWorms : arguments[0];
  var action = arguments[1];

  var _ret = function () {
    switch (action.type) {
      case 'MOVE_WORM':
        var idx = action.index;
        return {
          v: [].concat(_toConsumableArray(worms.slice(0, idx)), [Orientation.moveWorm(worms[idx])], _toConsumableArray(worms.slice(idx + 1)))
        };

      case 'KILL_WORM':
        var wormId = action.id;
        return {
          v: worms.filter(function (worm) {
            return worm.id != wormId;
          })
        };

      case 'GENERATE_WORM':
        var newWorm = generateWorm(action.parent1, action.parent2);
        return {
          v: [].concat(_toConsumableArray(worms), [newWorm])
        };
    }
  }();

  if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  return worms;
};

var logs = function logs() {
  var state = arguments.length <= 0 || arguments[0] === undefined ? initialLogs : arguments[0];
  var action = arguments[1];


  return state;
};

var ranking = function ranking() {
  var state = arguments.length <= 0 || arguments[0] === undefined ? initialRanking : arguments[0];
  var action = arguments[1];


  return state;
};

module.exports = { worms: worms, logs: logs, ranking: ranking };

},{"./App/Interactions":26,"./App/Orientation":28,"./Model/Worm":29}],31:[function(require,module,exports){
'use strict';

var _require = require('redux');

var createStore = _require.createStore;
var combineReducers = _require.combineReducers;

var _require2 = require('./Reducers');

var worms = _require2.worms;
var logs = _require2.logs;
var ranking = _require2.ranking;

var Actions = require('./Actions');

var _require3 = require('./App/Crash');

var findCollisions = _require3.findCollisions;

var _require4 = require('./App/Interactions');

var generateWorm = _require4.generateWorm;
var fight = _require4.fight;
var match = _require4.match;


var canvasCtx = document.getElementById('wormsPlayground').getContext('2d');

// Redux Initialization
var rootReducer = combineReducers({ worms: worms, logs: logs, ranking: ranking });
var appStore = createStore(rootReducer);

var collisionSolver = function collisionSolver(collision) {
  if (collision.w1.gender === collision.w2.gender) {
    var loser = fight(collision.w1, collision.w2);
    appStore.dispatch(Actions.kill(loser.id));
    return;
  }
  if (match(collision.w1, collision.w2)) {
    appStore.dispatch(Actions.generate(collision.w1, collision.w2));
  }
};

// Main Application Loop with Redux State
var state = void 0;

var mainApp = function mainApp() {

  // ---------- COLLISIONS WORMS ----------- //
  state = appStore.getState();
  findCollisions(state.worms).forEach(collisionSolver);
  // --------------------------------------- //

  // ------------- MOVE WORMS -------------- //
  state = appStore.getState();
  state.worms.forEach(function (worm, index) {
    return appStore.dispatch(Actions.move(worm.id, index));
  });
  // --------------------------------------- //
  canvasCtx.clearRect(0, 0, 600, 600);
  state = appStore.getState();

  state.worms.forEach(function (worm) {
    return canvasCtx.fillRect(worm.pos.x, worm.pos.y, worm.pos.width, worm.pos.height);
  });
};

setInterval(function (_) {
  return mainApp();
}, 300);

// const worms =
// moveWorms(worms).forEach(worm => )

},{"./Actions":24,"./App/Crash":25,"./App/Interactions":26,"./Reducers":30,"redux":17}]},{},[31]);
