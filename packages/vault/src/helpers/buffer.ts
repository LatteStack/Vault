export function concatChunks(chunks: ArrayBuffer[], size?: number): Uint8Array {
  const bufferSize = size ?? chunks.reduce((acc, chunk) => (acc + chunk.byteLength), 0)
  const uint8Array = new Uint8Array(bufferSize)
  let offset = 0

  for (const chunk of chunks) {
    if (chunk.byteLength > 0) {
      uint8Array.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }
  }

  return uint8Array
}

export async function* streamAsyncIterable(stream: ReadableStream<ArrayBuffer>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function chunkReadableStream(
  readableStream: ReadableStream<ArrayBuffer>,
  transformStream: WritableStream<ArrayBuffer>,
  chunkSize: number
) {
  const writer = transformStream.getWriter()

  try {
    let bufferedBytes = 0
    let buffered: ArrayBuffer[] = []

    for await (const chunk of streamAsyncIterable(readableStream)) {
      bufferedBytes += chunk.byteLength
      buffered.push(chunk)

      if (bufferedBytes >= chunkSize) {
        const buffer = concatChunks(buffered, bufferedBytes)
        let offset = 0

        while (bufferedBytes >= chunkSize) {
          await writer.ready

          writer.write(buffer.slice(offset, offset + chunkSize))

          bufferedBytes -= chunkSize
          offset += chunkSize
        }

        buffered = [buffer.slice(offset, buffer.byteLength)]
      }
    }

    if (bufferedBytes > 0) {
      await writer.ready
      writer.write(concatChunks(buffered, bufferedBytes))
    }

    await writer.ready
    writer.close()
  } catch (error) {
    writer.abort(error)
  } finally {
    writer.releaseLock()
  }
}

