import { InvalidPlaintextException } from './Exception'
import {
  bufferToBase64Url,
  readAllChunks,
  textToBuffer,
} from './helpers'
import { createEncryptionStream } from './streams'
import { isBlobLike, isBuffer, type BlobLike } from './platform'
import { Recipient } from './Recipient'

export class Encryption {
  private readonly source: BlobLike

  private readonly recipients: Array<Recipient | Promise<Recipient>> = []

  constructor (plaintext: string | ArrayBuffer | BlobLike) {
    if (isBlobLike(plaintext)) {
      this.source = plaintext
    } else if (isBuffer(plaintext)) {
      this.source = new Blob([plaintext])
    } else if (typeof plaintext === 'string') {
      this.source = new Blob([textToBuffer(plaintext)])
    } else {
      throw new InvalidPlaintextException()
    }
  }

  addRecipient (recipient: Recipient | string): this {
    this.recipients.push(
      typeof recipient === 'string'
        ? Recipient.fromPublicKey(recipient)
        : recipient,
    )
    return this
  }

  stream (): ReadableStream<Uint8Array> {
    if (this.recipients.length === 0) {
      throw new Error('At least one recipient must be added.')
    }

    return createEncryptionStream(this.source, this.recipients)
  }

  async arrayBuffer (): Promise<ArrayBuffer> {
    return (await readAllChunks(this.stream())).buffer
  }

  async text (): Promise<string> {
    return bufferToBase64Url(
      await this.arrayBuffer(),
    )
  }
}
