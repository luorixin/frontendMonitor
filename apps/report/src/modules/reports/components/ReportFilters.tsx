import { Button, Card, Form, Input, Select, Space } from "antd"

export type EventReportFilters = {
  deviceId?: string
  dist?: string
  environment?: string
  eventType?: string
  keyword?: string
  release?: string
  sessionId?: string
  traceId?: string
  url?: string
  userId?: string
}

export type IssueReportFilters = {
  issueType?: string
  keyword?: string
  status?: string
}

type ReportFiltersProps = {
  eventFilters: EventReportFilters
  issueFilters: IssueReportFilters
  onEventFiltersChange: (filters: EventReportFilters) => void
  onIssueFiltersChange: (filters: IssueReportFilters) => void
}

const eventTypeOptions = [
  "js_error",
  "promise_rejection",
  "console_error",
  "resource_error",
  "request_error",
  "request_performance",
  "performance",
  "page_view",
  "page_dwell",
  "route_change",
  "click",
  "exposure",
  "custom"
].map(value => ({ label: value, value }))

const issueTypeOptions = [
  "js_error",
  "promise_rejection",
  "console_error",
  "resource_error",
  "request_error"
].map(value => ({ label: value, value }))

const statusOptions = ["OPEN", "INVESTIGATING", "IGNORED", "RESOLVED"].map(value => ({ label: value, value }))

function normalizeFilters<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() || undefined : value
    ])
  ) as T
}

export function EventReportFilterCard({
  filters,
  onChange
}: {
  filters: EventReportFilters
  onChange: (filters: EventReportFilters) => void
}) {
  const [form] = Form.useForm<EventReportFilters>()

  return (
    <Card
      extra={(
        <Space>
          <Button onClick={() => {
            form.resetFields()
            onChange({})
          }}>
            重置
          </Button>
          <Button onClick={() => form.submit()} type="primary">筛选</Button>
        </Space>
      )}
      size="small"
      title="事件筛选"
    >
      <Form
        className="report-filter-form"
        form={form}
        initialValues={filters}
        key={JSON.stringify(filters)}
        layout="inline"
        onFinish={values => onChange(normalizeFilters(values))}
      >
        <Form.Item label="类型" name="eventType">
          <Select allowClear className="report-filter-control" options={eventTypeOptions} placeholder="事件类型" />
        </Form.Item>
        <Form.Item label="环境" name="environment">
          <Input allowClear className="report-filter-control" placeholder="production" />
        </Form.Item>
        <Form.Item label="Release" name="release">
          <Input allowClear className="report-filter-control" placeholder="1.2.3" />
        </Form.Item>
        <Form.Item label="Dist" name="dist">
          <Input allowClear className="report-filter-control" placeholder="dist" />
        </Form.Item>
        <Form.Item label="用户" name="userId">
          <Input allowClear className="report-filter-control" placeholder="userId" />
        </Form.Item>
        <Form.Item label="会话" name="sessionId">
          <Input allowClear className="report-filter-control" placeholder="sessionId" />
        </Form.Item>
        <Form.Item label="Trace" name="traceId">
          <Input allowClear className="report-filter-control" placeholder="traceId" />
        </Form.Item>
        <Form.Item label="设备" name="deviceId">
          <Input allowClear className="report-filter-control" placeholder="deviceId" />
        </Form.Item>
        <Form.Item label="URL" name="url">
          <Input allowClear className="report-filter-wide" placeholder="页面或接口 URL" />
        </Form.Item>
        <Form.Item label="关键词" name="keyword">
          <Input.Search allowClear className="report-filter-wide" onSearch={() => form.submit()} placeholder="摘要 / URL" />
        </Form.Item>
      </Form>
    </Card>
  )
}

export function IssueReportFilterCard({
  filters,
  onChange
}: {
  filters: IssueReportFilters
  onChange: (filters: IssueReportFilters) => void
}) {
  const [form] = Form.useForm<IssueReportFilters>()

  return (
    <Card
      extra={(
        <Space>
          <Button onClick={() => {
            form.resetFields()
            onChange({})
          }}>
            重置
          </Button>
          <Button onClick={() => form.submit()} type="primary">筛选</Button>
        </Space>
      )}
      size="small"
      title="Issue 筛选"
    >
      <Form
        className="report-filter-form"
        form={form}
        initialValues={filters}
        key={JSON.stringify(filters)}
        layout="inline"
        onFinish={values => onChange(normalizeFilters(values))}
      >
        <Form.Item label="类型" name="issueType">
          <Select allowClear className="report-filter-control" options={issueTypeOptions} placeholder="Issue 类型" />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select allowClear className="report-filter-control" options={statusOptions} placeholder="状态" />
        </Form.Item>
        <Form.Item label="关键词" name="keyword">
          <Input.Search allowClear className="report-filter-wide" onSearch={() => form.submit()} placeholder="标题 / 指纹 / URL" />
        </Form.Item>
      </Form>
    </Card>
  )
}

export function ReportFilters(props: ReportFiltersProps) {
  return (
    <Space className="page-stack" direction="vertical" size={12}>
      <EventReportFilterCard filters={props.eventFilters} onChange={props.onEventFiltersChange} />
      <IssueReportFilterCard filters={props.issueFilters} onChange={props.onIssueFiltersChange} />
    </Space>
  )
}
