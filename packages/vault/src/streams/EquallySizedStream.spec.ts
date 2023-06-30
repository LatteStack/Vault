import { isEqual, noop } from "lodash";
import { EquallySizedStream } from "./EquallySizedStream";

describe('EquallySizedStream', () => {
  it('should be defined', () => {
    const instance = new EquallySizedStream({ chunkSize: 1 })
    expect(instance).toBeDefined()
  })

  it('Should work correctly when the upstream size is less than the chunkSize.', async () => {
    const chunkSize = 4
    const chunks: Uint8Array[] = []
    const fn = jest.fn((chunk) => chunks.push(chunk) as any)
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      },
    })
      .pipeThrough(new EquallySizedStream({
        chunkSize,
        transform: fn,
      }))
      .pipeTo(new WritableStream({ write: noop }))

    expect(fn).toBeCalledTimes(1)
    expect(isEqual(
      new Uint8Array(Buffer.concat(chunks)),
      buffer
    )).toBeTruthy()
  })

  it('Should work correctly when the upstream size is equal to the chunkSize.', async () => {
    const chunkSize = 3
    const chunks: Uint8Array[] = []
    const fn = jest.fn((chunk) => chunks.push(chunk) as any)
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedStream({
        chunkSize,
        transform: fn,
      }))
      .pipeTo(new WritableStream({ write: noop }))

    expect(fn).toBeCalledTimes(1)
    expect(isEqual(
      new Uint8Array(Buffer.concat(chunks)),
      buffer
    )).toBeTruthy()
  })

  it('Should work correctly when the upstream size is greater than the chunkSize.', async () => {
    const chunkSize = 2
    const chunks: Uint8Array[] = []
    const fn = jest.fn((chunk) => chunks.push(chunk) as any)
    const buffer = new Uint8Array([1, 2, 3])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedStream({
        chunkSize,
        transform: fn,
      }))
      .pipeTo(new WritableStream({ write: noop }))

    expect(fn).toBeCalledTimes(2)
    expect(isEqual(
      new Uint8Array(Buffer.concat(chunks)),
      buffer
    )).toBeTruthy()
  })

  it('Should work correctly when resizeChunk is provided.', async () => {
    const chunkSize = 2
    const chunks: Uint8Array[] = []
    const fn = jest.fn((chunk) => chunks.push(chunk) as any)
    const buffer = new Uint8Array([1, 2, 3, 4, 5])
    await new ReadableStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
      .pipeThrough(new EquallySizedStream({
        chunkSize,
        transform: fn,
        resizeChunk: () => {
          return new Uint8Array([3, 4, 5])
        }
      }))
      .pipeTo(new WritableStream({ write: noop }))

    expect(fn).toBeCalledTimes(2)
    expect(isEqual(
      new Uint8Array(Buffer.concat(chunks)),
      new Uint8Array([3, 4, 5]),
    )).toBeTruthy()
  })
})
