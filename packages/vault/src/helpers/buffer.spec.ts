import { isEqual } from "lodash";
import { chunkReadableStream, concatChunks } from "./buffer";
import { getRandomValues } from "./getRandomValues";

describe('buffer', () => {
  // describe('bufferConcat', () => {
  //   it('should work correctly', () => {
  //     const buffer1 = new Uint8Array([1])
  //     const buffer2 = new Uint8Array([2, 3])
  //     const merged = new Uint8Array(bufferConcat(buffer1, buffer2))

  //     expect(merged[0]).toBe(1)
  //     expect(merged[1]).toBe(2)
  //     expect(merged[2]).toBe(3)
  //   })
  // })

  describe('concatChunks', () => {
    it('should work correctly', () => {
      const buffer1 = new Uint8Array([1, 2])
      const buffer2 = new Uint8Array([3, 4])
      const buffer = concatChunks([
        buffer1,
        buffer2,
      ])

      expect(buffer).toBeInstanceOf(ArrayBuffer)
      expect(isEqual(buffer, new Uint8Array([1, 2, 3, 4]).buffer)).toBeTruthy()
    })
  })

  describe('chunkReadableStream', () => {
    it('', async () => {
      const fn = jest.fn(console.log)
      const chunkSize = 10
      const upstream = new ReadableStream<ArrayBuffer>({
        start(controller) {
          controller.enqueue(getRandomValues(5))
          controller.enqueue(getRandomValues(10))
          controller.enqueue(getRandomValues(15))
          controller.enqueue(getRandomValues(20))
          controller.close()
        }
      })
      const downstream = new WritableStream<ArrayBuffer>({
        write: fn
      })

      await chunkReadableStream(upstream, downstream, chunkSize)

      expect(fn).toBeCalledTimes(5)
    })
  })
})
