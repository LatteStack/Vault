export type Source = string | Blob | BufferSource | ReadableStream<BufferSource>

export interface PackageHeader {
  recipients: CryptoKey[]
}

export interface ExportedPackageHeader {
  recipientToWrappedCEK: Record<string, string>
  contentPublicKey: string
}
