import { InvalidRecipientException } from "./Exception"
import { base64UrlToBuffer, bufferToText, readAllChunks } from "./helpers"
import { PrivateKeychain } from "./Keychain"
import { DecryptionStream } from "./streams"

export class Decryption {
  private readonly source: ReadableStream<Uint8Array>

  private recipientKeyPair?: CryptoKeyPair

  constructor(source: BodyInit) {
    const response = new Response(
      typeof source === 'string' ? base64UrlToBuffer(source) : source
    )

    if (response.body == null) {
      throw new Error('Invalid source.')
    }

    this.source = response.body
  }

  setRecipient(recipient: PrivateKeychain): this {
    if (recipient instanceof PrivateKeychain !== true) {
      throw new InvalidRecipientException('Recipient must be instanceof PrivateKeychain')
    }

    this.recipientKeyPair = recipient.getKeyPair('ECDH')
    return this
  }

  stream(): ReadableStream<Uint8Array> {
    if (this.recipientKeyPair == null) {
      throw new Error('Please call setRecipient first to set the recipient.')
    }

    return this.source
      .pipeThrough(DecryptionStream.create(this.recipientKeyPair))
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await readAllChunks(this.stream())).buffer
  }

  async text(): Promise<string> {
    return bufferToText(
      await this.arrayBuffer()
    )
  }
}
