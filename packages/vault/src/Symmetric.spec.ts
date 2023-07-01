import { Symmetric } from './Symmetric'
import isEqual from 'lodash/isEqual'

describe('Symmetric', () => {
  let key!: CryptoKey
  const PLAINTEXT_LENGTH = 100
  const plaintext: Uint8Array = new Uint8Array(PLAINTEXT_LENGTH)

  beforeAll(async () => {
    crypto.getRandomValues(new Uint8Array(plaintext))

    key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )
  })

  describe('encrypt', () => {
    it('should work correctly', async () => {
      const symmetric = new Symmetric(key)
      const ciphertext = await symmetric.encrypt(plaintext)
      // iv_length(12) + ciphertext_length(same as plaintext) + tag_length(16)
      expect(ciphertext.byteLength).toBe(12 + plaintext.byteLength + 16)
    })
  })

  describe('decrypt', () => {
    it('should work correctly', async () => {
      const symmetric = new Symmetric(key)
      const ciphertext = await symmetric.encrypt(plaintext)
      const actualPlaintext = await symmetric.decrypt(ciphertext)
      expect(isEqual(actualPlaintext, plaintext)).toBeTruthy()
      // expect(actualPlaintext).toEqual(plaintext)
    })
  })
})
