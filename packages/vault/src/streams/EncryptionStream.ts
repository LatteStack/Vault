import { Asymmetric } from '../Asymmetric'
import { DEFAULT_CHUNK_SIZE } from '../constants'
import {
  exportJwk, generateHmacKeyFromBuffer, HMAC, objectToBuffer,
  uint32ToBuffer,
} from '../helpers'
import { type BlobLike } from '../platform'
import { type Recipient } from '../Recipient'
import { Symmetric } from '../Symmetric'

interface Header {
  size: number
  contentPublicKey: JsonWebKey
  recipients: Record<string, string>
}

class EncryptionStream extends ReadableStream<Uint8Array> {}

interface Metadata {
  buffer: Uint8Array
  hamcKey: CryptoKey
  symmetric: Symmetric
}

async function createMetadata (
  source: BlobLike,
  recipients: Recipient[],
): Promise<Metadata> {
  const [
    contentEncryptionKey,
    { publicKey: contentPublicKey, privateKey: contentPrivateKey },
  ] = await Promise.all([
    Symmetric.generateEncryptionKey(),
    Asymmetric.generateKeyPair('ECDH'),
  ])

  const buffer = objectToBuffer<Header>({
    size: source.size,
    contentPublicKey: await exportJwk(contentPublicKey),
    recipients: Object.fromEntries(
      await Promise.all<[string, string]>(
        recipients.map(async (recipient) => {
          const wrappingKey = await Asymmetric.deriveWrappingKey(
            recipient.ECDH.publicKey,
            contentPrivateKey,
          )

          return await Promise.all([
            Asymmetric.calculateKeyThumbprint(recipient.ECDH.publicKey),
            Symmetric.wrapKey(contentEncryptionKey, wrappingKey),
          ])
        }),
      ),
    ),
  })

  const hamcKey = await generateHmacKeyFromBuffer(buffer)
  const symmetric = new Symmetric(contentEncryptionKey)

  return {
    buffer,
    hamcKey,
    symmetric,
  }
}

export function createEncryptionStream (
  source: BlobLike,
  recipients: Array<Recipient | Promise<Recipient>>,
): EncryptionStream {
  let metadata: Metadata
  let encryptedBytes = 0

  return new ReadableStream<[BlobLike, number]>({
    start (controller) {
      for (let counter = 0; counter < Math.floor(source.size / DEFAULT_CHUNK_SIZE); counter++) {
        const start = DEFAULT_CHUNK_SIZE * counter
        const end = DEFAULT_CHUNK_SIZE * (counter + 1)
        const data = source.slice(start, end > source.size ? source.size : end)
        controller.enqueue([data, counter])
      }
    },
  })
    .pipeThrough(new TransformStream<[BlobLike, number], Uint8Array>({
      async start (controller) {
        try {
          metadata = await createMetadata(source, await Promise.all(recipients))
          controller.enqueue(uint32ToBuffer(metadata.buffer.byteLength))
          controller.enqueue(metadata.buffer)
        } catch (error) {
          controller.error(error)
        }
      },
      async transform ([data, counter], controller) {
        try {
          const [plaintext, additionalData] = await Promise.all([
            data.arrayBuffer(),
            HMAC(metadata.hamcKey, uint32ToBuffer(counter)),
          ])

          const { iv, ciphertext } = await metadata.symmetric.encrypt(plaintext, additionalData)

          controller.enqueue(iv)
          controller.enqueue(ciphertext)
          encryptedBytes += data.size
        } catch (error) {
          controller.error(error)
        }
      },
      async flush (controller) {
        if (encryptedBytes !== source.size) {
          controller.error('The actual size of source does not match the expected size.')
        }
      },
    }))
}
