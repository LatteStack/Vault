import { randomUUID } from 'crypto'
import { Encryption } from './Encryption'
import { Recipient } from './Recipient'

describe('Encryptor', () => {
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
    const encryptor = new Encryption(plaintext)
    expect(encryptor).toBeDefined()
  })

  it('should throw when no recipients', async () => {
    const encryptor = new Encryption(plaintext)
    expect(() => encryptor.stream()).toThrow()
    await expect(encryptor.arrayBuffer()).rejects.toThrow()
    await expect(encryptor.text()).rejects.toThrow()
  })

  it('should can addRecipient', () => {
    const encryptor = new Encryption(plaintext)
    expect(() => encryptor.addRecipient(recipient)).not.toThrow()
  })

  describe('stream', () => {
    test.each(createSources())('should work with $type', async ({ source }) => {
      await expect(
        new Encryption(source)
          .addRecipient(recipient)
          .stream()
          .pipeTo(new WritableStream()),
      ).resolves.toBeInstanceOf(ReadableStream)
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
})
