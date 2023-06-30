import { z } from "zod";
import { AES_IV_LENGTH_IN_BYTES } from "../constants";
import { Symmetric } from "../Symmetric";
import { bufferToBase64Url, normalizeText, objectToBase64Url, textToBuffer } from "./encoder";

export async function exportKey(key: CryptoKey): Promise<string> {
  return objectToBase64Url(
    await crypto.subtle.exportKey('jwk', key)
  )
}

export async function exportJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key)
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


export async function deriveUnlockKeyFromSecret(secret: string): Promise<CryptoKey> {
  const keyMaterial = await digest(textToBuffer(secret))
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

export async function generateUnlockKey(): Promise<string> {
  return exportKey(
    await Symmetric.generateWrappingKey()
  )
}

export async function deriveUnlockKeyFromPassword(options: {
  password: string,
  salt?: string,
  iterations?: number
}): Promise<CryptoKey> {
  const { password: passphrase, salt, iterations } = await z.object({
    password: z.string()
      .trim()
      .transform((value) => textToBuffer(normalizeText(value))),
    salt: z.string()
      .trim()
      .transform((value) => textToBuffer(value))
      .nullish(),
    iterations: z.number()
      .int()
      .default(10_0000)
  }).parseAsync(options)

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passphrase,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      salt: salt ?? passphrase,
      iterations,
      name: "PBKDF2",
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}
