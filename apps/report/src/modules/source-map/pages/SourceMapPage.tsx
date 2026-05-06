import { Alert, Button, Card, Form, Input, Space, Table, Upload, type UploadFile } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import { useEffect, useState } from "react"
import { getErrorMessage } from "../../../api/helpers"
import { listSourceMaps, uploadSourceMap } from "../../../api/sourceMaps.api"
import { PageHeader } from "../../../components/PageHeader"
import { useProject } from "../../../app/project"
import type { SourceMapArtifact } from "../../../types/models"
import { buildParams } from "../../../utils/query"

type FormValues = {
  artifact: string
  release: string
}

export function SourceMapPage() {
  const { currentProject, currentProjectId } = useProject()
  const [items, setItems] = useState<SourceMapArtifact[]>([])
  const [files, setFiles] = useState<UploadFile[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<FormValues>()

  async function loadItems() {
    if (!currentProjectId) return
    setLoading(true)
    setError("")
    try {
      const table = await listSourceMaps(buildParams({ pageNum: 1, pageSize: 50, projectId: currentProjectId }))
      setItems(table.rows)
    } catch (reason) {
      setError(getErrorMessage(reason, "Source Map 列表加载失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [currentProjectId])

  async function onFinish(values: FormValues) {
    if (!currentProjectId || files.length === 0 || !files[0].originFileObj) return
    setLoading(true)
    setError("")
    try {
      await uploadSourceMap(currentProjectId, values.release, values.artifact, files[0].originFileObj as File)
      setFiles([])
      form.resetFields()
      await loadItems()
    } catch (reason) {
      setError(getErrorMessage(reason, "Source Map 上传失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space className="page-stack" direction="vertical" size={16}>
      <PageHeader
        actions={<Button onClick={() => void loadItems()}>刷新</Button>}
        subtitle={currentProject ? `${currentProject.projectName} / ${currentProject.appName}` : "未选择项目"}
        title="Source Map"
      />
      {error ? <Alert message={error} type="error" /> : null}
      <div className="split-grid">
        <Card title="Artifact 列表">
          <Table
            columns={[
              { dataIndex: "release", key: "release", title: "Release" },
              { dataIndex: "artifact", key: "artifact", title: "Artifact" },
              { dataIndex: "fileName", key: "fileName", title: "文件名" },
              { dataIndex: "fileSize", key: "fileSize", title: "大小" }
            ]}
            dataSource={items}
            loading={loading}
            rowKey="id"
          />
        </Card>
        <Card title="上传 Source Map">
          <Form form={form} layout="vertical" onFinish={values => void onFinish(values)}>
            <Form.Item label="Release" name="release" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Artifact" name="artifact" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="文件">
              <Upload
                beforeUpload={() => false}
                fileList={files}
                maxCount={1}
                onChange={info => setFiles(info.fileList)}
              >
                <Button icon={<UploadOutlined />}>选择 .map 文件</Button>
              </Upload>
            </Form.Item>
            <Button htmlType="submit" type="primary">上传</Button>
          </Form>
        </Card>
      </div>
    </Space>
  )
}
