import type { EChartsOption } from "echarts"

const palette = ["#1677ff", "#52c41a", "#faad14", "#722ed1", "#13c2c2", "#f5222d"]

function baseGrid() {
  return {
    bottom: 32,
    left: 48,
    right: 24,
    top: 32
  }
}

function baseTooltip() {
  return {
    borderWidth: 0,
    confine: true,
    trigger: "axis"
  }
}

export function buildLineOption(input: {
  categories: string[]
  series: Array<{ data: number[]; name: string }>
  yAxisName?: string
}): EChartsOption {
  return {
    color: palette,
    grid: baseGrid(),
    legend: {
      top: 0
    },
    tooltip: baseTooltip(),
    xAxis: {
      axisLabel: {
        hideOverlap: true
      },
      axisTick: { alignWithLabel: true },
      data: input.categories,
      type: "category"
    },
    yAxis: {
      name: input.yAxisName,
      type: "value"
    },
    series: input.series.map(item => ({
      data: item.data,
      name: item.name,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      type: "line"
    }))
  }
}

export function buildDualAxisLineOption(input: {
  categories: string[]
  leftAxisName: string
  rightAxisName: string
  series: Array<{ axis: "left" | "right"; data: number[]; name: string }>
}): EChartsOption {
  return {
    color: palette,
    grid: {
      ...baseGrid(),
      right: 56
    },
    legend: {
      top: 0
    },
    tooltip: {
      ...baseTooltip(),
      valueFormatter: value => typeof value === "number" ? String(value) : String(value ?? "-")
    },
    xAxis: {
      axisLabel: {
        hideOverlap: true
      },
      axisTick: { alignWithLabel: true },
      data: input.categories,
      type: "category"
    },
    yAxis: [
      {
        name: input.leftAxisName,
        type: "value"
      },
      {
        name: input.rightAxisName,
        type: "value"
      }
    ],
    series: input.series.map(item => ({
      data: item.data,
      name: item.name,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      type: "line",
      yAxisIndex: item.axis === "right" ? 1 : 0
    }))
  }
}

export function buildBarOption(input: {
  categories: string[]
  horizontal?: boolean
  series: Array<{ data: number[]; name: string; stack?: string }>
}): EChartsOption {
  const categoryAxis = {
    axisLabel: {
      hideOverlap: !input.horizontal
    },
    data: input.categories,
    type: "category" as const
  }

  const valueAxis = { type: "value" as const }

  return {
    color: palette,
    grid: {
      ...baseGrid(),
      left: input.horizontal ? 120 : 48
    },
    legend: input.series.length > 1 ? { top: 0 } : undefined,
    tooltip: baseTooltip(),
    xAxis: input.horizontal ? valueAxis : categoryAxis,
    yAxis: input.horizontal ? categoryAxis : valueAxis,
    series: input.series.map(item => ({
      barMaxWidth: 32,
      data: item.data,
      name: item.name,
      stack: item.stack,
      type: "bar"
    }))
  }
}

export function buildDonutOption(input: {
  rows: Array<{ name: string; value: number }>
}): EChartsOption {
  return {
    color: palette,
    legend: {
      bottom: 0
    },
    tooltip: {
      trigger: "item"
    },
    series: [
      {
        data: input.rows,
        innerRadius: "52%",
        label: {
          formatter: "{b}\n{d}%",
          lineHeight: 16
        },
        outerRadius: "76%",
        radius: ["52%", "76%"],
        type: "pie"
      }
    ]
  }
}
