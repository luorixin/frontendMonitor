import { Alert, Card, Col, Empty, Row, Space, Statistic, Table } from "antd"
import { useEffect, useMemo, useState } from "react"
import {
  getRequestPerformanceTrend,
  getSlowRequests,
  getWebVitalTrend
} from "../../../api/dashboard.api"
import { getErrorMessage } from "../../../api/helpers"
import { PageHeader } from "../../../components/PageHeader"
import { RequestPerformanceSection } from "../../../components/RequestPerformanceSection"
import { WebVitalTrendSection, type NavigationFilter } from "../../../components/WebVitalTrendSection"
import { useProject } from "../../../app/project"
import type { RequestPerformanceTrendPoint, SlowRequest, WebVitalTrendPoint } from "../../../types/models"
import { formatMetric, toBackendDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"

export function PerformancePage() {
  const { currentProject, currentProjectId, dateRange } = useProject()
  const [webVitalTrend, setWebVitalTrend] = useState<WebVitalTrendPoint[]>([])
  const [requestTrend, setRequestTrend] = useState<RequestPerformanceTrendPoint[]>([])
  const [slowRequests, setSlowRequests] = useState<SlowRequest[]>([])
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
      getWebVitalTrend(params),
      getRequestPerformanceTrend(params),
      getSlowRequests(params)
    ])
      .then(([webVitalsData, requestTrendData, slowRequestData]) => {
        setWebVitalTrend(webVitalsData)
        setRequestTrend(requestTrendData)
        setSlowRequests(slowRequestData)
      })
      .catch(reason => {
        setError(getErrorMessage(reason, "性能分析数据加载失败"))
      })
      .finally(() => setLoading(false))
  }, [currentProjectId, dateRange])

  const latestRequestBucket = requestTrend[requestTrend.length - 1]
  const latestWebVitalSnapshot = useMemo(() => {
    const metrics = new Map<string, WebVitalTrendPoint>()
    for (const item of webVitalTrend) {
      const key = `${item.navigationMode}-${item.metricName}`
      const current = metrics.get(key)
      if (!current || current.bucket.localeCompare(item.bucket) < 0) {
        metrics.set(key, item)
      }
    }
    return Array.from(metrics.values())
      .sort((left, right) => `${left.navigationMode}-${left.metricName}`.localeCompare(`${right.navigationMode}-${right.metricName}`))
  }, [webVitalTrend])

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="性能分析"
      />
      {error ? <Alert message={error} type="error" /> : null}

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="请求平均耗时"
              value={latestRequestBucket?.avgDuration ?? 0}
              formatter={value => `${formatMetric(Number(value), 0)} ms`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="请求 P75"
              value={latestRequestBucket?.p75Duration ?? 0}
              formatter={value => `${formatMetric(Number(value), 0)} ms`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic title="慢请求样本" value={formatMetric(latestRequestBucket?.sampleCount ?? 0)} />
          </Card>
        </Col>
      </Row>

      <WebVitalTrendSection
        data={webVitalTrend}
        mode={navigationMode}
        onModeChange={setNavigationMode}
        title="Web Vitals 趋势"
      />

      <Card title="最新 Web Vitals 快照">
        <Table
          columns={[
            { dataIndex: "navigationMode", key: "navigationMode", title: "导航模式" },
            { dataIndex: "metricName", key: "metricName", title: "指标" },
            {
              dataIndex: "avgValue",
              key: "avgValue",
              render: (value: number, record: WebVitalTrendPoint) =>
                `${formatMetric(value, record.metricName === "CLS" ? 3 : 0)}${record.metricName === "CLS" ? "" : " ms"}`,
              title: "平均值"
            },
            {
              dataIndex: "p75Value",
              key: "p75Value",
              render: (value: number, record: WebVitalTrendPoint) =>
                `${formatMetric(value, record.metricName === "CLS" ? 3 : 0)}${record.metricName === "CLS" ? "" : " ms"}`,
              title: "P75"
            },
            { dataIndex: "sampleCount", key: "sampleCount", title: "样本数" }
          ]}
          dataSource={latestWebVitalSnapshot}
          locale={{ emptyText: loading ? "加载中..." : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={false}
          rowKey={record => `${record.navigationMode}-${record.metricName}-${record.bucket}`}
          size="small"
        />
      </Card>

      <RequestPerformanceSection slowRequests={slowRequests} title="请求性能趋势" trend={requestTrend} />
    </Space>
  )
}
