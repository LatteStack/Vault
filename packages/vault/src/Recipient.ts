import { z } from 'zod'
import { Asymmetric } from './Asymmetric'
import { InvalidRecipientException } from './Exception'
import {
  base64UrlToObject,
  exportJwk, objectToBase64Url,
} from './helpers'
import { Symmetric } from './Symmetric'

interface KeyPair {
  privateKey?: CryptoKey
  publicKey: CryptoKey
}

function makeImportPublicKeySchema (
  algorithmName: 'ECDSA' | 'ECDH',
): z.ZodType<CryptoKey, z.ZodTypeDef, JsonWebKey> {
  return z
    .custom<JsonWebKey>((exportedKey) => typeof exportedKey === 'object')
    .transform<CryptoKey>(async (exportedKey: any) => {
    return await Asymmetric.importPublicKey(algorithmName, exportedKey)
  })
}

function makeImportPrivateKeySchema (
  algorithmName: 'ECDSA' | 'ECDH',
  unlockKey: CryptoKey,
): z.ZodEffects<z.ZodString, CryptoKey, string> {
  return z.string().transform<CryptoKey>(async (wrappedPrivateKey: string) => {
    return await Symmetric.unwrapPrivateKey(
      algorithmName,
      wrappedPrivateKey,
      unlockKey,
    )
  })
}

export class Recipient {
  readonly ECDH: KeyPair

  readonly ECDSA: KeyPair

  readonly publicKey: string

  constructor (initial: {
    ECDH: KeyPair
    ECDSA: KeyPair
    publicKey: string
  }) {
    const { ECDH, ECDSA, publicKey } = initial
    this.ECDH = ECDH
    this.ECDSA = ECDSA
    this.publicKey = publicKey
  }

  static async generate (): Promise<Recipient> {
    const [ECDH, ECDSA] = await Promise.all([
      Asymmetric.generateKeyPair('ECDH'),
      Asymmetric.generateKeyPair('ECDSA'),
    ])

    const publicKey = objectToBase64Url({
      ECDH: await exportJwk(ECDH.publicKey),
      ECDSA: await exportJwk(ECDSA.publicKey),
    })

    return new Recipient({ ECDSA, ECDH, publicKey })
  }

  static async export (recipient: Recipient, unlockKey: CryptoKey): Promise<string> {
    if (recipient.ECDSA.privateKey == null || recipient.ECDH.privateKey == null) {
      throw new InvalidRecipientException()
    }

    return objectToBase64Url({
      ECDSA: {
        publicKey: await exportJwk(recipient.ECDSA.publicKey),
        privateKey: await Symmetric.wrapKey(recipient.ECDSA.privateKey, unlockKey, 'jwk'),
      },
      ECDH: {
        publicKey: await exportJwk(recipient.ECDH.publicKey),
        privateKey: await Symmetric.wrapKey(recipient.ECDH.privateKey, unlockKey, 'jwk'),
      },
    })
  }

  static async import (exportRecipient: string, unlockKey: CryptoKey): Promise<Recipient> {
    const { ECDSA, ECDH } = await z.object({
      ECDH: z.object({
        publicKey: makeImportPublicKeySchema('ECDH'),
        privateKey: makeImportPrivateKeySchema('ECDH', unlockKey),
      }),
      ECDSA: z.object({
        publicKey: makeImportPublicKeySchema('ECDSA'),
        privateKey: makeImportPrivateKeySchema('ECDSA', unlockKey),
      }),
    }).parseAsync(
      base64UrlToObject(exportRecipient),
    )

    const publicKey = objectToBase64Url({
      ECDH: await exportJwk(ECDH.publicKey),
      ECDSA: await exportJwk(ECDSA.publicKey),
    })

    return new Recipient({
      publicKey,
      ECDH: {
        publicKey: ECDH.publicKey,
        privateKey: ECDH.privateKey,
      },
      ECDSA: {
        publicKey: ECDSA.publicKey,
        privateKey: ECDSA.privateKey,
      },
    })
  }

  static async fromPublicKey (publicKey: string): Promise<Recipient> {
    const publicKeys = await z.object({
      ECDH: makeImportPublicKeySchema('ECDH'),
      ECDSA: makeImportPublicKeySchema('ECDSA'),
    }).parseAsync(
      base64UrlToObject(publicKey),
    )

    return new Recipient({
      publicKey,
      ECDH: { publicKey: publicKeys.ECDH },
      ECDSA: { publicKey: publicKeys.ECDSA },
    })
  }
}
