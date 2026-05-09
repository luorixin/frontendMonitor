import { Empty, theme } from "antd"
import type { EChartsOption } from "echarts"
import { useEffect, useMemo, useRef } from "react"
import {
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  TooltipComponent,
  init,
  use,
  type ECharts
} from "../lib/echarts"

use([BarChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, PieChart, TooltipComponent])

type EChartPanelProps = {
  emptyText?: string
  error?: string
  height?: number
  loading?: boolean
  option?: EChartsOption | null
}

export function EChartPanel({
  emptyText = "暂无图表数据",
  error,
  height = 320,
  loading = false,
  option
}: EChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ECharts | null>(null)
  const { token } = theme.useToken()

  const hasSeries = useMemo(() => {
    if (!option) return false
    if (Array.isArray(option.series)) return option.series.length > 0
    return Boolean(option.series)
  }, [option])

  useEffect(() => {
    if (!containerRef.current || !option || !hasSeries || loading || error) {
      chartRef.current?.dispose()
      chartRef.current = null
      return
    }

    const chart = chartRef.current ?? init(containerRef.current)
    chartRef.current = chart
    chart.setOption(option, true)

    const resize = () => chart.resize()
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => resize())

    observer?.observe(containerRef.current)
    const animationFrame = window.requestAnimationFrame(resize)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [error, hasSeries, loading, option])

  if (loading) {
    return (
      <div className="echart-panel echart-panel--empty" style={{ color: token.colorTextSecondary, height }}>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="echart-panel echart-panel--empty" style={{ color: token.colorErrorText, height }}>
        {error}
      </div>
    )
  }

  if (!hasSeries) {
    return (
      <div className="echart-panel echart-panel--empty" style={{ height }}>
        <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return <div className="echart-panel" ref={containerRef} style={{ height }} />
}
