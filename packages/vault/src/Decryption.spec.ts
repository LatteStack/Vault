import { Encryption } from './Encryption'
import { Decryption } from './Decryption'
import { randomBytes, randomInt, randomUUID } from 'crypto'
import { Recipient } from './Recipient'
import { isEqual } from 'lodash'
import { DEFAULT_CHUNK_SIZE } from './constants'

describe('Decryption', () => {
  let recipient: Recipient

  const plaintext = randomUUID()
  const plaintextBuffer = new TextEncoder().encode(plaintext).buffer

  beforeAll(async () => {
    recipient = await Recipient.generate()
  })

  it('should work with string', async () => {
    expect(isEqual(
      plaintext,
      await new Decryption(
        await new Encryption(plaintext)
          .addRecipient(recipient)
          .text(),
      )
        .setRecipient(recipient)
        .text(),
    ))
  })

  it('should work with arrayBuffer', async () => {
    expect(isEqual(
      plaintextBuffer,
      await new Decryption(
        await new Encryption(plaintext)
          .addRecipient(recipient)
          .arrayBuffer(),
      )
        .setRecipient(recipient)
        .arrayBuffer(),
    ))
  })

  it('should work with Blob', async () => {
    expect(isEqual(
      plaintextBuffer,
      await new Decryption(
        new Blob([
          await new Encryption(plaintext)
            .addRecipient(recipient)
            .arrayBuffer(),
        ]),
      )
        .setRecipient(recipient)
        .arrayBuffer(),
    ))
  })

  it('should work with large file', async () => {
    const largeFile = randomBytes(
      randomInt(DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 4),
    ).buffer

    expect(isEqual(
      largeFile,
      await new Decryption(
        await new Encryption(largeFile)
          .addRecipient(recipient)
          .arrayBuffer(),
      )
        .setRecipient(recipient)
        .arrayBuffer(),
    ))
      .toBeTruthy()
  })
})
