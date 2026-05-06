import { getTable, postApi } from "./client"
import type { SourceMapArtifact } from "../types/models"

export async function listSourceMaps(params: URLSearchParams) {
  return getTable<SourceMapArtifact>(`/monitor/source-maps?${params.toString()}`)
}

export async function uploadSourceMap(projectId: number, release: string, artifact: string, file: File) {
  const formData = new FormData()
  formData.set("projectId", String(projectId))
  formData.set("release", release)
  formData.set("artifact", artifact)
  formData.set("file", file)

  return postApi<SourceMapArtifact>("/monitor/source-maps", formData)
}
