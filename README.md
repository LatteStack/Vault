Vault is a wrapper around the Web Cryptography API available in modern browsers and NodeJS, it provides secure and easy-to-use cryptographic APIs for encrypting and decrypting data using AES-256-GCM and Elliptic-curve cryptography.

Cryptography is difficult to get right. With Vault, you can encrypt data with just a few lines of code, with built-in security guarantees to help you avoid pitfalls.

## Installation
```bash
npm install --save @lattestack/vault
```

## Usage

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
