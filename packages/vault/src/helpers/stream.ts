import { concatChunks } from "./buffer";

async function* streamAsyncIterable(stream: ReadableStream<ArrayBuffer>) {
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

export async function readAllChunks(
  stream: ReadableStream<ArrayBuffer>
): Promise<ArrayBuffer> {
  const buffered: ArrayBuffer[] = []

  for await (const chunk of streamAsyncIterable(stream)) {
    buffered.push(chunk)
  }

  return concatChunks(buffered)
}
