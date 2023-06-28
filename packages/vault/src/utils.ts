export const cipher: Crypto = globalThis.crypto ??
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (typeof require === 'function' ? require('node:crypto').webcrypto : null)


// export function importECDH(params:type) {

// }
