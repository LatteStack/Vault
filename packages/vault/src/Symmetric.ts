import {
  AES_KEY_LENGTH_IN_BITS,
  AES_IV_LENGTH_IN_BYTES,
  AES_TAG_LENGTH_IN_BITS
} from "./constants";
import {
  bufferToBase64,
  base64ToBuffer,
  concatChunks, extractIvAndCiphertext, getRandomValues
} from "./helpers";

function generateIV(): ArrayBuffer {
  return getRandomValues(AES_IV_LENGTH_IN_BYTES)
}

export class Symmetric {
  constructor(private readonly key: CryptoKey) {}

  async encrypt(data: BufferSource, additionalData?: BufferSource): Promise<Uint8Array> {
    const iv = generateIV()
    const ciphertext = await crypto.subtle.encrypt(
      { iv, additionalData, name: "AES-GCM", tagLength: AES_TAG_LENGTH_IN_BITS },
      this.key,
      data
    )
      .catch((reason) => {
        // SubtleCrypto.encrypt usually don't throw specific error messages.
        throw class SymmetricEncryptError extends Error {
          cause = reason
        }
      })

    return concatChunks([iv, ciphertext], iv.byteLength + ciphertext.byteLength)
  }

  async decrypt(ciphertext: Uint8Array, additionalData?: BufferSource): Promise<Uint8Array> {
    const [iv, data] = extractIvAndCiphertext(ciphertext)

    const plaintext: ArrayBuffer = await crypto.subtle.decrypt(
      { iv, additionalData, name: "AES-GCM", tagLength: AES_TAG_LENGTH_IN_BITS },
      this.key,
      data
    )
      .catch((reason) => {
        // SubtleCrypto.decrypt usually don't throw specific error messages.
        throw class SymmetricDecryptError extends Error {
          cause = reason
        }
      })

    return new Uint8Array(plaintext)
  }

  static generateEncryptionKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: AES_KEY_LENGTH_IN_BITS,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  static generateWrappingKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: AES_KEY_LENGTH_IN_BITS,
      },
      true,
      ['wrapKey', 'unwrapKey']
    )
  }

  static async wrapKey(
    key: CryptoKey,
    wrappingKey: CryptoKey
  ): Promise<string> {
    const iv = generateIV()
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      key,
      wrappingKey,
      { name: 'AES-GCM', iv }
    )

    return bufferToBase64(
      concatChunks([iv, wrappedKey])
    )
  }

  static unwrapEncryptionKey(
    exportedKey: string,
    unwrappingKey: CryptoKey
  ): Promise<CryptoKey> {
    const [iv, wrappedKey] = extractIvAndCiphertext(
      base64ToBuffer(exportedKey)
    )

    return crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      unwrappingKey,
      { name: 'AES-GCM', iv },
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    )
  }

  static unwrapPrivateKey(
    algorithmName: 'ECDSA' | 'ECDH',
    exportedKey: string,
    unwrappingKey: CryptoKey
  ): Promise<CryptoKey> {
    const [iv, wrappedKey] = extractIvAndCiphertext(
      base64ToBuffer(exportedKey)
    )

    if (algorithmName === 'ECDSA') {
      return crypto.subtle.unwrapKey(
        'raw',
        wrappedKey,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        'AES-GCM',
        true,
        ["sign", "verify"]
      )
    }

    if (algorithmName === 'ECDH') {
      return crypto.subtle.unwrapKey(
        'raw',
        wrappedKey,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        'AES-GCM',
        true,
        ['deriveKey', 'deriveBits']
      )
    }

    throw new Error('Invalid algorithmName')
  }
}
