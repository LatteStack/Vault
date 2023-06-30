import { Encryption } from "./Encryption";
import { Decryption } from "./Decryption";
import { Keychain, PrivateKeychain } from "./Keychain";
import { randomBytes, randomInt } from "crypto";

describe('Decryptor', () => {
  const plaintext = randomBytes(randomInt(100)).toString('hex')

  const bobKeychain = Keychain.generate()
  const aliceKeychain = Keychain.generate()
  const ciphertext = Promise.all([bobKeychain, aliceKeychain])
    .then(([bob, alice]) => {
      return new Encryption(plaintext)
        .addRecipient(bob)
        .addRecipient(alice)
        .text()
    })
  const ciphertextBuffer = Promise.all([bobKeychain, aliceKeychain])
    .then(([bob, alice]) => {
      return new Encryption(plaintext)
        .addRecipient(bob)
        .addRecipient(alice)
        .arrayBuffer()
    })

  const createSources = (): Array<[Promise<BodyInit>, Promise<PrivateKeychain>]> => {
    const sources: Array<[Promise<BodyInit>, Promise<PrivateKeychain>]> = []

    for (const keychain of [bobKeychain, aliceKeychain]) {
      [
        ciphertext,
        Promise.resolve(ciphertextBuffer),
        Promise.resolve(ciphertextBuffer).then((buffer) => new Uint8Array(buffer)),
        Promise.resolve(ciphertextBuffer).then((buffer) => new Blob([buffer])),
        Promise.resolve(ciphertextBuffer).then((buffer) => new ReadableStream({
          start: (controller) => {
            controller.enqueue(buffer)
            controller.close()
          }
        })),
      ].forEach((source) => {
        sources.push([source, keychain])
      })
    }

    return sources
  }

  it('should be defined', async () => {
    const encryptor = new Decryption(await ciphertext)
    expect(encryptor).toBeDefined()
  })

  it('should throw when no recipients', async () => {
    const encryptor = new Decryption(await ciphertext)
    expect(() => encryptor.stream()).toThrow()
    expect(encryptor.arrayBuffer()).rejects.toThrow()
    expect(encryptor.text()).rejects.toThrow()
  })

  it('should can setRecipient', async () => {
    const encryptor = new Decryption(await ciphertext)
    expect(Promise.resolve(
      encryptor.setRecipient(await bobKeychain)
    )).resolves.not.toThrow()
    expect(Promise.resolve(
      encryptor
        .setRecipient(await bobKeychain)
        .setRecipient(await aliceKeychain)
    )).resolves.not.toThrow()
  })

  it('should throw when source is invalid base64', async () => {
    const invalidSource = `${await ciphertext}35`
    await expect(
      new Decryption(invalidSource)
        .setRecipient(await bobKeychain)
        .text()
    ).rejects.toBeDefined()
  })

  it('should throw when source is invalid arrayBuffer', async () => {
    const invalidSource = (await ciphertextBuffer).slice(0, 10)
    await expect(
      new Decryption(invalidSource)
        .setRecipient(await bobKeychain)
        .arrayBuffer()
    ).rejects.toBeDefined()
  })

  describe('stream', () => {
    test.each(createSources())('it should work with different source.', async (source, keychain) => {
      const stream = new Decryption(await source)
        .setRecipient(await keychain)
        .stream()
      expect(stream).toBeInstanceOf(ReadableStream)
      const write = jest.fn()
      await expect(
        stream.pipeTo(new WritableStream({ write }))
      ).resolves.not.toThrow()
      expect(write).toHaveBeenCalled()
    })
  })

  describe('arrayBuffer', () => {
    test.each(createSources())('it should work with different source.', async (source, keychain) => {
      const arrayBuffer = await new Decryption(await source)
        .setRecipient(await keychain)
        .arrayBuffer()
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('text', () => {
    test.each(createSources())('it should work with different source.', async (source, keychain) => {
      const text = await new Decryption(await source)
        .setRecipient(await keychain)
        .text()
      expect(typeof text === 'string').toBeTruthy()
    })
  })
})
