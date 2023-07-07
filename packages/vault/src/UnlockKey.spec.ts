import { randomUUID } from 'crypto'
import { UnlockKey } from './UnlockKey'

describe('UnlockKey', () => {
  it('should derive unlockKey from secret', async () => {
    await expect(
      UnlockKey.deriveUnlockKeyFromSecret(randomUUID()),
    ).resolves.toBeDefined()
  })

  it('should derive unlockKey from password', async () => {
    await expect(
      UnlockKey.deriveUnlockKeyFromPassword(randomUUID(), randomUUID(), 100),
    ).resolves.toBeDefined()
  })
})
