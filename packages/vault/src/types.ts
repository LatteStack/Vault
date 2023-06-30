export type Source = string | Blob | BufferSource | ReadableStream<BufferSource>

export interface PackageHeader {
  recipients: CryptoKey[]
}

export interface ExportedPackageHeader {
  recipients: Record<string, string>
  CPK: string
}
