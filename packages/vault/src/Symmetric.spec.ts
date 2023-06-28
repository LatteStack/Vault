import { Symmetric } from './Symmetric'
import { isEqual } from 'lodash'
import { concatChunks } from './helpers'

describe('Symmetric', () => {
  let key!: CryptoKey
  const plaintext: Uint8Array = crypto.getRandomValues(new Uint8Array(100))

  beforeAll(async () => {
    key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt'],
    )
  })

  it('should encrypt and decrypt', async () => {
    const symmetric = new Symmetric(key)
    const { iv, ciphertext } = await symmetric.encrypt(plaintext)
    const decrypted = await symmetric.decrypt(concatChunks([iv, ciphertext]))
    expect(isEqual(plaintext, decrypted))
  })
})
