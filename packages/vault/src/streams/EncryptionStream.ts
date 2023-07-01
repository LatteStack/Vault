import { Asymmetric } from '../Asymmetric'
import { DEFAULT_CHUNK_SIZE } from '../constants'
import {
  exportJwk, generateHmacKeyFromBuffer, HMAC, objectToBuffer,
  uint32ToBuffer, withEquallySized
} from '../helpers'
import { Symmetric } from '../Symmetric'
import { type ExportedPackageHeader } from '../types'

async function initialize (recipients: CryptoKey[]): Promise<{
  header: Uint8Array
  hamcKey: CryptoKey
  symmetric: Symmetric
}> {
  const [
    contentEncryptionKey,
    { publicKey: contentPublicKey, privateKey: contentPrivateKey }
  ] = await Promise.all([
    Symmetric.generateEncryptionKey(),
    Asymmetric.generateKeyPair('ECDH')
  ])

  const header = objectToBuffer<ExportedPackageHeader>({
    contentPublicKey: await exportJwk(contentPublicKey),
    recipients: Object.fromEntries(
      await Promise.all<[string, string]>(
        recipients.map(async (recipientPublicKey) => {
          const wrappingKey = await Asymmetric.deriveWrappingKey(
            recipientPublicKey,
            contentPrivateKey
          )

          return await Promise.all([
            Asymmetric.calculateKeyThumbprint(recipientPublicKey),
            Symmetric.wrapKey(contentEncryptionKey, wrappingKey)
          ])
        })
      )
    )
  })

  const hamcKey = await generateHmacKeyFromBuffer(header)
  const symmetric = new Symmetric(contentEncryptionKey)

  return {
    header,
    hamcKey,
    symmetric
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EncryptionStream {
  static create (recipients: CryptoKey[]): TransformStream<Uint8Array, Uint8Array> {
    let counter = 0
    const initial = initialize(recipients)

    return new TransformStream<Uint8Array, Uint8Array>(withEquallySized({
      chunkSize: DEFAULT_CHUNK_SIZE,
      start: async (controller) => {
        try {
          const { header } = await initial
          controller.enqueue(uint32ToBuffer(header.byteLength))
          controller.enqueue(header)
        } catch (error) {
          controller.error(error)
        }
      },
      transform: async (chunk, controller) => {
        try {
          const { symmetric, hamcKey } = await initial
          const additionalData = await HMAC(hamcKey, uint32ToBuffer(counter))
          const ciphertext = await symmetric.encrypt(chunk, additionalData)

          controller.enqueue(ciphertext)
          counter += 1
        } catch (error) {
          controller.error(error)
        }
      }
    }))
  }
}
