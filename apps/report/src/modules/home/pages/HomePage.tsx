import { Alert, Card, Col, Empty, List, Row, Space, Spin, Statistic, Table } from "antd"
import { useEffect, useState } from "react"
import {
  getDistribution,
  getOverview,
  getTopIssues,
  getTopPages,
  getTrend,
  getWebVitalTrend
} from "../../../api/dashboard.api"
import { PageHeader } from "../../../components/PageHeader"
import { IssueStatusTag, PriorityTag } from "../../../components/StatusTag"
import { WebVitalTrendSection, type NavigationFilter } from "../../../components/WebVitalTrendSection"
import { useProject } from "../../../app/project"
import type {
  DashboardOverview,
  EventTypeCount,
  Issue,
  PageStats,
  TrendPoint,
  WebVitalTrendPoint
} from "../../../types/models"
import { formatMetric, toBackendDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"

const initialOverview: DashboardOverview = {
  errorEvents: 0,
  errorRate: 0,
  pageViews: 0,
  totalEvents: 0,
  uniqueDevices: 0,
  uniqueSessions: 0,
  uniqueUsers: 0
}

export function HomePage() {
  const { currentProject, currentProjectId, dateRange } = useProject()
  const [overview, setOverview] = useState(initialOverview)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [distribution, setDistribution] = useState<EventTypeCount[]>([])
  const [topPages, setTopPages] = useState<PageStats[]>([])
  const [topIssues, setTopIssues] = useState<Issue[]>([])
  const [webVitalTrend, setWebVitalTrend] = useState<WebVitalTrendPoint[]>([])
  const [navigationMode, setNavigationMode] = useState<NavigationFilter>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!currentProjectId) return
    const params = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      granularity: "hour",
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })

    setLoading(true)
    setError("")

    Promise.all([
      getOverview(params),
      getTrend(params),
      getDistribution(params),
      getTopPages(params),
      getTopIssues(params),
      getWebVitalTrend(params)
    ])
      .then(([overviewData, trendData, distributionData, topPagesData, topIssuesData, webVitalTrendData]) => {
        setOverview(overviewData)
        setTrend(trendData)
        setDistribution(distributionData)
        setTopPages(topPagesData)
        setTopIssues(topIssuesData)
        setWebVitalTrend(webVitalTrendData)
      })
      .catch(reason => {
        setError(reason instanceof Error ? reason.message : "首页数据加载失败")
      })
      .finally(() => setLoading(false))
  }, [currentProjectId, dateRange])

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="首页"
      />
      {error ? <Alert message={error} type="error" /> : null}
      <Row gutter={[16, 16]}>
        <Col span={8}><Card><Statistic title="总事件数" value={formatMetric(overview.totalEvents)} /></Card></Col>
        <Col span={8}><Card><Statistic title="错误事件" value={formatMetric(overview.errorEvents)} /></Card></Col>
        <Col span={8}><Card><Statistic precision={2} suffix="%" title="错误率" value={overview.errorRate} /></Card></Col>
        <Col span={8}><Card><Statistic title="PV" value={formatMetric(overview.pageViews)} /></Card></Col>
        <Col span={8}><Card><Statistic title="会话数" value={formatMetric(overview.uniqueSessions)} /></Card></Col>
        <Col span={8}><Card><Statistic title="设备数" value={formatMetric(overview.uniqueDevices)} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="趋势">
            {loading ? <Spin /> : trend.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <List
                dataSource={trend}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta title={item.bucket} />
                    <strong>{formatMetric(item.totalCount)}</strong>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="事件分布">
            {loading ? <Spin /> : distribution.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <List
                dataSource={distribution}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta title={item.eventType} />
                    <strong>{formatMetric(item.totalCount)}</strong>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
      <WebVitalTrendSection
        data={webVitalTrend}
        mode={navigationMode}
        onModeChange={setNavigationMode}
        title="Web Vitals 趋势"
      />
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="Top Pages">
            <Table
              columns={[
                { dataIndex: "url", key: "url", title: "URL" },
                { dataIndex: "eventCount", key: "eventCount", title: "事件数" },
                { dataIndex: "errorCount", key: "errorCount", title: "错误数" }
              ]}
              dataSource={topPages}
              pagination={false}
              rowKey="url"
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top Issues">
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
                { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "次数" }
              ]}
              dataSource={topIssues}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
