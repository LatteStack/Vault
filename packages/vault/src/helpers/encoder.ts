import * as Base64 from 'js-base64'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function normalizeText (text: string): string {
  return text.trim().normalize('NFKD')
}

export function textToBuffer (text: string): Uint8Array {
  return new Uint8Array(textEncoder.encode(text).buffer)
}

export function bufferToText (buffer: ArrayBuffer): string {
  return textDecoder.decode(buffer)
}

export function bufferToBase64Url (buffer: ArrayBuffer): string {
  return Base64.fromUint8Array(new Uint8Array(buffer), true)
}

export function base64UrlToBuffer (text: string): Uint8Array {
  return Base64.toUint8Array(text)
}

export function objectToBuffer<T = unknown> (object: T): Uint8Array {
  return textToBuffer(
    JSON.stringify(object),
  )
}

export function bufferToObject<T = unknown> (buffer: ArrayBuffer): T {
  return JSON.parse(
    bufferToText(buffer),
  )
}

export function objectToBase64Url<T = unknown> (object: T): string {
  return bufferToBase64Url(
    objectToBuffer(object),
  )
}

export function base64UrlToObject<T = unknown> (base64: string): T {
  return bufferToObject(
    base64UrlToBuffer(base64),
  )
}

export function uint32ToBuffer (int32: number): Uint8Array {
  const uint8Array = new Uint8Array(Uint32Array.BYTES_PER_ELEMENT)
  new DataView(uint8Array.buffer).setUint32(0, int32)
  return uint8Array
}

export function bufferToUint32 (buffer: ArrayBufferLike): number {
  return new DataView(new Uint8Array(buffer).buffer).getUint32(0)
}
