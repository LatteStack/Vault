import { Asymmetric } from "../Asymmetric"
import { DEFAULT_CHUNK_SIZE } from "../constants"
import { exportKey, objectToBuffer, uint32ToBuffer } from "../helpers"
import { Symmetric } from "../Symmetric"
import { ExportedPackageHeader } from "../types"
import { EquallySizedStream } from "./EquallySizedStream"

export class EncryptionStream extends EquallySizedStream {
  private symmetric!: Symmetric

  private contentEncryptionKey!: CryptoKey

  private contentPublicKey!: CryptoKey

  private contentPrivateKey!: CryptoKey

  constructor(private readonly recipients: CryptoKey[]) {
    let chunkIndex = 0

    super({
      chunkSize: DEFAULT_CHUNK_SIZE,
      start: async (controller) => {
        try {
          await this.initialize()

          const header = await this.buildHeader()
          controller.enqueue(uint32ToBuffer(header.byteLength))
          controller.enqueue(header)
        } catch (error) {
          controller.error(error)
        }
      },
      transform: async (chunk, controller) => {
        try {
          const additionalData = uint32ToBuffer(chunkIndex)
          const ciphertext = await this.symmetric.encrypt(chunk, additionalData)

          controller.enqueue(ciphertext)
          chunkIndex += 1
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }

  private async initialize() {
    const [
      contentEncryptionKey,
      { publicKey: contentPublicKey, privateKey: contentPrivateKey }
    ] = await Promise.all([
      Symmetric.generateEncryptionKey(),
      Asymmetric.generateKeyPair('ECDH'),
    ])

    this.symmetric = new Symmetric(contentEncryptionKey)
    this.contentEncryptionKey = contentEncryptionKey
    this.contentPublicKey = contentPublicKey
    this.contentPrivateKey = contentPrivateKey
  }

  private async buildHeader(): Promise<Uint8Array> {
    const exportedHeader = objectToBuffer<ExportedPackageHeader>({
      contentPublicKey: await exportKey(this.contentPublicKey),
      recipientToWrappedCEK: await this.buildRecipients(),
    })

    return new Uint8Array(exportedHeader)
  }

  private async buildRecipients(): Promise<ExportedPackageHeader['recipientToWrappedCEK']> {
    return Object.fromEntries(
      await Promise.all<[string, string]>(
        this.recipients.map(async (recipientPublicKey) => {
          const wrappingKey = await Asymmetric.deriveWrappingKey(
            recipientPublicKey,
            this.contentPrivateKey
          )

          return Promise.all([
            Asymmetric.calculateKeyThumbprint(recipientPublicKey),
            Symmetric.wrapKey(this.contentEncryptionKey, wrappingKey)
          ])
        })
      )
    )
  }
}
