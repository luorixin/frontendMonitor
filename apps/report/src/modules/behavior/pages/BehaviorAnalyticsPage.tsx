import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography
} from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getHotspotSamples,
  getHotspotTrend,
  getHotspots,
  getPageAnalytics,
  getPageAnalyticsTrend,
  getPageDwellDistribution,
  getTraceDetail,
  getTraceOverview,
  getTraces,
  getTraceTrend
} from "../../../api/dashboard.api"
import { getErrorMessage } from "../../../api/helpers"
import { useProject } from "../../../app/project"
import { EChartPanel } from "../../../components/EChartPanel"
import { PageHeader } from "../../../components/PageHeader"
import { ReplayPanel } from "../../reports/components/ReplayPanel"
import type {
  DwellDistributionBucket,
  EventRecord,
  HotspotRow,
  HotspotTrendPoint,
  PageAnalyticsRow,
  PageTrendPoint,
  TraceDetail,
  TraceOverview,
  TraceSummary,
  TrendPoint
} from "../../../types/models"
import { formatDateTime, formatMetric, toBackendDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"
import { buildBarOption, buildDonutOption, buildLineOption } from "../utils/chart-options"

const initialTraceOverview: TraceOverview = {
  errorTraces: 0,
  slowTraces: 0,
  totalTraces: 0
}

export function BehaviorAnalyticsPage() {
  const navigate = useNavigate()
  const { currentProject, currentProjectId, dateRange } = useProject()
  const [traceOverview, setTraceOverview] = useState(initialTraceOverview)
  const [traceTrend, setTraceTrend] = useState<TrendPoint[]>([])
  const [traces, setTraces] = useState<TraceSummary[]>([])
  const [selectedTraceId, setSelectedTraceId] = useState<string>()
  const [selectedTrace, setSelectedTrace] = useState<TraceDetail | null>(null)
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsRow[]>([])
  const [selectedPageUrl, setSelectedPageUrl] = useState<string>()
  const [pageTrend, setPageTrend] = useState<PageTrendPoint[]>([])
  const [dwellDistribution, setDwellDistribution] = useState<DwellDistributionBucket[]>([])
  const [hotspotEventType, setHotspotEventType] = useState<"click" | "exposure">("click")
  const [hotspotPageUrl, setHotspotPageUrl] = useState<string>()
  const [hotspots, setHotspots] = useState<HotspotRow[]>([])
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRow | null>(null)
  const [hotspotTrend, setHotspotTrend] = useState<HotspotTrendPoint[]>([])
  const [hotspotSamples, setHotspotSamples] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")

  const baseParams = useMemo(() => buildParams({
    endTime: toBackendDateTime(dateRange[1]),
    granularity: "hour",
    projectId: currentProjectId,
    startTime: toBackendDateTime(dateRange[0])
  }), [currentProjectId, dateRange])

  useEffect(() => {
    if (!currentProjectId) return
    setLoading(true)
    setError("")

    Promise.all([
      getTraceOverview(baseParams),
      getTraceTrend(baseParams),
      getTraces(baseParams),
      getPageAnalytics(baseParams),
      getHotspots(buildParams({
        endTime: toBackendDateTime(dateRange[1]),
        eventType: hotspotEventType,
        granularity: "hour",
        projectId: currentProjectId,
        startTime: toBackendDateTime(dateRange[0]),
        url: hotspotPageUrl
      }))
    ])
      .then(([traceOverviewData, traceTrendData, traceData, pageAnalyticsData, hotspotData]) => {
        setTraceOverview(traceOverviewData)
        setTraceTrend(traceTrendData)
        setTraces(traceData)
        setPageAnalytics(pageAnalyticsData)
        setHotspots(hotspotData)

        const nextPageUrl = pageAnalyticsData.find(item => item.url === selectedPageUrl)?.url ?? pageAnalyticsData[0]?.url
        setSelectedPageUrl(nextPageUrl)

        const nextHotspot =
          hotspotData.find(item =>
            item.eventType === selectedHotspot?.eventType
            && item.url === selectedHotspot?.url
            && item.selector === selectedHotspot?.selector
          ) ?? hotspotData[0] ?? null
        setSelectedHotspot(nextHotspot)
      })
      .catch(reason => {
        setError(getErrorMessage(reason, "行为分析数据加载失败"))
      })
      .finally(() => setLoading(false))
  }, [baseParams, currentProjectId, dateRange, hotspotEventType, hotspotPageUrl])

  useEffect(() => {
    if (!currentProjectId || !selectedPageUrl) {
      setPageTrend([])
      setDwellDistribution([])
      return
    }

    const params = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      granularity: "hour",
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0]),
      url: selectedPageUrl
    })

    Promise.all([
      getPageAnalyticsTrend(params),
      getPageDwellDistribution(params)
    ])
      .then(([pageTrendData, dwellDistributionData]) => {
        setPageTrend(pageTrendData)
        setDwellDistribution(dwellDistributionData)
      })
      .catch(reason => {
        setDetailError(getErrorMessage(reason, "页面分析详情加载失败"))
      })
  }, [currentProjectId, dateRange, selectedPageUrl])

  useEffect(() => {
    if (!currentProjectId || !selectedHotspot) {
      setHotspotTrend([])
      setHotspotSamples([])
      return
    }

    const params = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      eventType: selectedHotspot.eventType,
      granularity: "hour",
      projectId: currentProjectId,
      selector: selectedHotspot.selector,
      startTime: toBackendDateTime(dateRange[0]),
      url: selectedHotspot.url
    })

    Promise.all([
      getHotspotTrend(params),
      getHotspotSamples(params)
    ])
      .then(([hotspotTrendData, hotspotSampleData]) => {
        setHotspotTrend(hotspotTrendData)
        setHotspotSamples(hotspotSampleData)
      })
      .catch(reason => {
        setDetailError(getErrorMessage(reason, "热点详情加载失败"))
      })
  }, [currentProjectId, dateRange, selectedHotspot])

  async function inspectTrace(traceId: string) {
    if (!currentProjectId) return
    setDetailLoading(true)
    setDetailError("")
    try {
      const trace = await getTraceDetail(traceId, baseParams)
      setSelectedTraceId(traceId)
      setSelectedTrace(trace)
    } catch (reason) {
      setDetailError(getErrorMessage(reason, "Trace 详情加载失败"))
    } finally {
      setDetailLoading(false)
    }
  }

  const traceChartOption = useMemo(() => buildLineOption({
    categories: traceTrend.map(item => item.bucket),
    series: [
      { data: traceTrend.map(item => item.totalCount), name: "Trace 数" },
      { data: traceTrend.map(item => item.errorCount ?? 0), name: "异常 Trace" }
    ]
  }), [traceTrend])

  const pageTrendOption = useMemo(() => buildLineOption({
    categories: pageTrend.map(item => item.bucket),
    series: [
      { data: pageTrend.map(item => item.pv), name: "PV" },
      { data: pageTrend.map(item => item.errorCount), name: "错误数" },
      { data: pageTrend.map(item => item.avgDwellDuration), name: "平均停留 (ms)" }
    ]
  }), [pageTrend])

  const dwellOption = useMemo(() => buildDonutOption({
    rows: dwellDistribution.map(item => ({ name: item.bucket, value: item.count }))
  }), [dwellDistribution])

  const hotspotRankOption = useMemo(() => buildBarOption({
    categories: hotspots.map(item => compactHotspotLabel(item)),
    horizontal: true,
    series: [{ data: hotspots.map(item => item.count), name: "次数" }]
  }), [hotspots])

  const hotspotTrendOption = useMemo(() => buildLineOption({
    categories: hotspotTrend.map(item => item.bucket),
    series: [{ data: hotspotTrend.map(item => item.count), name: "次数" }]
  }), [hotspotTrend])

  const selectedTraceReplayId = selectedTrace?.events.find(event => event.replayId)?.replayId

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="行为分析"
      />
      {error ? <Alert message={error} type="error" /> : null}
      {detailError ? <Alert message={detailError} type="warning" /> : null}

      <Tabs
        items={[
          {
            key: "trace",
            label: "Trace 分析",
            children: (
              <Space className="page-stack" direction="vertical" size={16}>
                <Row gutter={[16, 16]}>
                  <Col span={8}><Card><Statistic title="Trace 总数" value={formatMetric(traceOverview.totalTraces)} /></Card></Col>
                  <Col span={8}><Card><Statistic title="异常 Trace" value={formatMetric(traceOverview.errorTraces)} /></Card></Col>
                  <Col span={8}><Card><Statistic title="慢 Trace" value={formatMetric(traceOverview.slowTraces)} /></Card></Col>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="Trace 趋势">
                      <EChartPanel loading={loading} option={traceChartOption} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Trace 排行">
                      <Table
                        columns={[
                          { dataIndex: "traceId", key: "traceId", title: "Trace ID" },
                          {
                            dataIndex: "duration",
                            key: "duration",
                            render: value => `${formatMetric(value)} ms`,
                            title: "持续时长"
                          },
                          { dataIndex: "eventCount", key: "eventCount", title: "事件数" },
                          { dataIndex: "errorCount", key: "errorCount", title: "错误数" },
                          {
                            key: "actions",
                            render: (_, record) => (
                              <Button onClick={() => void inspectTrace(record.traceId)} size="small" type="link">
                                详情
                              </Button>
                            ),
                            title: "操作"
                          }
                        ]}
                        dataSource={traces}
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                        rowKey="traceId"
                        size="small"
                      />
                    </Card>
                  </Col>
                </Row>
              </Space>
            )
          },
          {
            key: "pages",
            label: "页面分析",
            children: (
              <Space className="page-stack" direction="vertical" size={16}>
                <Card
                  extra={(
                    <Select
                      allowClear
                      className="behavior-filter-select"
                      onChange={value => setSelectedPageUrl(value)}
                      options={pageAnalytics.map(item => ({ label: item.url, value: item.url }))}
                      placeholder="选择页面"
                      value={selectedPageUrl}
                    />
                  )}
                  title="页面排行"
                >
                  <Table
                    columns={[
                      { dataIndex: "url", key: "url", title: "页面 URL" },
                      { dataIndex: "pv", key: "pv", title: "PV" },
                      { dataIndex: "errorCount", key: "errorCount", title: "错误数" },
                      { dataIndex: "uniqueSessions", key: "uniqueSessions", title: "会话数" },
                      {
                        dataIndex: "avgDwellDuration",
                        key: "avgDwellDuration",
                        render: value => `${formatMetric(value)} ms`,
                        title: "平均停留"
                      },
                      {
                        key: "actions",
                        render: (_, record) => (
                          <Button onClick={() => setSelectedPageUrl(record.url)} size="small" type="link">
                            查看趋势
                          </Button>
                        ),
                        title: "操作"
                      }
                    ]}
                    dataSource={pageAnalytics}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    rowKey="url"
                    size="small"
                  />
                </Card>
                <Row gutter={[16, 16]}>
                  <Col span={14}>
                    <Card title={selectedPageUrl ? `页面趋势: ${selectedPageUrl}` : "页面趋势"}>
                      <EChartPanel loading={loading} option={pageTrendOption} />
                    </Card>
                  </Col>
                  <Col span={10}>
                    <Card title="停留分布">
                      <EChartPanel loading={loading} option={dwellOption} />
                    </Card>
                  </Col>
                </Row>
              </Space>
            )
          },
          {
            key: "hotspots",
            label: "热点分析",
            children: (
              <Space className="page-stack" direction="vertical" size={16}>
                <Card
                  extra={(
                    <Space wrap>
                      <Segmented<"click" | "exposure">
                        onChange={value => setHotspotEventType(value)}
                        options={[
                          { label: "点击", value: "click" },
                          { label: "曝光", value: "exposure" }
                        ]}
                        value={hotspotEventType}
                      />
                      <Select
                        allowClear
                        className="behavior-filter-select"
                        onChange={value => setHotspotPageUrl(value)}
                        options={pageAnalytics.map(item => ({ label: item.url, value: item.url }))}
                        placeholder="按页面筛选"
                        value={hotspotPageUrl}
                      />
                    </Space>
                  )}
                  title="热点排行"
                >
                  <Row gutter={[16, 16]}>
                    <Col span={10}>
                      <EChartPanel loading={loading} option={hotspotRankOption} />
                    </Col>
                    <Col span={14}>
                      <Table
                        columns={[
                          {
                            dataIndex: "label",
                            key: "label",
                            render: (_, record) => (
                              <Space className="page-stack" direction="vertical" size={0}>
                                <span>{record.label}</span>
                                <Typography.Text type="secondary">{record.selector}</Typography.Text>
                              </Space>
                            ),
                            title: "热点元素"
                          },
                          { dataIndex: "count", key: "count", title: "次数" },
                          { dataIndex: "uniqueSessions", key: "uniqueSessions", title: "会话数" },
                          {
                            dataIndex: "lastOccurredAt",
                            key: "lastOccurredAt",
                            render: value => formatDateTime(value),
                            title: "最近一次"
                          },
                          {
                            key: "actions",
                            render: (_, record) => (
                              <Button onClick={() => setSelectedHotspot(record)} size="small" type="link">
                                详情
                              </Button>
                            ),
                            title: "操作"
                          }
                        ]}
                        dataSource={hotspots}
                        loading={loading}
                        pagination={{ pageSize: 6 }}
                        rowKey={record => `${record.eventType}-${record.url}-${record.selector}`}
                        size="small"
                      />
                    </Col>
                  </Row>
                </Card>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="热点趋势">
                      <EChartPanel loading={loading} option={hotspotTrendOption} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="事件样本">
                      <Table
                        columns={[
                          {
                            dataIndex: "occurredAt",
                            key: "occurredAt",
                            render: value => formatDateTime(value),
                            title: "时间"
                          },
                          { dataIndex: "message", key: "message", title: "标签" },
                          { dataIndex: "selector", key: "selector", title: "Selector" },
                          {
                            key: "actions",
                            render: (_, record) => (
                              <Button
                                onClick={() => navigate("/reports", { state: { eventId: record.id } })}
                                size="small"
                                type="link"
                              >
                                查看事件
                              </Button>
                            ),
                            title: "操作"
                          }
                        ]}
                        dataSource={hotspotSamples}
                        locale={{ emptyText: loading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        pagination={{ pageSize: 5 }}
                        rowKey="id"
                        size="small"
                      />
                    </Card>
                  </Col>
                </Row>
              </Space>
            )
          }
        ]}
      />

      <Drawer
        destroyOnHidden
        onClose={() => {
          setSelectedTrace(null)
          setSelectedTraceId(undefined)
        }}
        open={Boolean(selectedTraceId)}
        title="Trace 详情"
        width={760}
      >
        {detailLoading ? (
          <div className="loading-block"><Spin /></div>
        ) : selectedTrace ? (
          <Space className="page-stack" direction="vertical" size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Trace ID" span={2}>{selectedTrace.traceId}</Descriptions.Item>
              <Descriptions.Item label="页面">{selectedTrace.url || "-"}</Descriptions.Item>
              <Descriptions.Item label="会话">{selectedTrace.sessionId || "-"}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{formatDateTime(selectedTrace.startedAt)}</Descriptions.Item>
              <Descriptions.Item label="最后时间">{formatDateTime(selectedTrace.lastSeenAt)}</Descriptions.Item>
              <Descriptions.Item label="持续时长">{formatMetric(selectedTrace.duration)} ms</Descriptions.Item>
              <Descriptions.Item label="事件数">{selectedTrace.eventCount}</Descriptions.Item>
              <Descriptions.Item label="错误数">{selectedTrace.errorCount}</Descriptions.Item>
            </Descriptions>
            {selectedTraceReplayId ? <ReplayPanel replayId={selectedTraceReplayId} /> : null}
            <Card title="事件时间线">
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
                    render: (_, record) => record.message || record.url || "-",
                    title: "摘要"
                  },
                  {
                    dataIndex: "duration",
                    key: "duration",
                    render: value => (value == null ? "-" : `${formatMetric(value)} ms`),
                    title: "耗时"
                  },
                  {
                    key: "actions",
                    render: (_, record) => (
                      <Button
                        onClick={() => navigate("/reports", { state: { eventId: record.id } })}
                        size="small"
                        type="link"
                      >
                        查看事件
                      </Button>
                    ),
                    title: "操作"
                  }
                ]}
                dataSource={selectedTrace.events}
                pagination={false}
                rowKey="eventId"
                size="small"
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}

function compactHotspotLabel(hotspot: HotspotRow) {
  const label = hotspot.label || hotspot.selector
  return label.length > 24 ? `${label.slice(0, 24)}…` : label
}
