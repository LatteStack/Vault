import { concatChunks } from "../helpers"

export class EquallySizedStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(
    initial: Transformer<Uint8Array, Uint8Array> & {
      chunkSize: number
      resizeChunk?: (chunk: Uint8Array) => Uint8Array
    }
  ) {
    const { chunkSize } = initial

    let bufferedBytes = 0
    let buffered: ArrayBuffer[] = []

    super({
      transform: async (_chunk, controller) => {
        try {
          const chunk = initial.resizeChunk != null
            ? initial.resizeChunk(_chunk)
            : _chunk

          bufferedBytes += chunk.byteLength
          buffered.push(chunk)

          if (bufferedBytes >= chunkSize) {
            const buffer = concatChunks(buffered, bufferedBytes)
            let offset = 0

            while (bufferedBytes >= chunkSize) {
              if (initial.transform != null) {
                await initial.transform(
                  buffer.slice(offset, offset + chunkSize),
                  controller,
                )
              }

              bufferedBytes -= chunkSize
              offset += chunkSize
            }

            buffered = [buffer.slice(offset, buffer.byteLength)]
          }
        } catch (error) {
          controller.error(error)
        }
      },
      flush: (controller) => {
        try {
          if (bufferedBytes > 0) {
            controller.enqueue(concatChunks(buffered, bufferedBytes))
          }
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }
}
