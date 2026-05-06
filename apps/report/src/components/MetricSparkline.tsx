type MetricSparklinePoint = {
  label: string
  value: number
}

export function MetricSparkline(props: {
  color?: string
  height?: number
  points: MetricSparklinePoint[]
}) {
  const { color = "#1677ff", height = 76, points } = props

  if (points.length === 0) {
    return <div className="trend-empty">暂无样本</div>
  }

  if (points.length === 1) {
    return (
      <div className="trend-empty">
        {points[0].label}
      </div>
    )
  }

  const width = 320
  const padding = 8
  const values = points.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coordinates = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / (points.length - 1)
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
    return { ...point, x, y }
  })

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding} L ${coordinates[0].x} ${height - padding} Z`
  const latestPoint = coordinates[coordinates.length - 1]

  return (
    <svg
      aria-label="metric trend line"
      className="metric-sparkline"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path d={areaPath} fill={color} fillOpacity="0.08" />
      <path d={linePath} fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.5" />
      {coordinates.map(point => (
        <circle cx={point.x} cy={point.y} fill="#ffffff" key={point.label} r="3" stroke={color} strokeWidth="2" />
      ))}
      <circle cx={latestPoint.x} cy={latestPoint.y} fill={color} r="4.5" />
    </svg>
  )
}
