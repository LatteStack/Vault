// https://developer.mozilla.org/en-US/docs/Web/API/AesKeyGenParams#length
export const AES_KEY_LENGTH_IN_BITS = 256
export const AES_KEY_LENGTH_IN_BYTES = AES_KEY_LENGTH_IN_BITS / 8
// https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#taglength
export const AES_TAG_LENGTH_IN_BITS = 128
export const AES_TAG_LENGTH_IN_BYTES = AES_TAG_LENGTH_IN_BITS / 8
// https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#iv
export const AES_IV_LENGTH_IN_BITS = 96
export const AES_IV_LENGTH_IN_BYTES = AES_IV_LENGTH_IN_BITS / 8

// 16MB
export const DEFAULT_CHUNK_SIZE = 16 * 1024 * 1024

// 4 Bytes
export const HEADER_SIZE_LENGTH = Uint32Array.BYTES_PER_ELEMENT
