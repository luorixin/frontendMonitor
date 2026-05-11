import { Alert, Button, Card, Space, Table, Tabs } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { listEvents } from "../../../api/events.api"
import { getErrorMessage } from "../../../api/helpers"
import { listIssues } from "../../../api/issues.api"
import { PageHeader } from "../../../components/PageHeader"
import { IssueStatusTag, PriorityTag } from "../../../components/StatusTag"
import { useProject } from "../../../app/project"
import type { EventRecord, Issue } from "../../../types/models"
import { formatDateTime, toBackendDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"
import { EventDetailDrawer } from "../components/EventDetailDrawer"
import { IssueDetailDrawer } from "../components/IssueDetailDrawer"
import { ReportFilters, type EventReportFilters, type IssueReportFilters } from "../components/ReportFilters"

const eventFilterKeys = [
  "eventType",
  "environment",
  "release",
  "dist",
  "userId",
  "sessionId",
  "deviceId",
  "url",
  "keyword",
  "traceId"
] as const

const issueFilterKeys = ["issueType", "status", "keyword"] as const

type ReportTabKey = "events" | "issues"

export function ReportsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentProject, currentProjectId, dateRange } = useProject()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPageNum, setEventsPageNum] = useState(1)
  const [eventsPageSize, setEventsPageSize] = useState(20)
  const [issues, setIssues] = useState<Issue[]>([])
  const [issuesTotal, setIssuesTotal] = useState(0)
  const [issuesPageNum, setIssuesPageNum] = useState(1)
  const [issuesPageSize, setIssuesPageSize] = useState(20)
  const [eventFilters, setEventFilters] = useState<EventReportFilters>(() => readEventFilters(searchParams))
  const [issueFilters, setIssueFilters] = useState<IssueReportFilters>(() => readIssueFilters(searchParams))
  const [selectedEventId, setSelectedEventId] = useState<number>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const activeTab = (searchParams.get("tab") === "issues" ? "issues" : "events") satisfies ReportTabKey
  const searchKey = searchParams.toString()

  useEffect(() => {
    setEventFilters(readEventFilters(searchParams))
    setIssueFilters(readIssueFilters(searchParams))
  }, [searchKey])

  useEffect(() => {
    setEventsPageNum(1)
    setIssuesPageNum(1)
  }, [currentProjectId, dateRange, eventFilters, issueFilters])

  const eventParams = useMemo(() => buildParams({
    ...eventFilters,
    endTime: toBackendDateTime(dateRange[1]),
    pageNum: eventsPageNum,
    pageSize: eventsPageSize,
    projectId: currentProjectId,
    startTime: toBackendDateTime(dateRange[0])
  }), [currentProjectId, dateRange, eventFilters, eventsPageNum, eventsPageSize])

  const issueParams = useMemo(() => buildParams({
    ...issueFilters,
    endTime: toBackendDateTime(dateRange[1]),
    pageNum: issuesPageNum,
    pageSize: issuesPageSize,
    projectId: currentProjectId,
    startTime: toBackendDateTime(dateRange[0])
  }), [currentProjectId, dateRange, issueFilters, issuesPageNum, issuesPageSize])

  async function loadPageData() {
    if (!currentProjectId) return

    setLoading(true)
    setError("")
    try {
      const [eventTable, issueTable] = await Promise.all([listEvents(eventParams), listIssues(issueParams)])
      setEvents(eventTable.rows)
      setEventsTotal(eventTable.total)
      setIssues(issueTable.rows)
      setIssuesTotal(issueTable.total)
    } catch (reason) {
      setError(getErrorMessage(reason, "报表数据加载失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData()
  }, [currentProjectId, eventParams, issueParams])

  useEffect(() => {
    const eventId = (location.state as { eventId?: number } | null)?.eventId
    if (!eventId) return
    setSelectedEventId(eventId)
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.pathname, location.search, location.state, navigate])

  function updateSearch(nextValues: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(nextValues)) {
      if (value === undefined || value === "") {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next, { replace: true })
  }

  function applyEventFilters(filters: EventReportFilters) {
    const nextFilters = normalizeEventFilters(filters)
    setEventFilters(nextFilters)
    setEventsPageNum(1)
    updateSearch({
      ...Object.fromEntries(eventFilterKeys.map(key => [key, nextFilters[key]])),
      tab: "events"
    })
  }

  function applyIssueFilters(filters: IssueReportFilters) {
    const nextFilters = normalizeIssueFilters(filters)
    setIssueFilters(nextFilters)
    setIssuesPageNum(1)
    updateSearch({
      issueKeyword: nextFilters.keyword,
      issueType: nextFilters.issueType,
      status: nextFilters.status,
      tab: "issues"
    })
  }

  function mergeEventFilters(filters: EventReportFilters) {
    applyEventFilters({ ...eventFilters, ...filters })
  }

  function openTrace(traceId: string) {
    navigate("/behavior", { state: { traceId } })
  }

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        actions={<Button onClick={() => void loadPageData()}>刷新</Button>}
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="报表"
      />
      {error ? <Alert message={error} type="error" /> : null}

      <ReportFilters
        eventFilters={eventFilters}
        issueFilters={issueFilters}
        onEventFiltersChange={applyEventFilters}
        onIssueFiltersChange={applyIssueFilters}
      />

      <Tabs
        activeKey={activeTab}
        onChange={key => updateSearch({ tab: key })}
        items={[
          {
            key: "events",
            label: "事件分析",
            children: (
              <Card>
                <Table
                  columns={[
                    { dataIndex: "eventType", key: "eventType", title: "类型" },
                    {
                      dataIndex: "message",
                      key: "message",
                      render: (_, record) => record.message || record.eventName || record.url || "-",
                      title: "摘要"
                    },
                    { dataIndex: "environment", key: "environment", render: value => value || "-", title: "环境" },
                    { dataIndex: "release", key: "release", render: value => value || "-", title: "Release" },
                    { dataIndex: "dist", key: "dist", render: value => value || "-", title: "Dist" },
                    { dataIndex: "traceId", key: "traceId", render: value => value || "-", title: "Trace" },
                    {
                      dataIndex: "occurredAt",
                      key: "occurredAt",
                      render: value => formatDateTime(value),
                      title: "时间"
                    },
                    {
                      key: "actions",
                      render: (_, record) => <Button onClick={() => setSelectedEventId(record.id)} size="small">详情</Button>,
                      title: "操作"
                    }
                  ]}
                  dataSource={events}
                  loading={loading}
                  pagination={{
                    current: eventsPageNum,
                    onChange: (page, pageSize) => {
                      setEventsPageNum(page)
                      setEventsPageSize(pageSize)
                    },
                    pageSize: eventsPageSize,
                    showSizeChanger: true,
                    total: eventsTotal
                  }}
                  rowKey="id"
                />
              </Card>
            )
          },
          {
            key: "issues",
            label: "Issue 分析",
            children: (
              <Card>
                <Table
                  columns={[
                    { dataIndex: "title", key: "title", title: "标题" },
                    {
                      dataIndex: "resourceUrl",
                      key: "resourceUrl",
                      render: value => value || "-",
                      title: "资源 URL"
                    },
                    {
                      dataIndex: "status",
                      key: "status",
                      render: value => <IssueStatusTag value={value} />,
                      title: "状态"
                    },
                    {
                      dataIndex: "priority",
                      key: "priority",
                      render: value => <PriorityTag value={value} />,
                      title: "优先级"
                    },
                    { dataIndex: "assignee", key: "assignee", render: value => value || "-", title: "负责人" },
                    { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "出现次数" },
                    {
                      key: "actions",
                      render: (_, record) => <Button onClick={() => setSelectedIssue(record)} size="small">详情</Button>,
                      title: "操作"
                    }
                  ]}
                  dataSource={issues}
                  loading={loading}
                  pagination={{
                    current: issuesPageNum,
                    onChange: (page, pageSize) => {
                      setIssuesPageNum(page)
                      setIssuesPageSize(pageSize)
                    },
                    pageSize: issuesPageSize,
                    showSizeChanger: true,
                    total: issuesTotal
                  }}
                  rowKey="id"
                />
              </Card>
            )
          }
        ]}
      />

      <EventDetailDrawer
        dateRange={dateRange}
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(undefined)}
        onEventFilter={mergeEventFilters}
        onOpenEvent={setSelectedEventId}
        onOpenTrace={openTrace}
        projectId={currentProjectId}
      />
      <IssueDetailDrawer
        dateRange={dateRange}
        issue={selectedIssue}
        onChanged={() => void loadPageData()}
        onClose={() => setSelectedIssue(null)}
        onEventFilter={mergeEventFilters}
        onOpenEvent={setSelectedEventId}
        onOpenTrace={openTrace}
        projectId={currentProjectId}
      />
    </Space>
  )
}

function readEventFilters(params: URLSearchParams): EventReportFilters {
  return normalizeEventFilters(Object.fromEntries(eventFilterKeys.map(key => [key, params.get(key) || undefined])))
}

function readIssueFilters(params: URLSearchParams): IssueReportFilters {
  return normalizeIssueFilters({
    issueType: params.get("issueType") || undefined,
    keyword: params.get("issueKeyword") || undefined,
    status: params.get("status") || undefined
  })
}

function normalizeEventFilters(filters: EventReportFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, value?.trim() || undefined])
      .filter(([, value]) => value)
  ) as EventReportFilters
}

function normalizeIssueFilters(filters: IssueReportFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, value?.trim() || undefined])
      .filter(([, value]) => value)
  ) as IssueReportFilters
}
