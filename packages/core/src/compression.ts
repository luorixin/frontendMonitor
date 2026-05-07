import type { CompressionAlgorithm } from "./types"

export type EncodedRequestBody = {
  body: Blob | string
  contentEncoding?: string
}

type CompressionStreamConstructor = typeof CompressionStream & {
  __frontendMonitorPassthrough?: boolean
}

export async function encodeJSONRequestBody(
  body: string,
  algorithm: CompressionAlgorithm = "gzip"
): Promise<EncodedRequestBody> {
  if (
    typeof CompressionStream !== "function" ||
    typeof Blob !== "function" ||
    typeof Response !== "function"
  ) {
    return { body }
  }

  try {
    const CompressionStreamImpl =
      CompressionStream as CompressionStreamConstructor

    if (CompressionStreamImpl.__frontendMonitorPassthrough) {
      return {
        body: new Blob([body], { type: "application/json" }),
        contentEncoding: algorithm
      }
    }

    const source = new Response(body).body
    if (!source) {
      return { body }
    }

    const compressedStream = source.pipeThrough(
      new CompressionStreamImpl(algorithm)
    )
    const compressedBody = await new Response(compressedStream).blob()

    return {
      body: compressedBody,
      contentEncoding: algorithm
    }
  } catch {
    return { body }
  }
}
