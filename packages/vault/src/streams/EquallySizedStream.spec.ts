import { isEqual } from "lodash";
import { EquallySizedChunksStream } from "./EquallySizedStream";

describe('EquallySizedChunksStream', () => {
  it('Should work correctly when the upstream size is less than the chunkSize.', async () => {
    const chunkSize = 4
    const accumulate: number[] = []
    const fn = jest.fn((chunk: ArrayBuffer) => {
      const elements = new Uint8Array(chunk)
      accumulate.push(...elements)
    })
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedChunksStream(chunkSize))
      .pipeTo(new WritableStream({
        write: fn
      }))

    expect(isEqual(new Uint8Array([...accumulate]), buffer)).toBeTruthy()
    expect(fn).toBeCalledTimes(1)
  })

  it('Should work correctly when the upstream size is equal to the chunkSize.', async () => {
    const chunkSize = 3
    const accumulate: number[] = []
    const fn = jest.fn((chunk: ArrayBuffer) => {
      const elements = new Uint8Array(chunk)
      accumulate.push(...elements)
    })
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedChunksStream(chunkSize))
      .pipeTo(new WritableStream({
        write: fn
      }))

    expect(isEqual(new Uint8Array([...accumulate]), buffer)).toBeTruthy()
    expect(fn).toBeCalledTimes(1)
  })

  it('Should work correctly when the upstream size is greater than the chunkSize.', async () => {
    const chunkSize = 2
    const accumulate: number[] = []
    const fn = jest.fn((chunk: ArrayBuffer) => {
      const elements = new Uint8Array(chunk)
      accumulate.push(...elements)
    })
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedChunksStream(chunkSize))
      .pipeTo(new WritableStream({
        write: fn
      }))

    expect(isEqual(new Uint8Array([...accumulate]), buffer)).toBeTruthy()
    expect(fn).toBeCalledTimes(2)
  })
})
