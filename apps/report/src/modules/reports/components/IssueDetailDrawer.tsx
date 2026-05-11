import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Select, Space, Table, Tag } from "antd"
import { useEffect, useMemo, useState } from "react"
import dayjs from "dayjs"
import { getIssue, getIssueEvents, getIssueTrend, updateIssueAssignment, updateIssueStatus } from "../../../api/issues.api"
import { getErrorMessage } from "../../../api/helpers"
import { EChartPanel } from "../../../components/EChartPanel"
import { IssueStatusTag, PriorityTag } from "../../../components/StatusTag"
import type { EventRecord, Issue, TrendPoint } from "../../../types/models"
import { formatDateTime, toBackendDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"
import { buildLineOption } from "../../behavior/utils/chart-options"
import { ReplayPanel } from "./ReplayPanel"
import type { EventReportFilters } from "./ReportFilters"

type IssueDetailDrawerProps = {
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null]
  issue: Issue | null
  onChanged: () => void
  onClose: () => void
  onEventFilter: (filters: EventReportFilters) => void
  onOpenEvent: (eventId: number) => void
  onOpenTrace: (traceId: string) => void
  projectId?: number
}

const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(value => ({ label: value, value }))
const statusOptions = ["OPEN", "INVESTIGATING", "IGNORED", "RESOLVED"].map(value => ({ label: value, value }))

