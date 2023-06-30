import { concatChunks } from "./stream"

export function withEquallySized(options: Transformer<Uint8Array, Uint8Array> & {
  chunkSize: number
  resizeChunk?: (chunk: Uint8Array) => Uint8Array | Promise<Uint8Array>
}): Transformer<Uint8Array, Uint8Array> {
  let bufferedBytes = 0
  let buffered: ArrayBuffer[] = []

  return {
    start: async (controller) => {
      if (options.start != null) {
        await options.start(controller)
      }
    },
    transform: async (_chunk, controller) => {
      const chunk: Uint8Array = options.resizeChunk != null
        ? await options.resizeChunk(_chunk)
        : _chunk

      bufferedBytes += chunk.byteLength
      buffered.push(chunk)

      if (bufferedBytes >= options.chunkSize) {
        const buffer = concatChunks(buffered, bufferedBytes)
        let offset = 0

        while (bufferedBytes >= options.chunkSize) {
          if (options.transform != null) {
            await options.transform(
              buffer.subarray(offset, offset + options.chunkSize),
              controller,
            )
          }

          bufferedBytes -= options.chunkSize
          offset += options.chunkSize
        }

        buffered = [buffer.subarray(offset, buffer.byteLength)]
      }
    },
    flush: async (controller) => {
      if (bufferedBytes > 0) {
        if (options.transform != null) {
          await options.transform(
            concatChunks(buffered, bufferedBytes),
            controller
          )
        }
      }

      if (options.flush != null) {
        await options.flush(controller)
      }
    },
  }
}

