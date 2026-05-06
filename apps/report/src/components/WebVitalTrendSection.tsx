import { Card, Empty, Segmented, Space, Statistic, Tag, Typography } from "antd"
import { useMemo } from "react"
import type { WebVitalTrendPoint } from "../types/models"
import { formatMetric } from "../utils/date"
import { MetricSparkline } from "./MetricSparkline"

export type NavigationFilter = "all" | "hard" | "soft"

const METRIC_ORDER: WebVitalTrendPoint["metricName"][] = ["FCP", "TTFB", "LCP", "INP", "CLS"]

const THRESHOLDS: Record<WebVitalTrendPoint["metricName"], [number, number]> = {
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  INP: [200, 500],
  LCP: [2500, 4000],
  TTFB: [800, 1800]
}

function formatVitalValue(metricName: WebVitalTrendPoint["metricName"], value: number) {
  return `${formatMetric(value, metricName === "CLS" ? 3 : 0)}${metricName === "CLS" ? "" : " ms"}`
}

function getRating(metricName: WebVitalTrendPoint["metricName"], value: number) {
  const [goodThreshold, poorThreshold] = THRESHOLDS[metricName]
  if (value <= goodThreshold) {
    return { color: "green", label: "Good" }
  }
  if (value <= poorThreshold) {
    return { color: "gold", label: "Needs Improvement" }
  }
  return { color: "red", label: "Poor" }
}

export function WebVitalTrendSection(props: {
  data: WebVitalTrendPoint[]
  mode: NavigationFilter
  onModeChange: (value: NavigationFilter) => void
  title: string
}) {
  const filtered = useMemo(() => {
    if (props.mode === "all") {
      return props.data
    }
    return props.data.filter(item => item.navigationMode === props.mode)
  }, [props.data, props.mode])

  const cards = useMemo(() => {
    const groups = new Map<WebVitalTrendPoint["metricName"], WebVitalTrendPoint[]>()
    for (const item of filtered) {
      const current = groups.get(item.metricName) ?? []
      current.push(item)
      groups.set(item.metricName, current)
    }

    return METRIC_ORDER
      .map(metricName => {
        const series = (groups.get(metricName) ?? []).sort((left, right) => left.bucket.localeCompare(right.bucket))
        if (series.length === 0) {
          return null
        }
        const latest = series[series.length - 1]
        const rating = getRating(metricName, latest.p75Value)
        return {
          latest,
          metricName,
          rating,
          series
        }
      })
      .filter(Boolean) as Array<{
        latest: WebVitalTrendPoint
        metricName: WebVitalTrendPoint["metricName"]
        rating: { color: string; label: string }
        series: WebVitalTrendPoint[]
      }>
  }, [filtered])

  return (
    <Card
      extra={(
        <Segmented
          onChange={value => props.onModeChange(value as NavigationFilter)}
          options={[
            { label: "全部", value: "all" },
            { label: "Hard", value: "hard" },
            { label: "Soft", value: "soft" }
          ]}
          value={props.mode}
        />
      )}
      title={props.title}
    >
      {cards.length === 0 ? (
        <Empty description="暂无 Web Vitals 数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="trend-card-grid">
          {cards.map(card => (
            <Card className="trend-card" key={`${card.metricName}-${card.latest.navigationMode}`} size="small">
              <Space className="trend-card-header" direction="vertical" size={4}>
                <Space align="center">
                  <Typography.Text strong>{card.metricName}</Typography.Text>
                  <Tag color={card.latest.navigationMode === "soft" ? "purple" : "blue"}>
                    {card.latest.navigationMode}
                  </Tag>
                  <Tag color={card.rating.color}>{card.rating.label}</Tag>
                </Space>
                <Typography.Text type="secondary">
                  最近 P75 · {card.latest.bucket}
                </Typography.Text>
              </Space>
              <Statistic title="P75" value={card.latest.p75Value} formatter={() => formatVitalValue(card.metricName, card.latest.p75Value)} />
              <div className="trend-card-chart">
                <MetricSparkline
                  color={card.latest.navigationMode === "soft" ? "#722ed1" : "#1677ff"}
                  points={card.series.map(item => ({ label: item.bucket, value: item.p75Value }))}
                />
              </div>
              <Space className="trend-card-meta" size={16}>
                <Typography.Text type="secondary">Avg {formatVitalValue(card.metricName, card.latest.avgValue)}</Typography.Text>
                <Typography.Text type="secondary">Samples {formatMetric(card.latest.sampleCount)}</Typography.Text>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}
