import {
  bufferToBase64Url,
  readAllChunks
} from './helpers'
import { type Keychain } from './Keychain'
import { EncryptionStream } from './streams'

export class Encryption {
  private readonly source: ReadableStream<Uint8Array>

  private recipients?: CryptoKey[]

  constructor (source: BodyInit) {
    const response = new Response(source)

    if (response.body == null) {
      throw new Error('Invalid source.')
    }

    this.source = response.body
  }

  addRecipient (recipient: Keychain): this {
    const publicKey = recipient.getPublicKey('ECDH')

    if (!Array.isArray(this.recipients)) {
      this.recipients = []
    }

    if (!this.recipients.includes(publicKey)) {
      this.recipients.push(publicKey)
    }

    return this
  }

  stream (): ReadableStream<Uint8Array> {
    if (this.recipients == null || this.recipients.length === 0) {
      throw new Error('Please call addRecipient first to add recipient.')
    }

    return this.source
      .pipeThrough(EncryptionStream.create(this.recipients))
  }

  async arrayBuffer (): Promise<ArrayBuffer> {
    return (await readAllChunks(this.stream())).buffer
  }

  async text (): Promise<string> {
    return bufferToBase64Url(
      await this.arrayBuffer()
    )
  }
}
