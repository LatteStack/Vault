import { AES_IV_LENGTH_IN_BYTES } from "../constants";
import { bufferToBase64Url } from "./encoder";

export async function exportKey(key: CryptoKey): Promise<string> {
  return bufferToBase64Url(
    await crypto.subtle.exportKey('raw', key)
  )
}

export function extractIvAndCiphertext(data: Uint8Array): [Uint8Array, Uint8Array] {
  const uint8Array = new Uint8Array(data)

  return [
    uint8Array.subarray(0, AES_IV_LENGTH_IN_BYTES),
    uint8Array.subarray(AES_IV_LENGTH_IN_BYTES, data.byteLength),
  ]
}

export async function digest(data: BufferSource): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest(
      { name: 'SHA-256' },
      data
    )
  )
}

export async function generateHmacKeyFromBuffer( keyMaterial: BufferSource ): Promise<CryptoKey> {
  const keyData = await digest(keyMaterial)
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export function HMAC(key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    { name: 'HMAC' },
    key,
    data
  )
}

export function getRandomValues(length: number): Uint8Array
export function getRandomValues(length: number, encoding: 'base64'): string
export function getRandomValues(length: number, encoding?: | 'base64'): Uint8Array | string {
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)

  switch (encoding) {
    case 'base64':
      return bufferToBase64Url(buffer)
    default:
      return buffer
  }
}
