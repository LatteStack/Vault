import { randomBytes, randomInt, randomUUID } from 'crypto'
import { DEFAULT_CHUNK_SIZE } from './constants'
import { Encryption } from './Encryption'
import { Recipient } from './Recipient'

describe('Encryption', () => {
  let recipient: Recipient

  const plaintext = randomUUID()
  const plaintextBuffer = new TextEncoder().encode(plaintext).buffer
  const createSources = (): Array<{
    type: string
    source: string | Blob | ArrayBuffer
  }> => {
    return [
      { type: 'String', source: plaintext },
      { type: 'ArrayBuffer', source: plaintextBuffer },
      { type: 'Uint8Array', source: new Uint8Array(plaintextBuffer) },
      { type: 'Blob', source: new Blob([plaintextBuffer]) },
    ]
  }

  beforeAll(async () => {
    recipient = await Recipient.generate()
  })

  it('should be defined', () => {
    const encryption = new Encryption(plaintext)
    expect(encryption).toBeDefined()
  })

  it('should throw when no recipients', async () => {
    const encryption = new Encryption(plaintext)
    expect(() => encryption.stream()).toThrow()
    await expect(encryption.arrayBuffer()).rejects.toThrow()
    await expect(encryption.text()).rejects.toThrow()
  })

  it('should can addRecipient', async () => {
    const encryption = new Encryption(plaintext)
    expect(() => encryption.addRecipient(recipient)).not.toThrow()
    expect(() => encryption.addRecipient(recipient.publicKey)).not.toThrow()
    await expect(encryption.arrayBuffer()).resolves.toBeDefined()
  })

  describe('stream', () => {
    test.each(createSources())('it should work with $type', async ({ source }) => {
      const write = jest.fn((chunk) => {
        expect(chunk instanceof Uint8Array)
      })

      await expect(
        new Encryption(source)
          .addRecipient(recipient)
          .stream()
          .pipeTo(new WritableStream({ write })),
      ).resolves.not.toThrow()
    })
  })

  describe('arrayBuffer', () => {
    test.each(createSources())('should work with $type', async ({ source }) => {
      await expect(
        new Encryption(source)
          .addRecipient(recipient)
          .arrayBuffer(),
      ).resolves.toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('text', () => {
    test.each(createSources())('should work with $type', async ({ source }) => {
      await expect(
        new Encryption(source)
          .addRecipient(recipient)
          .text(),
      ).resolves.toBeDefined()
    })
  })

  it('should work with large file', async () => {
    const largeFile = new Blob([
      randomBytes(randomInt(DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 4)),
    ])

    await expect(
      new Encryption(largeFile)
        .addRecipient(recipient)
        .stream()
        .pipeTo(new WritableStream()),
    ).resolves.not.toThrow()
  })
})
