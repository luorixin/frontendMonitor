import { Space, Typography } from "antd"
import type { ReactNode } from "react"

export function PageHeader(props: { actions?: ReactNode; subtitle?: string; title: string }) {
  return (
    <div className="page-header">
      <div>
        <Typography.Title level={3}>{props.title}</Typography.Title>
        {props.subtitle ? <Typography.Text type="secondary">{props.subtitle}</Typography.Text> : null}
      </div>
      {props.actions ? <Space>{props.actions}</Space> : null}
    </div>
  )
}
