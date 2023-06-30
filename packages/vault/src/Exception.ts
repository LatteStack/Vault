class Exception extends Error {
  cause: any

  constructor(reason?: string, options?: {
    cause: any
  }) {
    super(reason)
    this.cause = options?.cause
  }
}

export class InvalidRecipientException extends Exception {

}