export function IssueDetailDrawer({
  dateRange,
  issue,
  onChanged,
  onClose,
  onEventFilter,
  onOpenEvent,
  onOpenTrace,
  projectId
}: IssueDetailDrawerProps) {
  const [form] = Form.useForm<{ assignee?: string; priority?: string }>()
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(issue)
  const [issueEvents, setIssueEvents] = useState<EventRecord[]>([])
  const [issueEventsTotal, setIssueEventsTotal] = useState(0)
  const [issueEventsPageNum, setIssueEventsPageNum] = useState(1)
  const [issueEventsPageSize, setIssueEventsPageSize] = useState(20)
  const [issueTrend, setIssueTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setCurrentIssue(issue)
    setIssueEventsPageNum(1)
    form.setFieldsValue({
      assignee: issue?.assignee,
      priority: issue?.priority || "MEDIUM"
    })
  }, [form, issue])

  useEffect(() => {
    if (!currentIssue || !projectId) {
      setIssueEvents([])
      setIssueTrend([])
      return
    }
    void loadIssueDiagnostics(currentIssue, issueEventsPageNum, issueEventsPageSize)
  }, [currentIssue?.id, dateRange, issueEventsPageNum, issueEventsPageSize, projectId])

  async function loadIssueDiagnostics(targetIssue: Issue, pageNum = 1, pageSize = issueEventsPageSize) {
    if (!projectId) return
    const params = buildParams({
      endTime: targetIssue.lastSeenAt ? dayjs(targetIssue.lastSeenAt).format("YYYY-MM-DD HH:mm:ss") : toBackendDateTime(dateRange[1]),
      pageNum,
      pageSize,
      projectId,
      startTime: targetIssue.firstSeenAt ? dayjs(targetIssue.firstSeenAt).format("YYYY-MM-DD HH:mm:ss") : toBackendDateTime(dateRange[0])
    })

    setLoading(true)
    setError("")
    try {
      const [eventTable, trendPoints] = await Promise.all([
        getIssueEvents(targetIssue.id, params),
        getIssueTrend(targetIssue.id, params)
      ])
      setIssueEvents(eventTable.rows)
      setIssueEventsTotal(eventTable.total)
      setIssueEventsPageNum(pageNum)
      setIssueEventsPageSize(pageSize)
      setIssueTrend(trendPoints)
    } catch (reason) {
      setError(getErrorMessage(reason, "Issue 诊断数据加载失败"))
    } finally {
      setLoading(false)
    }
  }

  async function refreshIssue() {
    if (!currentIssue) return
    const refreshed = await getIssue(currentIssue.id)
    setCurrentIssue(refreshed)
    form.setFieldsValue({
      assignee: refreshed.assignee,
      priority: refreshed.priority || "MEDIUM"
    })
    onChanged()
  }

  async function changeStatus(status: string) {
    if (!currentIssue) return
    setActionLoading(true)
    setError("")
    try {
      await updateIssueStatus(currentIssue.id, status)
      await refreshIssue()
    } catch (reason) {
      setError(getErrorMessage(reason, "Issue 状态更新失败"))
    } finally {
      setActionLoading(false)
    }
  }

  async function assignIssue(values: { assignee?: string; priority?: string }) {
    if (!currentIssue) return
    setActionLoading(true)
    setError("")
    try {
      await updateIssueAssignment(currentIssue.id, values.assignee?.trim() || "", values.priority || "MEDIUM")
      await refreshIssue()
    } catch (reason) {
      setError(getErrorMessage(reason, "Issue 指派更新失败"))
    } finally {
      setActionLoading(false)
    }
  }

  const issueReplayId = issueEvents.find(event => event.replayId && event.replayId.trim())?.replayId
  const relatedTraceIds = Array.from(new Set(issueEvents.map(event => event.traceId).filter(Boolean))) as string[]
  const latestEvent = issueEvents[0]

  const trendOption = useMemo(() => buildLineOption({
    categories: issueTrend.map(item => item.bucket),
    series: [{ data: issueTrend.map(item => item.totalCount), name: "出现次数" }]
  }), [issueTrend])

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={Boolean(issue)}
      title="Issue 详情"
      width="min(960px, 100vw)"
    >
      {currentIssue ? (
        <Space className="page-stack" direction="vertical" size={16}>
          {error ? <Alert message={error} type="error" /> : null}

          <Card title="处置动作">
            <Space className="page-stack" direction="vertical" size={12}>
              <Space wrap>
                {statusOptions.map(option => (
                  <Button
                    disabled={currentIssue.status === option.value}
                    key={option.value}
                    loading={actionLoading}
                    onClick={() => void changeStatus(option.value)}
                  >
                    标记 {option.label}
                  </Button>
                ))}
              </Space>
              <Form form={form} layout="inline" onFinish={assignIssue}>
                <Form.Item label="负责人" name="assignee">
                  <Input allowClear className="report-filter-control" placeholder="owner@team" />
                </Form.Item>
                <Form.Item label="优先级" name="priority">
                  <Select className="report-filter-control" options={priorityOptions} />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" loading={actionLoading} type="primary">保存指派</Button>
                </Form.Item>
              </Form>
            </Space>
          </Card>

          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="标题" span={2}>{currentIssue.title}</Descriptions.Item>
            <Descriptions.Item label="类型"><Tag>{currentIssue.issueType}</Tag></Descriptions.Item>
            <Descriptions.Item label="状态"><IssueStatusTag value={currentIssue.status} /></Descriptions.Item>
            <Descriptions.Item label="优先级"><PriorityTag value={currentIssue.priority} /></Descriptions.Item>
            <Descriptions.Item label="负责人">{currentIssue.assignee || "-"}</Descriptions.Item>
            <Descriptions.Item label="出现次数">{currentIssue.occurrenceCount}</Descriptions.Item>
            <Descriptions.Item label="首次出现">{formatDateTime(currentIssue.firstSeenAt)}</Descriptions.Item>
            <Descriptions.Item label="最近出现">{formatDateTime(currentIssue.lastSeenAt)}</Descriptions.Item>
            <Descriptions.Item label="资源 URL" span={2}>{currentIssue.resourceUrl || "-"}</Descriptions.Item>
            <Descriptions.Item label="Fingerprint" span={2}>{currentIssue.fingerprint}</Descriptions.Item>
          </Descriptions>

          <Card title="关联入口">
            <Space wrap>
              {latestEvent ? <Button onClick={() => onOpenEvent(latestEvent.id)}>查看最近事件</Button> : null}
              {currentIssue.resourceUrl ? (
                <Button onClick={() => onEventFilter({ url: currentIssue.resourceUrl })}>按资源 URL 查事件</Button>
              ) : null}
              <Button onClick={() => onEventFilter({ eventType: currentIssue.issueType })}>按 Issue 类型查事件</Button>
              {relatedTraceIds.map(traceId => (
                <Button key={traceId} onClick={() => onOpenTrace(traceId)}>Trace {traceId}</Button>
              ))}
            </Space>
          </Card>

          {issueReplayId ? <ReplayPanel replayId={issueReplayId} /> : null}

          <Card title="趋势">
            {issueTrend.length === 0 && !loading ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <EChartPanel loading={loading} option={trendOption} />
            )}
          </Card>

          <Card title="关联事件">
            <Table
              columns={[
                {
                  dataIndex: "eventType",
                  key: "eventType",
                  render: value => <Tag>{value}</Tag>,
                  title: "类型"
                },
                {
                  dataIndex: "traceId",
                  key: "traceId",
                  render: value => value || "-",
                  title: "Trace"
                },
                {
                  dataIndex: "replayId",
                  key: "replayId",
                  render: value => value || "-",
                  title: "Replay"
                },
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
                },
                {
                  key: "actions",
                  render: (_, record) => (
                    <Space>
                      <Button onClick={() => onOpenEvent(record.id)} size="small" type="link">事件详情</Button>
                      {record.sessionId ? (
                        <Button onClick={() => onEventFilter({ sessionId: record.sessionId })} size="small" type="link">
                          Session
                        </Button>
                      ) : null}
                      {record.traceId ? (
                        <Button onClick={() => onOpenTrace(record.traceId!)} size="small" type="link">
                          Trace
                        </Button>
                      ) : null}
                    </Space>
                  ),
                  title: "操作"
                }
              ]}
              dataSource={issueEvents}
              loading={loading}
              pagination={{
                current: issueEventsPageNum,
                onChange: (page, pageSize) => {
                  setIssueEventsPageNum(page)
                  setIssueEventsPageSize(pageSize)
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
  )
}
