Vault is a wrapper around the Web Cryptography API available in modern browsers and NodeJS, it provides secure and easy-to-use cryptographic APIs for encrypting and decrypting data using AES-256-GCM and Elliptic-curve cryptography.

## Installation

```bash
npm install --save @lattestack/vault
```

## Quick Start

```javascript
import { Recipient, Encryption, Decryption } from '@lattestack/vault'

// Set your confidential data here
const plaintext = 'CONFIDENTIAL_DATA'

// Generate a Recipient representing Alice.
const alice = await Recipient.generete()

// Add Alice as a recipient,
// then encrypt the plaintext and outputs as text.
// Now only Alice can decrypt the ciphertext
const ciphertext = await new Encryption(plaintext)
  .addRecipient(alice)
  .text()

// Set Alice as the recipient,
// then decrypt the ciphertext and outputs as raw text.
const decryptedText = await new Decryption(ciphertext)
  .setRecipient(alice)
  .text()

// => true
console.log(decryptedText === plaintext)
```

## Encryption

The `Encryption` interface is used to encrypt plaintext into ciphertext. The plaintext passed into Encryption will be encrypted using a hybrid encryption scheme combining AES-256-GCM and Elliptic-curve cryptography.

* `constructor(plaintext: string | ArrayBuffer | Blob)`  

  * `plaintext`  
  The data to be encrypted. This can be String, ArrayBuffer, or Blob. Note that string here are encoded as UTF-8.

* `addRecipient(recipient: Recipient | string): this`  
  Add a recipient. This method can be called multiple times to add multiple recipients. Only the recipients added here can decrypt the corresponding data.

    * `recipient`  
    The recipient. Must be a *Recipient* instance, or a recipient's publicKey in string.

* `text(): Promise<string>`  
  Outputs ciphertext as String. Note that string here are encoded as Base64URL.

* `arrayBuffer(): Promise<ArrayBuffer>`  
  Outputs ciphertext as ArrayBuffer.

* `stream(): ReadableStream<Uint8Array>`  
  Outputs ciphertext as ReadableStream\<Uint8Array\>.

## Decryption

The `Decryption` interface is used to decrypt ciphertext into plaintext.

* `constructor(ciphertext: string | ArrayBuffer | Blob)`  

  * `ciphertext`  
  The data to be decrypted. This can be String, ArrayBuffer, or Blob. Note that string here must be the same as the Base64URL output produced during encryption.

* `setRecipient(recipient: Recipient): this`  
  Set the recipient. Only the recipient added during encryption can decrypt the data.

    * `recipient`  
    The recipient. Must be a Recipient instance.

* `text(): Promise<string>`  
  Outputs plaintext as String. Note that string here are encoded as UTF-8.

* `arrayBuffer(): Promise<ArrayBuffer>`  
  Outputs plaintext as ArrayBuffer.

* `stream(): ReadableStream<Uint8Array>`  
  Outputs plaintext as ReadableStream\<Uint8Array\>.

## Recipient

The `Recipient` interface is used to represent the owner of the data, which is usually used to represent a user. 

When encrypting, you always need to add one or more recipients. Only the recipients that have been set during encryption can decrypt the corresponding data.

* `publicKey: string`  
  The publicKey property, which does not contain any confidential information, can be openly shared. It can be passed as an argument to the *Encryption.addRecipient* function to encrypt data, but it cannot be used to decrypt data.

* `static generete(): Promise<Recipient>`  
  Generete a new Recipient. You need to associate the recipient with a specific user on your own.

* `static export(recipient: Recipient, unlockKey: UnlockKey): Promise<string>`  
  Export recipient as string. This allows you to persist the recipient to the storage.
  
  * `recipient`  
    The Recipient instance to be exported.
  * `unlockKey`  
    The UnlockKey instance used to lock the exported recipient.

* `static import(exportRecipient: string, unlockKey: UnlockKey): Promise<Recipient>`  
  Import recipient from string. This allows you to instantiate the recipient from the storage.

  * `exportRecipient`  
    The exported recipient. Must be the same as when exported.
  * `unlockKey`  
    The UnlockKey instance used to unlock the exported recipient. Must be the same as when exported.

## UnlockKey

The `UnlockKey` interface is used to protect the exported recipient from being stolen or misused. The unlockKey must be provided when importing or exporting the recipient.

* `static fromSecret(secret: string): Promise<UnlockKey>`  
  Derive unlockKey from secret. It is not recommended to use this method to derive the unlockKey on the client-side because clients typically lack a secure way to store secrets.

  * `secret`  
    The secret. For security, secret shoule be a high-entropy random string.

