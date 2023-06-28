import { z } from "zod";
import { AES_IV_LENGTH_IN_BYTES } from "../constants";
import { bufferToBase64, textToBuffer } from "./encoder";

export async function exportKey(key: CryptoKey): Promise<string> {
  return bufferToBase64(
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

export function digest(data: BufferSource) {
  return crypto.subtle.digest(
    { name: 'SHA-256' },
    data
  )
}
