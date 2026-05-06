import { Tag } from "antd"

export function ProjectStatusTag(props: { value: number }) {
  return props.value === 1 ? <Tag color="green">Enabled</Tag> : <Tag color="default">Disabled</Tag>
}

export function IssueStatusTag(props: { value?: string }) {
  if (props.value === "RESOLVED") return <Tag color="green">Resolved</Tag>
  if (props.value === "IGNORED") return <Tag color="orange">Ignored</Tag>
  return <Tag color="blue">Open</Tag>
}

export function PriorityTag(props: { value?: string }) {
  if (props.value === "CRITICAL") return <Tag color="red">Critical</Tag>
  if (props.value === "HIGH") return <Tag color="volcano">High</Tag>
  if (props.value === "LOW") return <Tag color="default">Low</Tag>
  return <Tag color="gold">Medium</Tag>
}
