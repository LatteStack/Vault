import {
  bufferToBase64,
  readAllChunks,
  sourceToReadableStream,
} from "./helpers"
import { Keychain } from "./Keychain"
import { EncryptionStream } from "./streams";
import { Source } from "./types";

export class Encryptor {
  private readonly source: ReadableStream<BufferSource>

  private recipients?: CryptoKey[]

  constructor(source: Source) {
    this.source = sourceToReadableStream(source)
  }

  addRecipient(recipient: Keychain) {
    const publicKey = recipient.getPublicKey('ECDH')

    if (!Array.isArray(this.recipients)) {
      this.recipients = []
    }

    if (!this.recipients.includes(publicKey)) {
      this.recipients.push(publicKey)
    }

    return this
  }

  stream(): ReadableStream<Uint8Array> {
    if (this.recipients == null || this.recipients.length === 0) {
      throw new Error('Please call addRecipient first to add recipient.')
    }

    return this.source
      .pipeThrough(new EncryptionStream(this.recipients))
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return readAllChunks(this.stream())
  }

  async text(): Promise<string> {
    return bufferToBase64(
      await this.arrayBuffer()
    )
  }
}

