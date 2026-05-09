import { BarChart, LineChart, PieChart } from "echarts/charts"
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components"
import { init, use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import type { ECharts, EChartsOption } from "echarts"

export {
  BarChart,
  CanvasRenderer,
  GridComponent,
  init,
  LegendComponent,
  LineChart,
  PieChart,
  TooltipComponent,
  use
}

export type { ECharts, EChartsOption }
