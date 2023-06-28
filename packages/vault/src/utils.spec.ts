// import { cipher } from "./utils";

describe('utils', () => {
  it('', async () => {
    const upstream = new ReadableStream<number>({
      start: (controller) => {
        controller.enqueue(1)
        controller.enqueue(2)
        controller.enqueue(3)
        controller.close()
      }
    })

    const transformStream = new TransformStream<number, number>({
      transform(chunk, controller) {
        controller.enqueue(chunk * 2)
      }
    })

    class ContainerStream extends TransformStream<number, number> {
      constructor() {
        super({
          start: (controller) => {
            controller.enqueue(0)
          },
          transform: async (chunk, controller) => {
            controller.enqueue(chunk + 1)
          }
        })

        upstream
          .pipeThrough(transformStream)
          .pipeThrough(this)
      }
    }

    const containerStream = new ContainerStream()

    await containerStream.readable.pipeTo(new WritableStream({
      write: (chunk) => console.log(chunk)
    }))
  })
  // it('', async () => {
  //   const { privateKey, publicKey } = await crypto.subtle.generateKey(
  //     {
  //       name: "ECDSA",
  //       namedCurve: "P-256",
  //     },
  //     true,
  //     ["sign", "verify"]
  //   )
  // })
  // it('should resolve crypto correctly', () => {
  //   const Strategy = new ByteLengthQueuingStrategy({ highWaterMark: 10 })
  //   new ReadableStream({
  //     start(controller) {
  //       for (let index = 0; index < 10; index++) {
  //         const buffer = new ArrayBuffer(20)
  //         crypto.getRandomValues(new Uint8Array(buffer))
  //         controller.enqueue(buffer)
  //       }
  //     }
  //   })
  //     .pipeTo(new WritableStream({
  //       write(chunk) {
  //         console.log(chunk.byteLength);
  //       }
  //     }, Strategy))
  // })
})
