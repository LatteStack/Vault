import { z } from 'zod'
import { digest, normalizeText, textToBuffer } from './helpers'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UnlockKey {
  static async deriveUnlockKeyFromSecret (secret: string): Promise<CryptoKey> {
    const keyMaterial = await digest(textToBuffer(secret))
    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey'],
    )
  }

  static async deriveUnlockKeyFromPassword (
    password: string,
    salt: string,
    iterations: number,
  ): Promise<CryptoKey> {
    const options = await z.object({
      password: z.string()
        .trim()
        .transform((value) => textToBuffer(normalizeText(value))),
      salt: z.string()
        .trim()
        .transform((value) => textToBuffer(value)),
      iterations: z.number()
        .int(),
    }).parseAsync({
      password,
      salt,
      iterations,
    })

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      options.password,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    )

    return await crypto.subtle.deriveKey(
      {
        salt: options.salt,
        iterations: options.iterations,
        name: 'PBKDF2',
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey'],
    )
  }
}
