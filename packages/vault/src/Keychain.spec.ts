/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  Keychain,
  PrivateKeychain,
  PublicKeychain,
} from './Keychain'
import { Symmetric } from './Symmetric'

describe('Keychain', () => {
  it('should generate unlock key', async () => {
    await expect(Keychain.generate()).resolves.toBeDefined()
  })

  it('should export PrivateKeychain', async () => {
    const privateKeychain = await Keychain.generate()
    const unlockKey = await Symmetric.generateWrappingKey()
    await expect(privateKeychain.export(unlockKey)).resolves.toBeDefined()
    // @ts-expect-error
    await expect(privateKeychain.export()).rejects.toBeDefined()
  })

  it('should export PublicKeychain', async () => {
    const privateKeychain = await Keychain.generate()
    const exportedPublicKeychain = await privateKeychain.exportPublic()
    const publicKeychain = await Keychain.fromPublic(exportedPublicKeychain)
    await expect(publicKeychain.export()).resolves.toBeDefined()
    expect(typeof JSON.stringify(publicKeychain) === 'string').toBeTruthy()
    expect(JSON.stringify(publicKeychain)).toEqual(JSON.stringify(exportedPublicKeychain))
  })

  it('should import PublicKeychain', async () => {
    const keychain = await Keychain.generate()
    const exportedPublicKeychain = await keychain.exportPublic()
    await expect(Keychain.fromPublic(exportedPublicKeychain)).resolves.toBeInstanceOf(PublicKeychain)
    await expect(Keychain.fromPublic('')).rejects.toBeDefined()
    await expect(Keychain.fromPublic('')).rejects.toBeDefined()
  })

  it('should import PrivateKeychain', async () => {
    const keychain = await Keychain.generate()
    const unlockKey = await Symmetric.generateWrappingKey()
    const exportedPrivateKeychain = await keychain.export(unlockKey)
    await expect(Keychain.fromPrivate(exportedPrivateKeychain, unlockKey)).resolves.toBeInstanceOf(PrivateKeychain)
    // @ts-expect-error
    await expect(Keychain.fromPrivate()).rejects.toBeDefined()
  })
})