* `static fromPassword(password: string, salt: string, iterations: number): Promise<UnlockKey>`  
  Derive unlockKey from password with PBKDF2-HMAC-SHA256.

  * `password`  
    The password to mix with the salt. You should set a password policy to prevent weak password.

  * `salt`  
    The salt to mix with the password. The salt should be a random value of at least 16 bytes to prevent the use of rainbow tables and other precomputed attacks. Salt does not need to be kept secret.

  * `iterations`  
    The number of times the hash function will be executed.

## Examples

* **Generate recipients**

  ```javascript
  import { Recipient } from '@lattestack/vault'

  // Generate a recipient representing Alice.
  const alice = await Recipient.generete()
  // Generate a recipient representing Bob.
  const bob = await Recipient.generete()
  ```

* **Export and persist recipient to storage**

  ```javascript
  import { Recipient, UnlockKey } from '@lattestack/vault'

  // Derive unlockKey from custom secret
  const secret = process.env.CUSTOM_SECRET
  const unlockKey = await UnlockKey.fromSecret(secret)
  
  // Generate a recipient representing Alice.
  const alice = await Recipient.generete()
  // Export recipient(Alice) with unlockKey
  const exportedAlice = Recipient.export(alice, unlockKey)

  await storage.save('alice', exportedAlice)
  ```

* **Import and instantiate recipient from storage**

  ```javascript
  import { Recipient, UnlockKey } from '@lattestack/vault'

  // Derive unlockKey from custom secret
  const secret = process.env.CUSTOM_SECRET
  const unlockKey = await UnlockKey.fromSecret(secret)

  // Retrieve exported recipient(Alice) from storage
  const exportedAlice = await storage.get('alice')
  // Import recipient(Alice) with unlockKey
  const alice = await Recipient.import(exportedAlice, unlockKey)
  ```

* **Derives unlockKey from the password provided by user**

  ```javascript
  import { UnlockKey } from '@lattestack/vault'

  const email = window.prompt('your email')
  const password = window.prompt('your password')

  // After successful login, return the salt and iterations corresponding to the email.
  const { salt, iterations } = await login(email, password)

  const unlockKey = await UnlockKey.fromPassword(
    password,
    salt,
    iterations
  )
  ```

* **Encrypt text data**

  ```javascript
  import { Recipient, Encryption } from '@lattestack/vault'

  const alice = await Recipient.import(/**/)

  const ciphertext = await new Encryption('DATA')
    .addRecipient(alice)
    .text()
  ```

* **Encrypt binary data**

  ```jsx
  import { Recipient, Encryption } from '@lattestack/vault'

  const alice = await Recipient.import(/**/)

  const buffer = new TextEncoder().encode('DATA')
  const ciphertext = await new Encryption(buffer)
    .addRecipient(alice)
    .arrayBuffer()
  ```

* **Encrypt file by streaming**  
  This allows you to encrypt large files with less memory.
  ```jsx
  import { Recipient, Encryption } from '@lattestack/vault'

  const alice = await Recipient.import(/**/)

  const fileStream = new Blob([/**/]).stream()
  const encryptionStream = new Encryption(fileStream)
    .addRecipient(alice)
    .stream()
  ```

* **Public-key encryption**  
  Public-key encryption lets you add multiple recipients to the data without sharing the secrets of each recipient.

  ```jsx
  const registry = new Map()

  // Alice share her publicKey with the public registry.
  const alice = await Recipient.import(/**/)
  registry.set('alice', alice.publicKey)

  // Bob share his publicKey with the public registry.
  const bob = await Recipient.import(/**/)
  registry.set('bob', bob.publicKey)

  // Carol share his publicKey with the public registry.
  const carol = await Recipient.import(/**/)
  registry.set('carol', carol.publicKey)

  // Encrypt the secrets by the three and add all three of them as recipients.
  // We encrypt the data using publicKey(s) here.
  const ciphertext = await new Encryption('SECRETS')
    .addRecipient(registry.get('alice'))
    .addRecipient(registry.get('bob'))
    .addRecipient(registry.get('carol'))
    .text()

  // All three were then able to decrypt the data.
  await new Decryption(ciphertext).setRecipient(alice).text()
  await new Decryption(ciphertext).setRecipient(bob).text()
  await new Decryption(ciphertext).setRecipient(carol).text()
  ```

## How It Works

TODO

## License

Distributed under the Dual License. See `LICENSE` for more information.
