import { Asymmetric } from '../Asymmetric'
import { AES_TAG_LENGTH_IN_BYTES, DEFAULT_CHUNK_SIZE, AES_IV_LENGTH_IN_BYTES, HEADER_SIZE_LENGTH } from '../constants'
import { InvalidRecipientException } from '../Exception'
import { bufferToObject, bufferToUint32, generateHmacKeyFromBuffer, HMAC, uint32ToBuffer } from '../helpers'
import { type BlobLike } from '../platform'
import { type Recipient } from '../Recipient'
import { Symmetric } from '../Symmetric'

function calculateEncryptedChunkSize (chunkSize: number): number {
  return AES_IV_LENGTH_IN_BYTES + chunkSize + AES_TAG_LENGTH_IN_BYTES
}

class DecryptionStream extends ReadableStream<Uint8Array> {}

interface Metadata {
  size: number
  hamcKey: CryptoKey
  symmetric: Symmetric
}

interface Header {
  size: number
  contentPublicKey: JsonWebKey
  recipients: Record<string, string>
}

async function parseMetadata (
  header: ArrayBuffer,
  recipient: Recipient,
): Promise<Metadata> {
  const exportedHeader = bufferToObject<Header>(header)
  const contentPublicKey = await Asymmetric.importPublicKey('ECDH', exportedHeader.contentPublicKey)
  const keyThumbprint = await Asymmetric.calculateKeyThumbprint(recipient.ECDH.publicKey)
  const exportedKey = exportedHeader.recipients[keyThumbprint]

  if (typeof exportedKey !== 'string' || recipient.ECDH.privateKey == null) {
    throw new InvalidRecipientException()
  }

  const wrappingKey = await Asymmetric.deriveWrappingKey(
    contentPublicKey,
    recipient.ECDH.privateKey,
  )

  const contentEncryptionKey = await Symmetric.unwrapEncryptionKey(
    exportedKey,
    wrappingKey,
  )

  const hamcKey = await generateHmacKeyFromBuffer(header)
  const symmetric = new Symmetric(contentEncryptionKey)

  return {
    size: exportedHeader.size,
    hamcKey,
    symmetric,
  }
}

export function createDecryptionStream (
  source: BlobLike,
  recipient: Recipient,
): DecryptionStream {
  let metadata: Metadata
  let decryptedBytes = 0

  return new ReadableStream<[BlobLike, number]>({
    async start (controller) {
      try {
        const headerSize = bufferToUint32(
          await source.slice(0, HEADER_SIZE_LENGTH).arrayBuffer(),
        )

        metadata = await parseMetadata(
          await source.slice(HEADER_SIZE_LENGTH, HEADER_SIZE_LENGTH + headerSize).arrayBuffer(),
          recipient,
        )

        const restSource = source.slice(HEADER_SIZE_LENGTH + headerSize, source.size)
        const chunkSize = calculateEncryptedChunkSize(DEFAULT_CHUNK_SIZE)

        for (let counter = 0; counter < Math.ceil(restSource.size / chunkSize); counter++) {
          const start = chunkSize * counter
          const end = start + chunkSize
          const data = restSource.slice(start, end > restSource.size ? restSource.size : end)

          controller.enqueue([data, counter])
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
    .pipeThrough(new TransformStream<[BlobLike, number], Uint8Array>({
      async transform ([data, counter], controller) {
        try {
          const [ciphertext, additionalData] = await Promise.all([
            data.arrayBuffer(),
            HMAC(metadata.hamcKey, uint32ToBuffer(counter)),
          ])

          const plaintext = await metadata.symmetric.decrypt(ciphertext, additionalData)

          controller.enqueue(plaintext)
          decryptedBytes += plaintext.byteLength
        } catch (error) {
          controller.error(error)
        }
      },
      async flush (controller) {
        if (decryptedBytes !== metadata.size) {
          controller.error('The decrypted bytes does not match the expected size.')
        }
      },
    }))
}
