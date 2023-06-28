import { bufferToText, readAllChunks, sourceToReadableStream } from "./helpers"
import { PrivateKeychain } from "./Keychain"
import { DecryptionStream } from "./streams"
import { Source } from "./types"

export class Decryptor {
  private readonly source: ReadableStream<BufferSource>

  private recipientKeyPair?: CryptoKeyPair

  constructor(source: Source) {
    this.source = sourceToReadableStream(source)
  }

  setRecipient(recipient: PrivateKeychain) {
    this.recipientKeyPair = recipient.getKeyPair('ECDH')
    return this
  }

  stream(): ReadableStream<Uint8Array> {
    if (this.recipientKeyPair == null) {
      throw new Error('Please call setRecipient first to set the recipient.')
    }

    return this.source
      .pipeThrough(new DecryptionStream(this.recipientKeyPair))
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return readAllChunks(this.stream())
  }

  async text(): Promise<string> {
    return bufferToText(
      await this.arrayBuffer()
    )
  }
}
