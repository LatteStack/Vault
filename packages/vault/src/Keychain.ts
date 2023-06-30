import { z } from "zod"
import {
  base64UrlToObject,
  exportJwk,
  objectToBase64Url,
} from "./helpers"
import { Asymmetric } from "./Asymmetric"
import { Symmetric } from "./Symmetric"

type ExportedKeychain<Type extends 'Public' | 'Private'> = {
  ECDSA: Type extends 'Private'
    ? { publicKey: JsonWebKey, wrappedPrivateKey: string }
    : { publicKey: JsonWebKey }
  ECDH: Type extends 'Private'
    ? { publicKey: JsonWebKey, wrappedPrivateKey: string }
    : { publicKey: JsonWebKey }
}

function makeImportPublicKeySchema(
  algorithmName: 'ECDSA' | 'ECDH'
): z.ZodType<CryptoKey, z.ZodTypeDef, JsonWebKey> {
  return z
    .custom<JsonWebKey>((exportedKey) => typeof exportedKey === 'object')
    .transform<CryptoKey>(async (exportedKey: any) => {
      return await Asymmetric.importPublicKey(algorithmName, exportedKey)
    })
}

function makeImportPrivateKeySchema(
  algorithmName: 'ECDSA' | 'ECDH',
  unlockKey: CryptoKey
): z.ZodEffects<z.ZodString, CryptoKey, string> {
  return z.string().transform<CryptoKey>(async (wrappedPrivateKey: string) => {
    return await Symmetric.unwrapPrivateKey(
      algorithmName,
      wrappedPrivateKey,
      unlockKey
    )
  })
}

export abstract class Keychain {
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
  readonly #ECDSA: CryptoKeyPair

  readonly #ECDH: CryptoKeyPair

  constructor(initial: {
    ECDSA: CryptoKeyPair
    ECDH: CryptoKeyPair
  }) {
    super()
    this.#ECDSA = initial.ECDSA
    this.#ECDH = initial.ECDH
  }

  getPublicKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
      ? this.#ECDSA.publicKey
      : this.#ECDH.publicKey
  }

  getPrivateKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
    ? this.#ECDSA.privateKey
    : this.#ECDH.privateKey
  }

  getKeyPair(algorithmName: "ECDSA" | "ECDH"): CryptoKeyPair {
    return algorithmName === 'ECDSA'
      ? this.#ECDSA
      : this.#ECDH
  }

  async exportPublic(): Promise<string> {
    return objectToBase64Url<ExportedKeychain<'Public'>>({
      ECDSA: {
        publicKey: await exportJwk(this.#ECDSA.publicKey),
      },
      ECDH: {
        publicKey: await exportJwk(this.#ECDH.publicKey),
      }
    })
  }

  static async import(
    exportedPrivateKeychain: string,
    unlockKey: CryptoKey
  ): Promise<PrivateKeychain> {
    const exportedKeychain = base64UrlToObject(exportedPrivateKeychain)
    const { ECDSA, ECDH } = await z.object({
      ECDSA: z.object({
        publicKey: makeImportPublicKeySchema('ECDSA'),
        wrappedPrivateKey: makeImportPrivateKeySchema('ECDSA', unlockKey)
      }),
      ECDH: z.object({
        publicKey: makeImportPublicKeySchema('ECDH'),
        wrappedPrivateKey: makeImportPrivateKeySchema('ECDH', unlockKey),
      }),
    }).parseAsync(exportedKeychain)

    return new PrivateKeychain({
      ECDSA: {
        publicKey: ECDSA.publicKey,
        privateKey: ECDSA.wrappedPrivateKey,
      },
      ECDH: {
        publicKey: ECDH.publicKey,
        privateKey: ECDH.wrappedPrivateKey,
      },
    })
  }

  async export(key: CryptoKey): Promise<string> {
    const exported: ExportedKeychain<'Private'> = {
      ECDSA: {
        publicKey: await exportJwk(this.#ECDSA.publicKey),
        wrappedPrivateKey: await Symmetric.wrapKey(this.#ECDSA.privateKey, key, 'jwk'),
      },
      ECDH: {
        publicKey: await exportJwk(this.#ECDH.publicKey),
        wrappedPrivateKey: await Symmetric.wrapKey(this.#ECDH.privateKey, key, 'jwk'),
      }
    }

    return objectToBase64Url(exported)
  }
}

export class PublicKeychain extends Keychain {
  readonly #exported: string

  #ECDSA: Pick<CryptoKeyPair, 'publicKey'>

  #ECDH: Pick<CryptoKeyPair, 'publicKey'>

  constructor(initial: {
    exported: string
    ECDSA: Pick<CryptoKeyPair, 'publicKey'>
    ECDH: Pick<CryptoKeyPair, 'publicKey'>
  }) {
    super()
    this.#exported = initial.exported
    this.#ECDSA = initial.ECDSA
    this.#ECDH = initial.ECDH
  }

  override toString() {
    return this.#exported
  }

  toJSON() {
    return this.toString()
  }

  getPublicKey(algorithmName: "ECDSA" | "ECDH"): CryptoKey {
    return algorithmName === 'ECDSA'
      ? this.#ECDSA.publicKey
      : this.#ECDH.publicKey
  }

  getPrivateKey(): CryptoKey {
    throw new Error('Unable to get privateKey in PublicKeychain.')
  }

  async export(): Promise<string> {
    return objectToBase64Url<ExportedKeychain<'Public'>>({
      ECDSA: {
        publicKey: await exportJwk(this.#ECDSA.publicKey),
      },
      ECDH: {
        publicKey: await exportJwk(this.#ECDH.publicKey),
      }
    })
  }

  static async import(exportedPublicKeychain: string): Promise<PublicKeychain> {
    const wrappedPrivateKeySchema = z.never({
      invalid_type_error: [
        'Keychain.fromPublic cannot be used to import private keychains',
        'Please use Keychain.fromPrivate instead.'
      ].join('\n'),
    }).nullish()

    const { ECDSA, ECDH } = await z.object({
      ECDSA: z.object({
        publicKey: makeImportPublicKeySchema('ECDSA'),
        wrappedPrivateKey: wrappedPrivateKeySchema,
      }),
      ECDH: z.object({
        publicKey: makeImportPublicKeySchema('ECDH'),
        wrappedPrivateKey: wrappedPrivateKeySchema,
      }),
    }).parseAsync(
      base64UrlToObject(exportedPublicKeychain)
    )

    return new PublicKeychain({
      ECDSA,
      ECDH,
      exported: exportedPublicKeychain,
    })
  }
}
