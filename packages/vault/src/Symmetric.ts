import {
  AES_KEY_LENGTH_IN_BITS,
  AES_IV_LENGTH_IN_BYTES,
  AES_TAG_LENGTH_IN_BITS,
} from './constants'
import {
  bufferToBase64Url,
  base64UrlToBuffer,
  concatChunks, extractIvAndCiphertext, getRandomValues,
} from './helpers'

function generateIV (): ArrayBuffer {
  return getRandomValues(AES_IV_LENGTH_IN_BYTES)
}

export class Symmetric {
  constructor (private readonly key: CryptoKey) {}

  async encrypt (data: BufferSource, additionalData?: BufferSource): Promise<{
    iv: Uint8Array
    ciphertext: Uint8Array
  }> {
    const iv = generateIV()
    const ciphertext = await crypto.subtle.encrypt(
      { iv, additionalData, name: 'AES-GCM', tagLength: AES_TAG_LENGTH_IN_BITS },
      this.key,
      data,
    )

    return {
      iv: new Uint8Array(iv),
      ciphertext: new Uint8Array(ciphertext),
    }
  }

  async decrypt (ciphertext: ArrayBuffer, additionalData?: ArrayBuffer): Promise<Uint8Array> {
    const [iv, data] = extractIvAndCiphertext(ciphertext)

    const plaintext: ArrayBuffer = await crypto.subtle.decrypt(
      { iv, additionalData, name: 'AES-GCM', tagLength: AES_TAG_LENGTH_IN_BITS },
      this.key,
      data,
    )

    return new Uint8Array(plaintext)
  }

  static async generateEncryptionKey (): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: AES_KEY_LENGTH_IN_BITS,
      },
      true,
      ['encrypt', 'decrypt'],
    )
  }

  static async generateWrappingKey (): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: AES_KEY_LENGTH_IN_BITS,
      },
      true,
      ['wrapKey', 'unwrapKey'],
    )
  }

  static async wrapKey (
    key: CryptoKey,
    wrappingKey: CryptoKey,
    format: KeyFormat = 'raw',
  ): Promise<string> {
    const iv = generateIV()
    const wrappedKey = await crypto.subtle.wrapKey(
      format,
      key,
      wrappingKey,
      { name: 'AES-GCM', iv },
    )

    return bufferToBase64Url(
      concatChunks([iv, wrappedKey]),
    )
  }

  static async unwrapEncryptionKey (
    exportedKey: string,
    unwrappingKey: CryptoKey,
  ): Promise<CryptoKey> {
    const [iv, wrappedKey] = extractIvAndCiphertext(
      base64UrlToBuffer(exportedKey),
    )

    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      unwrappingKey,
      { name: 'AES-GCM', iv },
      'AES-GCM',
      true,
      ['encrypt', 'decrypt'],
    )
  }

  static async unwrapPrivateKey (
    algorithmName: 'ECDSA' | 'ECDH',
    exportedKey: string,
    unwrappingKey: CryptoKey,
  ): Promise<CryptoKey> {
    const [iv, wrappedKey] = extractIvAndCiphertext(
      base64UrlToBuffer(exportedKey),
    )

    if (algorithmName === 'ECDSA') {
      return await crypto.subtle.unwrapKey(
        'jwk',
        wrappedKey,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
      )
    }

    if (algorithmName === 'ECDH') {
      return await crypto.subtle.unwrapKey(
        'jwk',
        wrappedKey,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits'],
      )
    }

    throw new Error('Invalid algorithmName')
  }
}
