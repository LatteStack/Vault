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

async function* streamAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } catch (error) {
    throw error
  } finally {
    reader.releaseLock();
  }
}

export async function readAllChunks(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const buffered: Uint8Array[] = []

  for await (const chunk of streamAsyncIterable(stream)) {
    buffered.push(chunk)
  }

  return concatChunks(buffered)
}
