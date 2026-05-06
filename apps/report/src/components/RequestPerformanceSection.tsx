import { Card, Empty, Space, Statistic, Table, Tag, Typography } from "antd"
import type { RequestPerformanceTrendPoint, SlowRequest } from "../types/models"
import { formatMetric } from "../utils/date"
import { MetricSparkline } from "./MetricSparkline"

function formatDuration(value: number) {
  return `${formatMetric(value, 0)} ms`
}

export function RequestPerformanceSection(props: {
  slowRequests: SlowRequest[]
  trend: RequestPerformanceTrendPoint[]
  title?: string
}) {
  const metrics = [
    {
      color: "#1677ff",
      key: "avgDuration",
      label: "平均耗时",
      values: props.trend.map(item => ({ label: item.bucket, value: item.avgDuration }))
    },
    {
      color: "#fa8c16",
      key: "p75Duration",
      label: "P75 耗时",
      values: props.trend.map(item => ({ label: item.bucket, value: item.p75Duration }))
    },
    {
      color: "#f5222d",
      key: "maxDuration",
      label: "最大耗时",
      values: props.trend.map(item => ({ label: item.bucket, value: item.maxDuration }))
    }
  ] as const

  const latest = props.trend[props.trend.length - 1]

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <Card title={props.title || "请求性能"}>
        {props.trend.length === 0 ? (
          <Empty description="暂无请求性能数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="trend-card-grid">
            {metrics.map(metric => {
              const current = latest?.[metric.key] ?? 0
              return (
                <Card className="trend-card" key={metric.key} size="small">
                  <Space className="trend-card-header" direction="vertical" size={4}>
                    <Typography.Text strong>{metric.label}</Typography.Text>
                    <Typography.Text type="secondary">{latest?.bucket || "最新 bucket"}</Typography.Text>
                  </Space>
                  <Statistic title="当前值" value={current} formatter={() => formatDuration(current)} />
                  <div className="trend-card-chart">
                    <MetricSparkline color={metric.color} points={metric.values} />
                  </div>
                  <Space className="trend-card-meta" size={16}>
                    <Typography.Text type="secondary">Samples {formatMetric(latest?.sampleCount ?? 0)}</Typography.Text>
                    <Tag color={(latest?.errorCount ?? 0) > 0 ? "red" : "green"}>
                      Error {formatMetric(latest?.errorCount ?? 0)}
                    </Tag>
                  </Space>
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="慢请求 Top 10">
        <Table
          columns={[
            {
              dataIndex: "url",
              key: "url",
              render: (value: string, record: SlowRequest) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{record.method}</Typography.Text>
                  <Typography.Text>{value}</Typography.Text>
                </Space>
              ),
              title: "接口"
            },
            {
              dataIndex: "transport",
              key: "transport",
              render: (value: string) => <Tag>{value}</Tag>,
              title: "传输"
            },
            {
              dataIndex: "avgDuration",
              key: "avgDuration",
              render: (value: number) => formatDuration(value),
              title: "平均耗时"
            },
            {
              dataIndex: "p75Duration",
              key: "p75Duration",
              render: (value: number) => formatDuration(value),
              title: "P75"
            },
            {
              dataIndex: "maxDuration",
              key: "maxDuration",
              render: (value: number) => formatDuration(value),
              title: "最大耗时"
            },
            {
              dataIndex: "errorCount",
              key: "errorCount",
              render: (value: number) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
              title: "错误数"
            },
            { dataIndex: "sampleCount", key: "sampleCount", title: "样本数" }
          ]}
          dataSource={props.slowRequests}
          pagination={false}
          rowKey={record => `${record.method}-${record.transport}-${record.url}`}
          size="small"
        />
      </Card>
    </Space>
  )
}
