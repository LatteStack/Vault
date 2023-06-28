import { Asymmetric } from "../Asymmetric";
import { AES_TAG_LENGTH_IN_BYTES, DEFAULT_CHUNK_SIZE, AES_IV_LENGTH_IN_BYTES } from "../constants";
import { bufferToObject, bufferToUint32, concatChunks, uint32ToBuffer } from "../helpers";
import { Symmetric } from "../Symmetric";
import { ExportedPackageHeader, PackageHeader } from "../types";
import { EquallySizedStream } from "./EquallySizedStream";

function calculateEncryptedChunkSize(chunkSize: number): number {
  return AES_IV_LENGTH_IN_BYTES + chunkSize + AES_TAG_LENGTH_IN_BYTES
}

export class DecryptionStream extends EquallySizedStream {
  private symmetric!: Symmetric

  constructor(private readonly recipientKeyPair: CryptoKeyPair) {
    let chunkIndex = 0

    let bufferedBytes = 0
    let buffered: Uint8Array[] = []

    let headerSize: number
    let header: any

    super({
      chunkSize: calculateEncryptedChunkSize(DEFAULT_CHUNK_SIZE),
      resizeChunk: (chunk) => {
        // If the header have been parsed, return the buffered along with the chunk
        if (header != null) {
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
          headerSize = bufferToUint32(buffer.slice(0, Uint32Array.BYTES_PER_ELEMENT))

          bufferedBytes -= Uint32Array.BYTES_PER_ELEMENT
          buffered = [buffer.slice(Uint32Array.BYTES_PER_ELEMENT, buffer.byteLength)]
        }

        /**
         * If headerSize is parsed and header is not parsed and buffered byteLength is greater than headerSize,
         * parse header and slice the buffered.
         */
        if (headerSize != null && header === null && bufferedBytes >= headerSize) {
          const buffer = concatChunks(buffered)
          header = bufferToObject<PackageHeader>(buffer.slice(0, headerSize))

          bufferedBytes -= headerSize
          buffered = [buffer.slice(headerSize, buffer.byteLength)]
        }

        return new Uint8Array(0)
      },
      transform: async (chunk, controller) => {
        try {
          const additionalData = uint32ToBuffer(chunkIndex)
          const plaintext = await this.symmetric.decrypt(chunk, additionalData)

          controller.enqueue(plaintext)
          chunkIndex += 1
        } catch (error) {
          controller.error(error)
        }
      }
    })
  }

  async parseHeader(exportedHeader: ExportedPackageHeader): Promise<void> {
    const contentPublicKey = await Asymmetric.importPublicKey('ECDH', exportedHeader.contentPublicKey)
    const keyThumbprint = await Asymmetric.calculateKeyThumbprint(this.recipientKeyPair.publicKey)
    const exportedKey = exportedHeader.recipientToWrappedCEK[keyThumbprint]

    if (typeof exportedKey !== 'string') {
      throw new Error('Invalid recipient.')
    }

    const wrappingKey = await Asymmetric.deriveWrappingKey(
      contentPublicKey,
      this.recipientKeyPair.privateKey
    )

    const contentEncryptionKey = await Symmetric.unwrapEncryptionKey(
      exportedKey,
      wrappingKey,
    )

    this.symmetric = new Symmetric(contentEncryptionKey)
  }
}
