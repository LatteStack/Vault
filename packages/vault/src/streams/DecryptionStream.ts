import { Asymmetric } from "../Asymmetric";
import { AES_TAG_LENGTH_IN_BYTES, DEFAULT_CHUNK_SIZE, AES_IV_LENGTH_IN_BYTES } from "../constants";
import { bufferToObject, bufferToUint32, concatChunks, generateHmacKeyFromBuffer, HMAC, uint32ToBuffer, withEquallySized } from "../helpers";
import { Symmetric } from "../Symmetric";
import { ExportedPackageHeader } from "../types";

function calculateEncryptedChunkSize(chunkSize: number): number {
  return AES_IV_LENGTH_IN_BYTES + chunkSize + AES_TAG_LENGTH_IN_BYTES
}

async function parseHeader(
  recipientKeyPair: CryptoKeyPair,
  header: Uint8Array,
): Promise<{
  hamcKey: CryptoKey
  symmetric: Symmetric
}> {
  const exportedHeader = bufferToObject<ExportedPackageHeader>(header)
  const contentPublicKey = await Asymmetric.importPublicKey('ECDH', exportedHeader.CPK)
  const keyThumbprint = await Asymmetric.calculateKeyThumbprint(recipientKeyPair.publicKey)
  const exportedKey = exportedHeader.recipients[keyThumbprint]

  if (typeof exportedKey !== 'string') {
    throw new Error('Invalid recipient.')
  }

  const wrappingKey = await Asymmetric.deriveWrappingKey(
    contentPublicKey,
    recipientKeyPair.privateKey
  )

  const contentEncryptionKey = await Symmetric.unwrapEncryptionKey(
    exportedKey,
    wrappingKey,
  )

  const hamcKey = await generateHmacKeyFromBuffer(header)
  const symmetric = new Symmetric(contentEncryptionKey)

  return {
    hamcKey,
    symmetric,
  }
}

export class DecryptionStream {
  static create(
    recipientKeyPair: CryptoKeyPair
  ): TransformStream<Uint8Array, Uint8Array> {
    let counter = 0

    let bufferedBytes = 0
    let buffered: Uint8Array[] = []

    let headerSize: number
    let initial: {
      hamcKey: CryptoKey
      symmetric: Symmetric
    }

    return new TransformStream(withEquallySized({
      chunkSize: calculateEncryptedChunkSize(DEFAULT_CHUNK_SIZE),
      resizeChunk: async (chunk) => {
        // If the header have been parsed, return the buffered along with the chunk
        if (initial != null) {
          return bufferedBytes > 0
            ? concatChunks(buffered.concat(chunk))
            : chunk
        }

        bufferedBytes += chunk.byteLength
        buffered.push(chunk)

        /**
         * headerSize byteLength is equal to Uint32Array.BYTES_PER_ELEMENT
         * If the headerSize is not parsed, and the buffered byteLength is greater than headerSize byteLength,
         * parse headerSize and slice the buffered.
         */
        if (headerSize == null && bufferedBytes >= Uint32Array.BYTES_PER_ELEMENT) {
          const buffer = concatChunks(buffered)
          headerSize = bufferToUint32(buffer.subarray(0, Uint32Array.BYTES_PER_ELEMENT))
          bufferedBytes -= Uint32Array.BYTES_PER_ELEMENT
          buffered = [buffer.subarray(Uint32Array.BYTES_PER_ELEMENT, buffer.byteLength)]
        }

        /**
         * If headerSize is parsed and header is not parsed and buffered byteLength is greater than headerSize,
         * parse header and return the sliced buffered.
         */
        if (headerSize != null && initial == null && bufferedBytes >= headerSize) {
          const buffer = concatChunks(buffered)
          initial = await parseHeader(
            recipientKeyPair,
            buffer.subarray(0, headerSize)
          )

          bufferedBytes -= headerSize
          buffered = []

          return buffer.subarray(headerSize, buffer.byteLength)
        }

        return new Uint8Array(0)
      },
      transform: async (chunk, controller) => {
        try {
          const additionalData = await HMAC(initial.hamcKey, uint32ToBuffer(counter))
          const plaintext = await initial.symmetric.decrypt(chunk, additionalData)

          controller.enqueue(plaintext)
          counter += 1
        } catch (error) {
          controller.error(error)
        }
      },
      flush:async (controller) => {
        if (initial == null) {
          controller.error('Invalid Source.')
        }
      }
    }))
  }
}
