import { DatePicker, Form, Select } from "antd"
import type { Dayjs } from "dayjs"
import type { Project } from "../types/models"

export function ProjectFilterBar(props: {
  dateRange: [Dayjs | null, Dayjs | null]
  onDateRangeChange: (value: [Dayjs | null, Dayjs | null]) => void
  onProjectChange: (value: number) => void
  projectId?: number
  projects: Project[]
}) {
  return (
    <Form className="filter-bar" layout="inline">
      <Form.Item label="项目">
        <Select
          className="filter-project"
          onChange={props.onProjectChange}
          options={props.projects.map(project => ({
            label: project.projectName,
            value: project.id
          }))}
          placeholder="选择项目"
          value={props.projectId}
        />
      </Form.Item>
      <Form.Item label="时间范围">
        <DatePicker.RangePicker
          allowEmpty={[true, true]}
          showTime
          value={props.dateRange}
          onChange={value => props.onDateRangeChange([value?.[0] ?? null, value?.[1] ?? null])}
        />
      </Form.Item>
    </Form>
  )
}
