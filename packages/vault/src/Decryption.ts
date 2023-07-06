import './compatible'
import { InvalidCipherextException, InvalidRecipientException } from './Exception'
import { base64UrlToBuffer, bufferToText, readAllChunks } from './helpers'
import { type BlobLike, isBuffer, isBlobLike } from './platform'
import { Recipient } from './Recipient'
import { createDecryptionStream } from './streams'

export class Decryption {
  private readonly source: BlobLike

  private recipient?: Recipient

  constructor (ciphertext: string | ArrayBuffer | BlobLike) {
    if (isBlobLike(ciphertext)) {
      this.source = ciphertext
    } else if (isBuffer(ciphertext)) {
      this.source = new Blob([ciphertext])
    } else if (typeof ciphertext === 'string') {
      this.source = new Blob([base64UrlToBuffer(ciphertext)])
    } else {
      throw new InvalidCipherextException()
    }
  }

  setRecipient (recipient: Recipient): this {
    if (!(recipient instanceof Recipient)) {
      throw new InvalidRecipientException()
    }

    this.recipient = recipient
    return this
  }

  stream (): ReadableStream<Uint8Array> {
    if (this.recipient == null) {
      throw new Error('The recipient must be set.')
    }

    return createDecryptionStream(this.source, this.recipient)
  }

  async arrayBuffer (): Promise<ArrayBuffer> {
    return (await readAllChunks(this.stream())).buffer
  }

  async text (): Promise<string> {
    return bufferToText(
      await this.arrayBuffer(),
    )
  }
}
