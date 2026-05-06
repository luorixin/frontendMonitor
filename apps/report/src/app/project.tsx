import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Dayjs } from "dayjs"
import { listProjects } from "../api/projects.api"
import type { Project } from "../types/models"
import { buildParams } from "../utils/query"
import { useSession } from "./session"

type ProjectContextValue = {
  currentProject: Project | null
  currentProjectId?: number
  dateRange: [Dayjs | null, Dayjs | null]
  loading: boolean
  projects: Project[]
  reloadProjects: () => Promise<void>
  setCurrentProjectId: (value: number) => void
  setDateRange: (value: [Dayjs | null, Dayjs | null]) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider(props: { children: ReactNode }) {
  const { isAuthenticated } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<number | undefined>(1)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])

  async function reloadProjects() {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const table = await listProjects(buildParams({ pageNum: 1, pageSize: 100 }))
      setProjects(table.rows)
      if (!currentProjectId && table.rows[0]) {
        setCurrentProjectId(table.rows[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([])
      return
    }
    void reloadProjects()
  }, [isAuthenticated])

  const currentProject = useMemo(
    () => projects.find(project => project.id === currentProjectId) ?? null,
    [currentProjectId, projects]
  )

  const value = useMemo<ProjectContextValue>(
    () => ({
      currentProject,
      currentProjectId,
      dateRange,
      loading,
      projects,
      reloadProjects,
      setCurrentProjectId,
      setDateRange
    }),
    [currentProject, currentProjectId, dateRange, loading, projects]
  )

  return <ProjectContext.Provider value={value}>{props.children}</ProjectContext.Provider>
}

export function useProject() {
  const value = useContext(ProjectContext)
  if (!value) throw new Error("ProjectProvider is missing")
  return value
}
