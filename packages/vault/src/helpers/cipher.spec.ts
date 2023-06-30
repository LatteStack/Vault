import {
  exportKey,
extractIvAndCiphertext,
digest,
getRandomValues,
generateHmacKeyFromBuffer,
HMAC,
 } from "./cipher";

describe('cipher', () => {
  describe('exportKey', () => {
    it('should work', async () => {
      const { publicKey } = await crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["sign", "verify"]
      )

      expect(exportKey(publicKey)).resolves.toBeDefined()
    })
  })

  describe('extractIvAndCiphertext', () => {
    it('should work', async () => {
      expect(extractIvAndCiphertext(new Uint8Array(100))).toBeDefined()
    })
  })

  describe('digest', () => {
    it('should work', async () => {
      expect(digest(new Uint8Array(100))).resolves.toBeDefined()
      const hash = await digest(new Uint8Array(100))
      expect(hash.byteLength).toBe(32)
    })
  })

  describe('generateHmacKeyFromBuffer', () => {
    it('should work', async () => {
      expect(generateHmacKeyFromBuffer(new Uint8Array(100))).resolves.toBeDefined()
    })
  })

  describe('HMAC', () => {
    it('should work', async () => {
      const key = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      ) as CryptoKey

      expect(HMAC(key, new Uint8Array(10))).resolves.toBeDefined()
      const hash = await HMAC(key, new Uint8Array(100))
      expect(hash.byteLength).toBe(32)
    })
  })

  describe('getRandomValues', () => {
    it('should work', async () => {
      expect(getRandomValues(10)).toBeInstanceOf(Uint8Array)
      expect(
        getRandomValues(10).every((value) => value === 0)
      ).toBeFalsy()
    })
  })
})