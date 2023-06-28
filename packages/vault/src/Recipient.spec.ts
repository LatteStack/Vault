import { AES_KEY_LENGTH_IN_BITS } from './constants'
import { Recipient } from './Recipient'

describe('Recipient', () => {
  let wrappingKey: CryptoKey

  beforeAll(async () => {
    wrappingKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: AES_KEY_LENGTH_IN_BITS,
      },
      true,
      ['wrapKey', 'unwrapKey'],
    )
  })

  it('should be defined', async () => {
    const recipient = await Recipient.generate()
    expect(recipient).toBeDefined()
    expect(recipient.ECDH).toBeDefined()
    expect(recipient.ECDSA).toBeDefined()
    expect(recipient.publicKey).toBeDefined()
  })

  it('should export', async () => {
    const recipient = await Recipient.generate()
    const exported = await Recipient.export(recipient, wrappingKey)
    expect(exported).toBeDefined()
  })

  it('should import', async () => {
    const exported = await Recipient.export(await Recipient.generate(), wrappingKey)
    const recipient = await Recipient.import(exported, wrappingKey)
    expect(recipient).toBeDefined()
    expect(recipient.ECDH).toBeDefined()
    expect(recipient.ECDSA).toBeDefined()
    expect(recipient.publicKey).toBeDefined()
  })

  it('should import from publicKey', async () => {
    const publicKey = (await Recipient.generate()).publicKey
    const recipient = await Recipient.fromPublicKey(publicKey)
    expect(recipient).toBeDefined()
    expect(recipient.ECDH).toBeDefined()
    expect(recipient.ECDSA).toBeDefined()
    expect(recipient.publicKey).toBeDefined()
  })
})
