import { Alert, Button, Card, Descriptions, Drawer, Empty, Space, Table, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { getEvent, getEventRaw, getResolvedEvent, listEvents } from "../../../api/events.api"
import { getErrorMessage } from "../../../api/helpers"
import { EChartPanel } from "../../../components/EChartPanel"
import { JsonViewer } from "../../../components/JsonViewer"
import type { EventRaw, EventRecord, ResolvedEvent, SourceMapFrame } from "../../../types/models"
import { formatDateTime, toBackendDateTime } from "../../../utils/date"
import { safeParseJson } from "../../../utils/json"
import { buildParams } from "../../../utils/query"
import { buildLineOption } from "../../behavior/utils/chart-options"
import { ReplayPanel } from "./ReplayPanel"
import type { EventReportFilters } from "./ReportFilters"

type EventDetailDrawerProps = {
  dateRange: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null]
  eventId?: number
  onClose: () => void
  onEventFilter: (filters: EventReportFilters) => void
  onOpenEvent: (eventId: number) => void
  onOpenTrace: (traceId: string) => void
  projectId?: number
}

export function EventDetailDrawer({
  dateRange,
  eventId,
  onClose,
  onEventFilter,
  onOpenEvent,
  onOpenTrace,
  projectId
}: EventDetailDrawerProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null)
  const [eventRaw, setEventRaw] = useState<EventRaw | null>(null)
  const [resolvedEvent, setResolvedEvent] = useState<ResolvedEvent | null>(null)
  const [contextEvents, setContextEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [error, setError] = useState("")
  const [contextError, setContextError] = useState("")

  useEffect(() => {
    if (!eventId) {
      setSelectedEvent(null)
      setEventRaw(null)
      setResolvedEvent(null)
      setContextEvents([])
      return
    }

    setLoading(true)
    setError("")
    Promise.all([getEvent(eventId), getEventRaw(eventId), getResolvedEvent(eventId)])
      .then(([event, raw, resolved]) => {
        setSelectedEvent(event)
        setEventRaw(raw)
        setResolvedEvent(resolved)
      })
      .catch(reason => setError(getErrorMessage(reason, "事件详情加载失败")))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    if (!projectId || !selectedEvent) {
      setContextEvents([])
      return
    }

    const contextParams = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      keyword: selectedEvent.traceId ? undefined : selectedEvent.message,
      pageNum: 1,
      pageSize: 8,
      projectId,
      sessionId: selectedEvent.sessionId,
      startTime: toBackendDateTime(dateRange[0]),
      traceId: selectedEvent.traceId,
      url: selectedEvent.sessionId || selectedEvent.traceId ? undefined : selectedEvent.url
    })

    setContextLoading(true)
    setContextError("")
    listEvents(contextParams)
      .then(table => setContextEvents(table.rows.filter(event => event.id !== selectedEvent.id)))
      .catch(reason => setContextError(getErrorMessage(reason, "上下文事件加载失败")))
      .finally(() => setContextLoading(false))
  }, [dateRange, projectId, selectedEvent])

  const contextTrend = buildLineOption({
    categories: contextEvents.map(event => formatDateTime(event.occurredAt)),
    series: [{ data: contextEvents.map((_, index) => index + 1), name: "相邻事件" }]
  })

  return (
    <Drawer
      destroyOnHidden
      loading={loading}
      onClose={onClose}
      open={Boolean(eventId)}
      title="事件详情"
      width="min(960px, 100vw)"
    >
      {error ? <Alert message={error} type="error" /> : null}
      {selectedEvent ? (
        <Space className="page-stack" direction="vertical" size={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Event ID">{selectedEvent.eventId}</Descriptions.Item>
            <Descriptions.Item label="Replay ID">{selectedEvent.replayId || "-"}</Descriptions.Item>
            <Descriptions.Item label="类型"><Tag>{selectedEvent.eventType}</Tag></Descriptions.Item>
            <Descriptions.Item label="时间">{formatDateTime(selectedEvent.occurredAt)}</Descriptions.Item>
            <Descriptions.Item label="Environment">{selectedEvent.environment || "-"}</Descriptions.Item>
            <Descriptions.Item label="Release">{selectedEvent.release || "-"}</Descriptions.Item>
            <Descriptions.Item label="Dist">{selectedEvent.dist || resolvedEvent?.dist || "-"}</Descriptions.Item>
            <Descriptions.Item label="Trace ID">{selectedEvent.traceId || "-"}</Descriptions.Item>
            <Descriptions.Item label="Session ID">{selectedEvent.sessionId || "-"}</Descriptions.Item>
            <Descriptions.Item label="URL" span={2}>{selectedEvent.url || "-"}</Descriptions.Item>
          </Descriptions>

          <Card title="上下文联动">
            <Space wrap>
              {selectedEvent.sessionId ? (
                <Button onClick={() => onEventFilter({ sessionId: selectedEvent.sessionId })}>按 Session 过滤</Button>
              ) : null}
              {selectedEvent.traceId ? (
                <>
                  <Button onClick={() => onEventFilter({ traceId: selectedEvent.traceId })}>按 Trace 过滤</Button>
                  <Button onClick={() => onOpenTrace(selectedEvent.traceId!)} type="primary">查看 Trace</Button>
                </>
              ) : null}
              {selectedEvent.url ? (
                <Button onClick={() => onEventFilter({ url: selectedEvent.url })}>按 URL 过滤</Button>
              ) : null}
              {selectedEvent.release ? (
                <Button onClick={() => onEventFilter({ release: selectedEvent.release })}>按 Release 过滤</Button>
              ) : null}
              <Button onClick={() => onEventFilter({ eventType: selectedEvent.eventType })}>按事件类型过滤</Button>
            </Space>
          </Card>

          {selectedEvent.replayId ? <ReplayPanel replayId={selectedEvent.replayId} /> : null}

          <Card title="相邻事件">
            {contextError ? <Alert message={contextError} type="warning" /> : null}
            <EChartPanel height={180} loading={contextLoading} option={contextTrend} />
            <Table
              columns={[
                {
                  dataIndex: "occurredAt",
                  key: "occurredAt",
                  render: value => formatDateTime(value),
                  title: "时间"
                },
                {
                  dataIndex: "eventType",
                  key: "eventType",
                  render: value => <Tag>{value}</Tag>,
                  title: "类型"
                },
                {
                  dataIndex: "message",
                  key: "message",
                  render: (_, record) => record.message || record.eventName || record.url || "-",
                  title: "摘要"
                },
                {
                  key: "actions",
                  render: (_, record) => (
                    <Button onClick={() => onOpenEvent(record.id)} size="small" type="link">查看</Button>
                  ),
                  title: "操作"
                }
              ]}
              dataSource={contextEvents}
              loading={contextLoading}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Card>

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
