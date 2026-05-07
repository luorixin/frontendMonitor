import { Alert, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, message, Select, Space, Switch, Table, Tabs, Upload } from "antd"
import { ReloadOutlined, RotateLeftOutlined, UploadOutlined } from "@ant-design/icons"
import { useEffect, useState } from "react"
import { createAlertRule, listAlertRecords, listAlertRules, testAlertRule, updateAlertRuleStatus } from "../../../api/alerts.api"
import { getErrorMessage } from "../../../api/helpers"
import { createProject, listProjects, rotateProjectKey, updateProjectStatus } from "../../../api/projects.api"
import { getReplay, listReplays } from "../../../api/replays.api"
import { PageHeader } from "../../../components/PageHeader"
import { PriorityTag, ProjectStatusTag } from "../../../components/StatusTag"
import { useProject } from "../../../app/project"
import type { AlertEvaluation, AlertRecord, AlertRule, Project, ReplaySession } from "../../../types/models"
import { formatDateTime } from "../../../utils/date"
import { buildParams } from "../../../utils/query"
import { toBackendDateTime } from "../../../utils/date"

type ProjectFormValues = {
  allowedOrigins: string
  appName: string
  appVersion?: string
  description?: string
  projectName: string
  status: number
}

type AlertFormValues = {
  enabled: boolean
  eventType?: string
  name: string
  thresholdCount: number
  windowMinutes: number
}

