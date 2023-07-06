export interface BlobLike {
  size: number
  slice: (start?: number, end?: number) => BlobLike
  arrayBuffer: () => Promise<ArrayBuffer>
}

export function isBlobLike (object: unknown): object is BlobLike {
  return typeof object !== 'undefined' &&
    typeof (object as Blob).size === 'number' &&
    typeof (object as Blob).slice === 'function' &&
    typeof (object as Blob).arrayBuffer === 'function'
}

export function isBuffer (object: unknown): object is ArrayBuffer {
  if (typeof object !== 'undefined') {
    return object instanceof ArrayBuffer
      ? true
      : typeof (object as Uint8Array).byteLength === 'number'
  }

  return false
}
