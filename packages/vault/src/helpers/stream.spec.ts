import { isEqual } from 'lodash'
import { concatChunks, readAllChunks } from './stream'

describe('stream', () => {
  describe('concatChunks', () => {
    it('should work correctly', () => {
      const buffer1 = new Uint8Array([1, 2])
      const buffer2 = new Uint8Array([3, 4])
      const buffer = concatChunks([
        buffer1,
        buffer2,
      ])

      expect(buffer).toBeInstanceOf(Uint8Array)
      expect(isEqual(buffer, new Uint8Array([1, 2, 3, 4]))).toBeTruthy()
    })
  })

  describe('readAllChunks', () => {
    it('should work correctly', async () => {
      const buffer = await readAllChunks(new ReadableStream<Uint8Array>({
        async start (controller) {
          controller.enqueue(new Uint8Array([1]))
          controller.enqueue(new Uint8Array([2]))
          await Promise.resolve(
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            controller.enqueue(new Uint8Array([3])),
          )
          controller.close()
        },
      }))

      expect(isEqual(
        buffer,
        new Uint8Array([1, 2, 3]),
      )).toBeTruthy()
    })
  })
})
