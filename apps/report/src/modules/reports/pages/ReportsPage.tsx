import { Alert, Button, Card, Descriptions, Drawer, Empty, Space, Table, Tabs, Typography } from "antd"
import { useEffect, useState } from "react"
import { getEvent, getEventRaw, getResolvedEvent, listEvents } from "../../../api/events.api"
import { getErrorMessage } from "../../../api/helpers"
import { getIssueEvents, getIssueTrend, listIssues, updateIssueAssignment, updateIssueStatus } from "../../../api/issues.api"
import { JsonViewer } from "../../../components/JsonViewer"
import { PageHeader } from "../../../components/PageHeader"
import { IssueStatusTag, PriorityTag } from "../../../components/StatusTag"
import { useProject } from "../../../app/project"
import type { EventRaw, EventRecord, Issue, ResolvedEvent, SourceMapFrame, TrendPoint } from "../../../types/models"
import { formatDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"
import { safeParseJson } from "../../../utils/json"
import { toBackendDateTime } from "../../../utils/date"

export function ReportsPage() {
  const { currentProject, currentProjectId, dateRange } = useProject()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPageNum, setEventsPageNum] = useState(1)
  const [eventsPageSize, setEventsPageSize] = useState(20)
  const [issues, setIssues] = useState<Issue[]>([])
  const [issuesTotal, setIssuesTotal] = useState(0)
  const [issuesPageNum, setIssuesPageNum] = useState(1)
  const [issuesPageSize, setIssuesPageSize] = useState(20)
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null)
  const [eventRaw, setEventRaw] = useState<EventRaw | null>(null)
  const [resolvedEvent, setResolvedEvent] = useState<ResolvedEvent | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [issueEvents, setIssueEvents] = useState<EventRecord[]>([])
  const [issueEventsTotal, setIssueEventsTotal] = useState(0)
  const [issueEventsPageNum, setIssueEventsPageNum] = useState(1)
  const [issueEventsPageSize, setIssueEventsPageSize] = useState(20)
  const [issueTrend, setIssueTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function loadPageData() {
    if (!currentProjectId) return
    const eventParams = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      pageNum: eventsPageNum,
      pageSize: eventsPageSize,
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })
    const issueParams = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      pageNum: issuesPageNum,
      pageSize: issuesPageSize,
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })

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
    setEventsPageNum(1)
    setIssuesPageNum(1)
    setIssueEventsPageNum(1)
  }, [currentProjectId, dateRange])

  useEffect(() => {
    void loadPageData()
  }, [currentProjectId, dateRange, eventsPageNum, eventsPageSize, issuesPageNum, issuesPageSize])

  async function inspectEvent(id: number) {
    const [event, raw, resolved] = await Promise.all([getEvent(id), getEventRaw(id), getResolvedEvent(id)])
    setSelectedEvent(event)
    setEventRaw(raw)
    setResolvedEvent(resolved)
  }

  async function inspectIssue(issue: Issue, pageNum = 1, pageSize = issueEventsPageSize) {
    if (!currentProjectId) return
    const params = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      pageNum,
      pageSize,
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })
    const [eventTable, trendPoints] = await Promise.all([
      getIssueEvents(issue.id, params),
      getIssueTrend(issue.id, params)
    ])
    setSelectedIssue(issue)
    setIssueEvents(eventTable.rows)
    setIssueEventsTotal(eventTable.total)
    setIssueEventsPageNum(pageNum)
    setIssueEventsPageSize(pageSize)
    setIssueTrend(trendPoints)
  }

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        actions={<Button onClick={() => void loadPageData()}>刷新</Button>}
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="报表"
      />
      {error ? <Alert message={error} type="error" /> : null}
      <Tabs
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
                    { dataIndex: "environment", key: "environment", title: "环境" },
                    { dataIndex: "release", key: "release", title: "Release" },
                    { dataIndex: "dist", key: "dist", title: "Dist" },
                    {
                      dataIndex: "occurredAt",
                      key: "occurredAt",
                      render: value => formatDateTime(value),
                      title: "时间"
                    },
                    {
                      key: "actions",
                      render: (_, record) => <Button onClick={() => void inspectEvent(record.id)} size="small">详情</Button>,
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
                    { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "出现次数" },
                    {
                      key: "actions",
                      render: (_, record) => <Button onClick={() => void inspectIssue(record)} size="small">详情</Button>,
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

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedEvent(null)}
        open={Boolean(selectedEvent)}
        title="事件详情"
        width={720}
      >
        {selectedEvent ? (
          <Space className="page-stack" direction="vertical" size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Event ID">{selectedEvent.eventId}</Descriptions.Item>
              <Descriptions.Item label="Replay ID">{selectedEvent.replayId || "-"}</Descriptions.Item>
              <Descriptions.Item label="类型">{selectedEvent.eventType}</Descriptions.Item>
              <Descriptions.Item label="时间">{formatDateTime(selectedEvent.occurredAt)}</Descriptions.Item>
              <Descriptions.Item label="Environment">{selectedEvent.environment || "-"}</Descriptions.Item>
              <Descriptions.Item label="Release">{selectedEvent.release || "-"}</Descriptions.Item>
              <Descriptions.Item label="Dist">{selectedEvent.dist || resolvedEvent?.dist || "-"}</Descriptions.Item>
            </Descriptions>
            <Card title="Tags">
              <JsonViewer value={safeParseJson(selectedEvent.tagsJson)} />
            </Card>
            <Card title="Payload">
              <JsonViewer value={safeParseJson(eventRaw?.payloadJson || selectedEvent.payloadJson)} />
            </Card>
            <Card title="Resolved Stack">
              {resolvedEvent?.resolvedStack ? (
                <pre className="json-viewer">{resolvedEvent.resolvedStack}</pre>
              ) : (
                <Empty description="暂无还原后的堆栈" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
            <Card title="Resolved Frames">
              {resolvedEvent?.frames?.length ? (
                <Space className="page-stack" direction="vertical" size={12}>
                  {resolvedEvent.frames.map((frame, index) => (
                    <Card
                      key={`${frame.rawLine || "frame"}-${index}`}
                      size="small"
                      title={buildFrameTitle(frame, index)}
                    >
                      <Space className="page-stack" direction="vertical" size={8}>
                        <Typography.Text type="secondary">
                          {frame.artifact || frame.generatedFile || "未匹配到 artifact"}
                        </Typography.Text>
                        {frame.sourceContext?.length ? (
                          <pre className="json-viewer">{formatSourceContext(frame)}</pre>
                        ) : (
                          <Typography.Text type="secondary">暂无源码上下文</Typography.Text>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无逐帧还原数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedIssue(null)}
        open={Boolean(selectedIssue)}
        title="Issue 详情"
        width={720}
      >
        {selectedIssue ? (
          <Space className="page-stack" direction="vertical" size={16}>
            <Space>
              <Button onClick={() => void updateIssueStatus(selectedIssue.id, "OPEN").then(loadPageData)}>标记 Open</Button>
              <Button onClick={() => void updateIssueStatus(selectedIssue.id, "RESOLVED").then(loadPageData)}>标记 Resolved</Button>
              <Button onClick={() => void updateIssueAssignment(selectedIssue.id, "owner@team", "HIGH").then(loadPageData)}>
                指派 HIGH
              </Button>
            </Space>
            <Card title="趋势">
              {issueTrend.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  columns={[
                    { dataIndex: "bucket", key: "bucket", title: "Bucket" },
                    { dataIndex: "totalCount", key: "totalCount", title: "Count" }
                  ]}
                  dataSource={issueTrend}
                  pagination={false}
                  rowKey="bucket"
                  size="small"
                />
              )}
            </Card>
            <Card title="关联事件">
              <Table
                columns={[
                  { dataIndex: "eventType", key: "eventType", title: "类型" },
                  {
                    dataIndex: "message",
                    key: "message",
                    render: (_, record) => record.message || record.url || "-",
                    title: "摘要"
                  },
                  {
                    dataIndex: "occurredAt",
                    key: "occurredAt",
                    render: value => formatDateTime(value),
                    title: "时间"
                  }
                ]}
                dataSource={issueEvents}
                pagination={{
                  current: issueEventsPageNum,
                  onChange: (page, pageSize) => {
                    void inspectIssue(selectedIssue, page, pageSize)
                  },
                  pageSize: issueEventsPageSize,
                  showSizeChanger: true,
                  total: issueEventsTotal
                }}
                rowKey="id"
                size="small"
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}

function buildFrameTitle(frame: SourceMapFrame, index: number) {
  if (frame.originalSource && frame.originalLine && frame.originalColumn) {
    return `#${index + 1} ${frame.originalSource}:${frame.originalLine}:${frame.originalColumn}`
  }
  if (frame.generatedFile && frame.generatedLine && frame.generatedColumn) {
    return `#${index + 1} ${frame.generatedFile}:${frame.generatedLine}:${frame.generatedColumn}`
  }
  return `#${index + 1} Frame`
}

function formatSourceContext(frame: SourceMapFrame) {
  return (frame.sourceContext || [])
    .map(line => `${line.focus ? ">" : " "} ${String(line.lineNumber).padStart(4, " ")} | ${line.content}`)
    .join("\n")
}
