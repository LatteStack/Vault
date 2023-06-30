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
      // start: async (controller) => {
      //   if (initial.start != null) {
      //     await initial.start(controller)
      //   }
      // },
      transform: async (_chunk, controller) => {
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
      },
      flush: async (controller) => {
        if (bufferedBytes > 0) {
          if (initial.transform != null) {
            await initial.transform(
              concatChunks(buffered, bufferedBytes),
              controller
            )
          }
        }
      },
    })
  }
}
