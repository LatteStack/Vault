import { z } from "zod"
import {
  base64ToObject,
  exportKey,
  normalizeText,
  objectToBase64,
  textToBuffer,
  digest
} from "./helpers"
import { Asymmetric } from "./Asymmetric"
import { Symmetric } from "./Symmetric"

type ExportedKeychain<Type extends 'Public' | 'Private'> = {
  ECDSA: Type extends 'Private'
    ? { publicKey: string, encryptedPrivateKey: string }
    : { publicKey: string }
  ECDH: Type extends 'Private'
    ? { publicKey: string, encryptedPrivateKey: string }
    : { publicKey: string }
}

function makeImportPublicKeySchema(
  algorithmName: 'ECDSA' | 'ECDH'
): z.ZodEffects<z.ZodString, CryptoKey, string> {
  return z.string().transform<CryptoKey>(async (exportedKey: string) => {
    return await Asymmetric.importPublicKey(algorithmName, exportedKey)
  })
}

function makeImportPrivateKeySchema(
  algorithmName: 'ECDSA' | 'ECDH',
  unlockKey: CryptoKey
): z.ZodEffects<z.ZodString, CryptoKey, string> {
  return z.string().transform<CryptoKey>(async (encryptedPrivateKey: string) => {
    return await Symmetric.unwrapPrivateKey(
      algorithmName,
      encryptedPrivateKey,
      unlockKey
    )
  })
}

export abstract class Keychain {
  abstract ECDSA: {
    publicKey: CryptoKey
    privateKey?: CryptoKey
  }

  abstract ECDH: {
    publicKey: CryptoKey
    privateKey?: CryptoKey
  }

  abstract getPublicKey(algorithmName: 'ECDSA' | 'ECDH'): CryptoKey

  abstract getPrivateKey?(algorithmName: 'ECDSA' | 'ECDH'): CryptoKey

  abstract export(key?: CryptoKey): Promise<string>

  static async generate(): Promise<PrivateKeychain> {
    const [ECDSA, ECDH] = await Promise.all([
      Asymmetric.generateKeyPair('ECDSA'),
      Asymmetric.generateKeyPair('ECDH')
    ])

    return new PrivateKeychain({ ECDSA, ECDH })
  }

  static async fromPrivate(
    exportedPrivateKeychain: string,
    unlockKey: CryptoKey
  ): Promise<PrivateKeychain> {
    return await PrivateKeychain.import(exportedPrivateKeychain, unlockKey)
  }

  static async fromPublic(exportedPublicKeychain: string): Promise<PublicKeychain> {
    return await PublicKeychain.import(exportedPublicKeychain)
  }
}

export class PrivateKeychain extends Keychain {
  ECDSA: {
    publicKey: CryptoKey
    privateKey: CryptoKey
  }

  ECDH: {
    publicKey: CryptoKey
    privateKey: CryptoKey
  }

  constructor(initial: Pick<PrivateKeychain, 'ECDH' | 'ECDSA'>) {
    super()
    this.ECDSA = initial.ECDSA
    this.ECDH = initial.ECDH
  }

  getPublicKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
      ? this.ECDSA.publicKey
      : this.ECDH.publicKey
  }

  getPrivateKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
    ? this.ECDSA.privateKey
    : this.ECDH.privateKey
  }

  getKeyPair(algorithmName: "ECDSA" | "ECDH"): CryptoKeyPair {
    return algorithmName === 'ECDSA'
      ? this.ECDSA
      : this.ECDH
  }

  async exportPublic(): Promise<string> {
    return objectToBase64<ExportedKeychain<'Public'>>({
      ECDSA: {
        publicKey: await exportKey(this.ECDSA.publicKey),
      },
      ECDH: {
        publicKey: await exportKey(this.ECDH.publicKey),
      }
    })
  }

  static async import(
    exportedPrivateKeychain: string,
    unlockKey: CryptoKey
  ): Promise<PrivateKeychain> {
    const { ECDSA, ECDH } = await z.object({
      ECDSA: z.object({
        publicKey: makeImportPublicKeySchema('ECDSA'),
        encryptedPrivateKey: makeImportPrivateKeySchema('ECDSA', unlockKey)
      }),
      ECDH: z.object({
        publicKey: makeImportPublicKeySchema('ECDH'),
        encryptedPrivateKey: makeImportPrivateKeySchema('ECDH', unlockKey),
      }),
    }).parseAsync(
      base64ToObject(exportedPrivateKeychain)
    )

    return new PrivateKeychain({
      ECDSA: {
        publicKey: ECDSA.publicKey,
        privateKey: ECDSA.encryptedPrivateKey,
      },
      ECDH: {
        publicKey: ECDH.publicKey,
        privateKey: ECDH.encryptedPrivateKey,
      },
    })
  }

  async export(key: CryptoKey): Promise<string> {
    const exported: ExportedKeychain<'Private'> = {
      ECDSA: {
        publicKey: await exportKey(this.ECDSA.publicKey),
        encryptedPrivateKey: await Symmetric.wrapKey(this.ECDSA.privateKey, key),
      },
      ECDH: {
        publicKey: await exportKey(this.ECDH.publicKey),
        encryptedPrivateKey: await Symmetric.wrapKey(this.ECDH.privateKey, key),
      }
    }

    return objectToBase64(exported)
  }
}

export class PublicKeychain extends Keychain {
  ECDSA: {
    publicKey: CryptoKey
  }

  ECDH: {
    publicKey: CryptoKey
  }

  constructor(initial: Pick<PublicKeychain, 'ECDH' | 'ECDSA'>) {
    super()
    this.ECDSA = initial.ECDSA
    this.ECDH = initial.ECDH
  }

  getPublicKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
      ? this.ECDSA.publicKey
      : this.ECDH.publicKey
  }

  getPrivateKey(): CryptoKey {
    throw new Error('Unable to get privateKey in PublicKeychain.')
  }

  async export(): Promise<string> {
    return objectToBase64<ExportedKeychain<'Public'>>({
      ECDSA: {
        publicKey: await exportKey(this.ECDSA.publicKey),
      },
      ECDH: {
        publicKey: await exportKey(this.ECDH.publicKey),
      }
    })
  }

  static async import(exportedPublicKeychain: string): Promise<PublicKeychain> {
    const encryptedPrivateKeySchema = z.never({
      invalid_type_error: [
        'Keychain.fromPublic cannot be used to import private keychains',
        'Please use Keychain.fromPrivate instead.'
      ].join('\n'),
    }).nullish()

    const { ECDSA, ECDH } = await z.object({
      ECDSA: z.object({
        publicKey: makeImportPublicKeySchema('ECDSA'),
        encryptedPrivateKey: encryptedPrivateKeySchema,
      }),
      ECDH: z.object({
        publicKey: makeImportPublicKeySchema('ECDH'),
        encryptedPrivateKey: encryptedPrivateKeySchema,
      }),
    }).parseAsync(
      base64ToObject(exportedPublicKeychain)
    )

    return new PublicKeychain({
      ECDSA,
      ECDH,
    })
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
  salt: string,
  iterations?: number
}): Promise<CryptoKey> {
  const { passphrase, salt, iterations } = await z.object({
    passphrase: z.string()
      .trim()
      .transform((value) => normalizeText(value))
      .transform((value) => textToBuffer(value)),
    salt: z.string()
      .trim()
      .transform((value) => textToBuffer(value)),
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
      salt,
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
