import { getTable, postApi } from "./client"
import type { SourceMapArtifact } from "../types/models"

export async function listSourceMaps(params: URLSearchParams) {
  return getTable<SourceMapArtifact>(`/monitor/source-maps?${params.toString()}`)
}

export async function uploadSourceMap(
  projectId: number,
  release: string,
  dist: string | undefined,
  artifact: string,
  file: File
) {
  const formData = new FormData()
  formData.set("projectId", String(projectId))
  formData.set("release", release)
  if (dist) {
    formData.set("dist", dist)
  }
  formData.set("artifact", artifact)
  formData.set("file", file)

  return postApi<SourceMapArtifact>("/monitor/source-maps", formData)
}

export async function uploadSourceMapsBatch(
  projectId: number,
  release: string,
  dist: string | undefined,
  artifacts: string[],
  files: File[]
) {
  const formData = new FormData()
  formData.set("projectId", String(projectId))
  formData.set("release", release)
  if (dist) {
    formData.set("dist", dist)
  }
  for (const artifact of artifacts) {
    formData.append("artifacts", artifact)
  }
  for (const file of files) {
    formData.append("files", file)
  }

  return postApi<SourceMapArtifact[]>("/monitor/source-maps/batch", formData)
}
