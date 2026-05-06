import { getApi, getTable, postApi, postVoid, putApi } from "./client"
import type { Project } from "../types/models"

export async function listProjects(params: URLSearchParams) {
  return getTable<Project>(`/monitor/projects?${params.toString()}`)
}

export async function getProject(id: number) {
  return getApi<Project>(`/monitor/projects/${id}`)
}

export async function createProject(body: {
  allowedOrigins: string[]
  appName: string
  appVersion?: string
  description?: string
  projectName: string
  status: number
}) {
  return postApi<Project>("/monitor/projects", body)
}

export async function updateProject(
  id: number,
  body: {
    allowedOrigins: string[]
    appName: string
    appVersion?: string
    description?: string
    projectName: string
    status: number
  }
) {
  return putApi<Project>(`/monitor/projects/${id}`, body)
}

export async function rotateProjectKey(id: number) {
  return postApi<{ dsn: string; projectKey: string }>(`/monitor/projects/${id}/rotate-key`)
}

export async function updateProjectStatus(id: number, status: number) {
  await postVoid(`/monitor/projects/${id}/status`, { status })
}
