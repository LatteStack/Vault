/* eslint-disable @typescript-eslint/no-var-requires */
const isNode: boolean = Object.prototype.toString.call(
  typeof process !== 'undefined' ? process : 0,
) === '[object process]'

if (isNode) {
  globalThis.crypto ??= require('crypto').webcrypto
  globalThis.Blob ??= require('buffer').Blob
  globalThis.ReadableStream ??= require('stream/web').ReadableStream
  globalThis.TransformStream ??= require('stream/web').TransformStream
  globalThis.WritableStream ??= require('stream/web').WritableStream
}
