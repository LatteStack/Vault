/* eslint-disable no-irregular-whitespace */
/* eslint-disable @typescript-eslint/no-var-requires */

/** Node.js version is between 15.0.0   and 19.0.0 */
globalThis.crypto ??= require('crypto').webcrypto

/** Node.js version is between 15.7.0   and 18.0.0 */
globalThis.Blob ??= require('buffer').Blob

/** Node.js version is between 16.5.0   and 18.0.0 */
// globalThis.ReadableStream ?? require('stream/web')
