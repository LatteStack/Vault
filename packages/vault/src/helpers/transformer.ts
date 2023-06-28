import { Source } from "../types";
import { textToBuffer } from "./encoder";

function smellLikeArrayBuffer(value: unknown): value is ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return true
  }

  if (value != null) {
    if ((value as Uint8Array).buffer instanceof ArrayBuffer) {
      return true
    }
  }

  return false
}

export function sourceToReadableStream(
  source: Source
): ReadableStream<BufferSource> {
  if (source instanceof ReadableStream) {
    return source
  }

  if (source instanceof Blob) {
    const stream = source.stream()

    if (stream instanceof ReadableStream) {
      return stream
    }
  }

  if (typeof source === 'string' || smellLikeArrayBuffer(source)) {
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new Uint8Array(
            typeof source === 'string'
              ? textToBuffer(source)
              : source
          )
        )
      }
    })
  }

  throw new Error('Invalid source.')
}
