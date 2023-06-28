import { nanoid } from "nanoid";

type Ref = {
  __REF__: string
}

function createRef(id: string): Ref {
  return {
    __REF__: id
  }
}

function smellLikeRef(value: unknown): value is Ref {
  return (value as Ref)?.__REF__ != null
}

function extractRef(refObj: Ref): string {
  return refObj.__REF__
}

export class Transformer {
  serialize(data: any): [string, Record<string, ArrayBuffer>] {
    const bytesMap: Record<string, ArrayBuffer> = {}

    const json = JSON.stringify(data, (_, value) => {
      if (value instanceof ArrayBuffer) {
        const id = nanoid(8)
        const ref = createRef(id)

        Object.defineProperty(bytesMap, nanoid(8), {
          value,
          enumerable: true
        })

        return ref
      }

      return value
    })

    return [json, bytesMap]
  }

  deserialize<T = unknown>(json: string, bytesMap: Record<string, ArrayBuffer>): T {
    return JSON.parse(json, (_, value) => {
      if (smellLikeRef(value)) {
        const id = extractRef(value)
        const source = bytesMap[id]
        return source
      }

      return value
    })
  }
}

