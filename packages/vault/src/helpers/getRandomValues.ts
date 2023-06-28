import { bufferToBase64 } from "./encoder"

export function getRandomValues(length: number): ArrayBuffer
export function getRandomValues(length: number, encoding: 'base64'): string
export function getRandomValues(length: number, encoding?: | 'base64'): ArrayBuffer | string {
  const buffer = new ArrayBuffer(length)
  crypto.getRandomValues(new Uint8Array(buffer))

  switch (encoding) {
    case 'base64':
      return bufferToBase64(buffer)
    default:
      return buffer
  }
}
