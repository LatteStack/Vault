import { Encryptor } from "./Encryptor";
import { Keychain } from "./Keychain";

describe('Encryptor', () => {
  let bobKeychain: Keychain

  const plaintext = 'plaintext'
  const plaintextBuffer = new TextEncoder().encode(plaintext).buffer
  const createSources = (): BodyInit[] => {
    return [
      plaintext,
      plaintextBuffer,
      new Uint8Array(plaintextBuffer),
      new Blob([plaintextBuffer]),
      new ReadableStream({
        start: (controller) => {
          controller.enqueue(plaintextBuffer)
          controller.close()
        }
      })
    ]
  }

  beforeAll(async () => {
    bobKeychain = await Keychain.generate()
  })

  it('should be defined', () => {
    const encryptor = new Encryptor(plaintext)
    expect(encryptor).toBeDefined()
  })

  it('should throw when no recipients', () => {
    const encryptor = new Encryptor(plaintext)
    expect(() => encryptor.stream()).toThrow()
    expect(encryptor.arrayBuffer()).rejects.toThrow()
    expect(encryptor.text()).rejects.toThrow()
  })

  it('should can addRecipient', () => {
    const encryptor = new Encryptor(plaintext)
    expect(() => encryptor.addRecipient(bobKeychain)).not.toThrow()
  })

  describe('stream', () => {
    createSources().forEach((source) => {
      it(`should return a ReadableStream when source is ${source.constructor.name}`, () => {
        const stream = new Encryptor(source)
          .addRecipient(bobKeychain)
          .stream()
        expect(stream).toBeInstanceOf(ReadableStream)
      })
    })
  })


  describe('arrayBuffer', () => {
    createSources().forEach((source) => {
      it(`should return a arrayBuffer when source is ${source.constructor.name}`, async () => {
        const arrayBuffer = await new Encryptor(source)
          .addRecipient(bobKeychain)
          .arrayBuffer()

        expect(arrayBuffer).toBeInstanceOf(ArrayBuffer)
      })
    })
  })

  describe('text', () => {
    createSources().forEach((source) => {
      it(`should return a text when source is ${source.constructor.name}`, async () => {
        const text = await new Encryptor(source)
          .addRecipient(bobKeychain)
          .text()
        expect(typeof text === 'string').toBeTruthy()
      })
    })
  })

})
