import { z } from "zod"
import {
  AES_KEY_LENGTH_IN_BITS,
 } from "./constants"
import { bufferToBase64Url, digest, textToBuffer } from "./helpers"

export class Asymmetric {
  static async deriveWrappingKey(
    publicKey: CryptoKey,
    privateKey: CryptoKey
  ): Promise<CryptoKey> {
    const sharedSecret = await crypto.subtle.deriveBits(
      { public: publicKey, name: 'ECDH' },
      privateKey,
      AES_KEY_LENGTH_IN_BITS
    )

    /**
     * In the case of [Elliptic Curve] Diffie-Hellman outputs,
     * the result of the key exchange algorithm is a random group element,
     * but not necessarily uniformly random bit string.
     * There’s some structure to the output of these functions.
     * This is why you always, at minimum, apply a cryptographic hash function
     * to the output of [EC]DH before using it as a symmetric key.
     * See: https://soatok.blog/2021/11/17/understanding-hkdf/
     */
    const keyMaterial = await digest(sharedSecret)

    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM', length: AES_KEY_LENGTH_IN_BITS },
      true,
      ['wrapKey', 'unwrapKey']
    )
  }

  static importPublicKey(
    algorithmName: 'ECDSA' | 'ECDH',
    keyData: JsonWebKey
  ): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: algorithmName, namedCurve: 'P-256' },
      true,
      algorithmName === 'ECDSA' ? ['verify'] : []
    )
  }

  static generateKeyPair(algorithmName: 'ECDSA' | 'ECDH'): Promise<CryptoKeyPair> {
    if (algorithmName === 'ECDSA') {
      return crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["sign", "verify"]
      )
    }

    if (algorithmName === 'ECDH') {
      return crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ['deriveKey', 'deriveBits']
      )
    }

    throw new Error('Invalid algorithmName')
  }

  static async calculateKeyThumbprint(key: CryptoKey) {
    const jwk = await crypto.subtle.exportKey('jwk', key)
    const { crv, kty, x, y } = z.object({
      crv: z.string(),
      kty: z.string(),
      x: z.string(),
      y: z.string(),
    }).parse(jwk)

    const thumbprint = await digest(
      textToBuffer(
        // Members MUST remain in lexicographical order to generate the same thumbprint.
        // See: https://datatracker.ietf.org/doc/html/rfc7638#section-3.2
        JSON.stringify({ crv, kty, x, y })
      )
    )

    return bufferToBase64Url(thumbprint)
  }
}
