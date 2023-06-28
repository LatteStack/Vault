# Vault

## Installation

```bash
npm install @lattestack/vault
```

Installation in Node.js


## Basic usage

```typescript
import { Keychain, Encryptor, Decryptor } form '@lattestack/vault'

const myKeychain = await Keychain.generete()

const secrets = 'Some Secrets Here.'

const ciphertext = await new Encryptor(secrets)
  .addRecipient(myKeychain)
  .encrypt()

const plaintext = await new Decryptor(ciphertext)
  .setRecipient(myKeychain)
  .decrypt()

// => ture
console.log(plaintext === ciphertext)
```