export function ManagePage() {
  const { currentProjectId, dateRange, reloadProjects } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsTotal, setProjectsTotal] = useState(0)
  const [projectsPageNum, setProjectsPageNum] = useState(1)
  const [projectsPageSize, setProjectsPageSize] = useState(20)
  const [rules, setRules] = useState<AlertRule[]>([])
  const [rulesTotal, setRulesTotal] = useState(0)
  const [rulesPageNum, setRulesPageNum] = useState(1)
  const [rulesPageSize, setRulesPageSize] = useState(20)
  const [records, setRecords] = useState<AlertRecord[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPageNum, setRecordsPageNum] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(20)
  const [replays, setReplays] = useState<ReplaySession[]>([])
  const [replaysTotal, setReplaysTotal] = useState(0)
  const [replaysPageNum, setReplaysPageNum] = useState(1)
  const [replaysPageSize, setReplaysPageSize] = useState(20)
  const [selectedReplay, setSelectedReplay] = useState<ReplaySession | null>(null)
  const [alertTest, setAlertTest] = useState<AlertEvaluation | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [projectForm] = Form.useForm<ProjectFormValues>()
  const [alertForm] = Form.useForm<AlertFormValues>()

  async function loadProjectsTab() {
    const table = await listProjects(buildParams({ pageNum: projectsPageNum, pageSize: projectsPageSize }))
    setProjects(table.rows)
    setProjectsTotal(table.total)
  }

  async function loadAlertsTab() {
    if (!currentProjectId) return
    const ruleParams = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      pageNum: rulesPageNum,
      pageSize: rulesPageSize,
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })
    const recordParams = buildParams({
      endTime: toBackendDateTime(dateRange[1]),
      pageNum: recordsPageNum,
      pageSize: recordsPageSize,
      projectId: currentProjectId,
      startTime: toBackendDateTime(dateRange[0])
    })
    const [ruleTable, recordTable] = await Promise.all([listAlertRules(ruleParams), listAlertRecords(recordParams)])
    setRules(ruleTable.rows)
    setRulesTotal(ruleTable.total)
    setRecords(recordTable.rows)
    setRecordsTotal(recordTable.total)
  }

  async function loadReplayTab() {
    if (!currentProjectId) return
    const table = await listReplays(buildParams({
      pageNum: replaysPageNum,
      pageSize: replaysPageSize,
      projectId: currentProjectId
    }))
    setReplays(table.rows)
    setReplaysTotal(table.total)
  }

  async function loadAll() {
    setLoading(true)
    setError("")
    try {
      await Promise.all([loadProjectsTab(), loadAlertsTab(), loadReplayTab()])
    } catch (reason) {
      setError(getErrorMessage(reason, "管理页数据加载失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setRulesPageNum(1)
    setRecordsPageNum(1)
    setReplaysPageNum(1)
  }, [currentProjectId, dateRange])

  useEffect(() => {
    void loadAll()
  }, [
    currentProjectId,
    dateRange,
    projectsPageNum,
    projectsPageSize,
    rulesPageNum,
    rulesPageSize,
    recordsPageNum,
    recordsPageSize,
    replaysPageNum,
    replaysPageSize
  ])

  async function onCreateProject(values: ProjectFormValues) {
    await createProject({
      ...values,
      allowedOrigins: values.allowedOrigins.split(/\s*,\s*/).filter(Boolean)
    })
    message.success("项目已创建")
    projectForm.resetFields()
    await Promise.all([loadProjectsTab(), reloadProjects()])
  }

  async function onCreateAlertRule(values: AlertFormValues) {
    if (!currentProjectId) return
    await createAlertRule({ ...values, projectId: currentProjectId })
    message.success("告警规则已创建")
    alertForm.resetFields()
    await loadAlertsTab()
  }

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        actions={<Button icon={<ReloadOutlined />} onClick={() => void loadAll()}>刷新</Button>}
        subtitle="项目、告警和 Replay 的运营面管理"
        title="管理"
      />
      {error ? <Alert message={error} type="error" /> : null}
      <Tabs
        items={[
          {
            key: "projects",
            label: "项目管理",
            children: (
              <div className="split-grid">
                <Card title="项目列表">
                  <Table
                    columns={[
                      { dataIndex: "projectName", key: "projectName", title: "项目名" },
                      { dataIndex: "appName", key: "appName", title: "应用" },
                      {
                        dataIndex: "status",
                        key: "status",
                        render: value => <ProjectStatusTag value={value} />,
                        title: "状态"
                      },
                      { dataIndex: "projectKey", key: "projectKey", title: "Key" },
                      {
                        key: "actions",
                        render: (_, record) => (
                          <Space>
                            <Button
                              onClick={() =>
                                void updateProjectStatus(record.id, record.status === 1 ? 0 : 1)
                                  .then(loadProjectsTab)
                                  .then(reloadProjects)
                              }
                              size="small"
                            >
                              {record.status === 1 ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              icon={<RotateLeftOutlined />}
                              onClick={() =>
                                void rotateProjectKey(record.id).then(result => {
                                  message.success(`新 key: ${result.projectKey}`)
                                  void Promise.all([loadProjectsTab(), reloadProjects()])
                                })
                              }
                              size="small"
                            >
                              Rotate
                            </Button>
                          </Space>
                        ),
                        title: "操作"
                      }
                    ]}
                    dataSource={projects}
                    loading={loading}
                    pagination={{
                      current: projectsPageNum,
                      onChange: (page, size) => {
                        setProjectsPageNum(page)
                        setProjectsPageSize(size)
                      },
                      pageSize: projectsPageSize,
                      showSizeChanger: true,
                      total: projectsTotal
                    }}
                    rowKey="id"
                  />
                </Card>
                <Card title="新建项目">
                  <Form
                    form={projectForm}
                    initialValues={{ allowedOrigins: "http://localhost:4176", status: 1 }}
                    layout="vertical"
                    onFinish={values => void onCreateProject(values)}
                  >
                    <Form.Item label="项目名称" name="projectName" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="应用名称" name="appName" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="应用版本" name="appVersion">
                      <Input />
                    </Form.Item>
                    <Form.Item label="描述" name="description">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item label="Allowed Origins" name="allowedOrigins">
                      <Input />
                    </Form.Item>
                    <Form.Item label="状态" name="status">
                      <Select options={[{ label: "Enabled", value: 1 }, { label: "Disabled", value: 0 }]} />
                    </Form.Item>
                    <Button htmlType="submit" type="primary">创建项目</Button>
                  </Form>
                </Card>
              </div>
            )
          },
          {
            key: "alerts",
            label: "告警规则",
            children: (
              <div className="split-grid">
                <Card title="规则列表">
                  <Table
                    columns={[
                      { dataIndex: "name", key: "name", title: "规则名" },
                      { dataIndex: "eventType", key: "eventType", title: "事件类型" },
                      { dataIndex: "thresholdCount", key: "thresholdCount", title: "阈值" },
                      { dataIndex: "windowMinutes", key: "windowMinutes", title: "窗口(分钟)" },
                      {
                        dataIndex: "enabled",
                        key: "enabled",
                        render: value => <Switch checked={value} disabled />,
                        title: "启用"
                      },
                      {
                        key: "actions",
                        render: (_, record) => (
                          <Space>
                            <Button
                              onClick={() => void updateAlertRuleStatus(record.id, !record.enabled).then(loadAlertsTab)}
                              size="small"
                            >
                              {record.enabled ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              onClick={() => void testAlertRule(record.id).then(setAlertTest)}
                              size="small"
                            >
                              Test
                            </Button>
                          </Space>
                        ),
                        title: "操作"
                      }
                    ]}
                    dataSource={rules}
                    pagination={{
                      current: rulesPageNum,
                      onChange: (page, size) => {
                        setRulesPageNum(page)
                        setRulesPageSize(size)
                      },
                      pageSize: rulesPageSize,
                      showSizeChanger: true,
                      total: rulesTotal
                    }}
                    rowKey="id"
                  />
                  {alertTest ? (
                    <Descriptions bordered column={2} size="small" title="最近测试结果">
                      <Descriptions.Item label="Triggered">{String(alertTest.triggered)}</Descriptions.Item>
                      <Descriptions.Item label="Actual Count">{alertTest.actualCount}</Descriptions.Item>
                      <Descriptions.Item label="Threshold">{alertTest.thresholdCount}</Descriptions.Item>
                      <Descriptions.Item label="Window">{alertTest.windowStart} ~ {alertTest.windowEnd}</Descriptions.Item>
                    </Descriptions>
                  ) : null}
                </Card>
                <Card title="创建规则">
                  <Form
                    form={alertForm}
                    initialValues={{ enabled: true, eventType: "js_error", thresholdCount: 1, windowMinutes: 60 }}
                    layout="vertical"
                    onFinish={values => void onCreateAlertRule(values)}
                  >
                    <Form.Item label="名称" name="name" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="事件类型" name="eventType">
                      <Input />
                    </Form.Item>
                    <Form.Item label="阈值" name="thresholdCount" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label="窗口(分钟)" name="windowMinutes" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label="启用" name="enabled" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Button htmlType="submit" type="primary">创建规则</Button>
                  </Form>
                </Card>
                <Card title="触发记录">
                  <Table
                    columns={[
                      { dataIndex: "ruleId", key: "ruleId", title: "Rule ID" },
                      { dataIndex: "actualCount", key: "actualCount", title: "Actual" },
                      { dataIndex: "thresholdCount", key: "thresholdCount", title: "Threshold" },
                      {
                        dataIndex: "triggeredAt",
                        key: "triggeredAt",
                        render: value => formatDateTime(value),
                        title: "触发时间"
                      }
                    ]}
                    dataSource={records}
                    pagination={{
                      current: recordsPageNum,
                      onChange: (page, size) => {
                        setRecordsPageNum(page)
                        setRecordsPageSize(size)
                      },
                      pageSize: recordsPageSize,
                      showSizeChanger: true,
                      total: recordsTotal
                    }}
                    rowKey="id"
                    size="small"
                  />
                </Card>
              </div>
            )
          },
          {
            key: "replays",
            label: "Replay",
            children: (
              <Card title="Replay Sessions">
                <Table
                  columns={[
                    { dataIndex: "replayId", key: "replayId", title: "Replay ID" },
                    { dataIndex: "sessionId", key: "sessionId", title: "Session ID" },
                    { dataIndex: "release", key: "release", title: "Release" },
                    {
                      dataIndex: "chunkCount",
                      key: "chunkCount",
                      title: "Chunks"
                    },
                    {
                      key: "actions",
                      render: (_, record) => (
                        <Button
                          onClick={() => void getReplay(record.replayId).then(setSelectedReplay)}
                          size="small"
                        >
                          查看
                        </Button>
                      ),
                      title: "操作"
                    }
                  ]}
                  dataSource={replays}
                  loading={loading}
                  pagination={{
                    current: replaysPageNum,
                    onChange: (page, size) => {
                      setReplaysPageNum(page)
                      setReplaysPageSize(size)
                    },
                    pageSize: replaysPageSize,
                    showSizeChanger: true,
                    total: replaysTotal
                  }}
                  rowKey="replayId"
                />
              </Card>
            )
          }
        ]}
      />

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedReplay(null)}
        open={Boolean(selectedReplay)}
        title="Replay 详情"
        width={760}
      >
        {selectedReplay ? (
          <Space className="page-stack" direction="vertical" size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Replay ID">{selectedReplay.replayId}</Descriptions.Item>
              <Descriptions.Item label="Session">{selectedReplay.sessionId || "-"}</Descriptions.Item>
              <Descriptions.Item label="Initial URL">{selectedReplay.initialUrl || "-"}</Descriptions.Item>
              <Descriptions.Item label="Environment">{selectedReplay.environment || "-"}</Descriptions.Item>
              <Descriptions.Item label="Started At">{formatDateTime(selectedReplay.startedAt)}</Descriptions.Item>
              <Descriptions.Item label="Last Seen">{formatDateTime(selectedReplay.lastSeenAt)}</Descriptions.Item>
            </Descriptions>
            <Table
              columns={[
                { dataIndex: "sequenceNo", key: "sequenceNo", title: "#" },
                { dataIndex: "eventCount", key: "eventCount", title: "Events" },
                {
                  dataIndex: "createTime",
                  key: "createTime",
                  render: value => formatDateTime(value),
                  title: "Captured At"
                },
                { dataIndex: "payloadJson", key: "payloadJson", title: "Payload" }
              ]}
              dataSource={selectedReplay.chunks || []}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}
