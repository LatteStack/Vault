import { isEqual } from "lodash";
import { Asymmetric } from "./Asymmetric";
import { exportKey } from "./helpers";

describe('Asymmetric', () => {
  describe('generateKeyPair', () => {
    it('should work', async () => {
      expect(
        Asymmetric.generateKeyPair('ECDH')
      ).resolves.toBeDefined()
      expect(
        Asymmetric.generateKeyPair('ECDSA')
      ).resolves.toBeDefined()
    })
  })

  describe('deriveWrappingKey', () => {
    it('should work', async () => {
      const bob = await Asymmetric.generateKeyPair('ECDH')
      const alice = await Asymmetric.generateKeyPair('ECDH')
      expect(
        Asymmetric.deriveWrappingKey(bob.publicKey, alice.privateKey)
      ).resolves.toBeDefined()
      expect(
        Asymmetric.deriveWrappingKey(alice.publicKey, bob.privateKey)
      ).resolves.toBeDefined()
    })
  })

  describe('importPublicKey', () => {
    it('should work', async () => {
      const exportedKey = await exportKey((await Asymmetric.generateKeyPair('ECDH')).publicKey)
      expect(
        Asymmetric.importPublicKey('ECDH', exportedKey)
      ).resolves.toBeDefined()
    })
  })

  describe('calculateKeyThumbprint', () => {
    it('should work', async () => {
      const { publicKey, privateKey } = await Asymmetric.generateKeyPair('ECDH')

      expect(Asymmetric.calculateKeyThumbprint(publicKey)).resolves.toBeDefined()
      expect(Asymmetric.calculateKeyThumbprint(privateKey)).resolves.toBeDefined()
      expect(isEqual(
        await Asymmetric.calculateKeyThumbprint(publicKey),
        await Asymmetric.calculateKeyThumbprint(publicKey),
      )).toBeTruthy()
    })
  })

})
