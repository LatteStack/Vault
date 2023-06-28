import { cipher } from "./utils"
import { Symmetric } from "./Symmetric";
import isEqual from "lodash/isEqual";

describe('Symmetric', () => {
  let key!: CryptoKey
  const PLAINTEXT_LENGTH = 100
  const plaintext: ArrayBuffer = new ArrayBuffer(PLAINTEXT_LENGTH)

  beforeAll(async () => {
    cipher.getRandomValues(new Uint8Array(plaintext))

    key = await cipher.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    )

  })

  describe('generateIV', () => {
    it('should work correctly', () => {
      const symmetric = new Symmetric({ key })
      const buffer = symmetric.generateIV()
      expect(buffer instanceof ArrayBuffer).toBeTruthy()
      // https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#iv
      expect(buffer.byteLength).toBe(12)
    })
  })

  describe('encrypt', () => {
    it('should work correctly', async () => {
      const symmetric = new Symmetric({ key })
      const ciphertext = await symmetric.encrypt(plaintext)
      // iv_length(12) + ciphertext_length(same as plaintext) + tag_length(16)
      expect(ciphertext.byteLength).toBe(12 + plaintext.byteLength + 16)
    })
  })

  describe('encryptFile', () => {
    it('should work correctly', async () => {
      const symmetric = new Symmetric({ key })
      const plainblob = new Blob([plaintext])
      const stream = await symmetric.encryptFile(plainblob)
      const writeCallback = jest.fn((chunk) => chunk)

      await stream.pipeTo(new WritableStream({
        write: writeCallback
      }))

      expect(writeCallback).toBeCalled()
    })
  })

  describe('decrypt', () => {
    it('should work correctly', async () => {
      const symmetric = new Symmetric({ key })
      const ciphertext = await symmetric.encrypt(plaintext)
      const actualPlaintext = await symmetric.decrypt(ciphertext)
      expect(isEqual(actualPlaintext, plaintext)).toBeTruthy()
      // expect(actualPlaintext).toEqual(plaintext)
    })
  })

  describe('AesKey', () => {
    let wrappingKey!: CryptoKey

    beforeAll(async () => {
      wrappingKey = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt", 'wrapKey', 'unwrapKey']
      )
    })

    let compositedKey!: ArrayBuffer

    // it('should correctly wrap key', async () => {
    //   const symmetric = new Symmetric({ key: wrappingKey })
    //   compositedKey = await symmetric.wrapAesKey(key)
    //   expect(compositedKey).toBeDefined()
    // })

    // it('should correctly unwrap key', async () => {
    //   const symmetric = new Symmetric({ key: wrappingKey })
    //   const rawKey = await symmetric.unwrapAesKey(compositedKey)
    //   expect(rawKey).toBeDefined()
    // })
  })
})
