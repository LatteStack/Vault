import { isEqual } from 'lodash'
import { Asymmetric } from './Asymmetric'
import { exportJwk } from './helpers'

describe('Asymmetric', () => {
  describe('generateKeyPair', () => {
    it('should work', async () => {
      await expect(
        Asymmetric.generateKeyPair('ECDH')
      ).resolves.toBeDefined()
      await expect(
        Asymmetric.generateKeyPair('ECDSA')
      ).resolves.toBeDefined()
    })
  })

  describe('deriveWrappingKey', () => {
    it('should work', async () => {
      const bob = await Asymmetric.generateKeyPair('ECDH')
      const alice = await Asymmetric.generateKeyPair('ECDH')
      await expect(
        Asymmetric.deriveWrappingKey(bob.publicKey, alice.privateKey)
      ).resolves.toBeDefined()
      await expect(
        Asymmetric.deriveWrappingKey(alice.publicKey, bob.privateKey)
      ).resolves.toBeDefined()
    })
  })

  describe('importPublicKey', () => {
    it('should work', async () => {
      const exportedKey = await exportJwk((await Asymmetric.generateKeyPair('ECDH')).publicKey)
      await expect(
        Asymmetric.importPublicKey('ECDH', exportedKey)
      ).resolves.toBeDefined()
    })
  })

  describe('calculateKeyThumbprint', () => {
    it('should work', async () => {
      const { publicKey, privateKey } = await Asymmetric.generateKeyPair('ECDH')

      await expect(Asymmetric.calculateKeyThumbprint(publicKey)).resolves.toBeDefined()
      await expect(Asymmetric.calculateKeyThumbprint(privateKey)).resolves.toBeDefined()
      expect(isEqual(
        await Asymmetric.calculateKeyThumbprint(publicKey),
        await Asymmetric.calculateKeyThumbprint(publicKey)
      )).toBeTruthy()
    })
  })
})
