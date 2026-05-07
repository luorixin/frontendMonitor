import { Alert, Button, Card, Form, Input, Space, Table, Upload, type UploadFile } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import { useEffect, useState } from "react"
import { getErrorMessage } from "../../../api/helpers"
import { listSourceMaps, uploadSourceMap, uploadSourceMapsBatch } from "../../../api/sourceMaps.api"
import { PageHeader } from "../../../components/PageHeader"
import { useProject } from "../../../app/project"
import type { SourceMapArtifact } from "../../../types/models"
import { buildParams } from "../../../utils/query"

type FormValues = {
  artifact: string
  artifactPrefix: string
  dist: string
  release: string
}

export function SourceMapPage() {
  const { currentProject, currentProjectId } = useProject()
  const [items, setItems] = useState<SourceMapArtifact[]>([])
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<FormValues>()

  async function loadItems() {
    if (!currentProjectId) return
    setLoading(true)
    setError("")
    try {
      const table = await listSourceMaps(buildParams({
        dist: form.getFieldValue("dist") || undefined,
        pageNum,
        pageSize,
        projectId: currentProjectId
      }))
      setItems(table.rows)
      setTotal(table.total)
    } catch (reason) {
      setError(getErrorMessage(reason, "Source Map 列表加载失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPageNum(1)
  }, [currentProjectId])

  useEffect(() => {
    void loadItems()
  }, [currentProjectId, pageNum, pageSize])

  async function onFinish(values: FormValues) {
    if (!currentProjectId || files.length === 0) return
    setLoading(true)
    setError("")
    try {
      const uploadFiles = files
        .map(file => file.originFileObj as File | undefined)
        .filter((file): file is File => Boolean(file))

      if (uploadFiles.length === 1 && values.artifact.trim()) {
        await uploadSourceMap(
          currentProjectId,
          values.release,
          values.dist || undefined,
          values.artifact.trim(),
          uploadFiles[0]
        )
      } else {
        const artifacts = uploadFiles.map(file => deriveArtifactPath(file, values.artifactPrefix))
        await uploadSourceMapsBatch(
          currentProjectId,
          values.release,
          values.dist || undefined,
          artifacts,
          uploadFiles
        )
      }
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
              { dataIndex: "dist", key: "dist", title: "Dist" },
              { dataIndex: "artifact", key: "artifact", title: "Artifact" },
              { dataIndex: "fileName", key: "fileName", title: "文件名" },
              { dataIndex: "fileSize", key: "fileSize", title: "大小" }
            ]}
            dataSource={items}
            loading={loading}
            pagination={{
              current: pageNum,
              onChange: (page, size) => {
                setPageNum(page)
                setPageSize(size)
              },
              pageSize,
              showSizeChanger: true,
              total
            }}
            rowKey="id"
          />
        </Card>
        <Card title="上传 Source Map">
          <Form form={form} layout="vertical" onFinish={values => void onFinish(values)}>
            <Form.Item label="Release" name="release" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Dist" name="dist">
              <Input placeholder="可选，例如 web-42" />
            </Form.Item>
            <Form.Item
              extra="单文件上传时填写精确 artifact。批量上传时可留空，系统会按文件路径自动推导。"
              label="Artifact"
              name="artifact"
            >
              <Input />
            </Form.Item>
            <Form.Item
              extra="批量上传时用于补齐前缀，例如 /assets。留空时默认从根路径开始。"
              initialValue="/"
              label="Artifact Prefix"
              name="artifactPrefix"
            >
              <Input />
            </Form.Item>
            <Form.Item label="文件">
              <Upload
                beforeUpload={() => false}
                fileList={files}
                maxCount={50}
                multiple
                onChange={info => setFiles(info.fileList)}
              >
                <Button icon={<UploadOutlined />}>选择一个或多个 .map 文件</Button>
              </Upload>
            </Form.Item>
            {files.length > 1 ? (
              <Table
                columns={[
                  { dataIndex: "name", key: "name", title: "文件" },
                  { dataIndex: "artifact", key: "artifact", title: "推导 Artifact" }
                ]}
                dataSource={files
                  .map(file => file.originFileObj as File | undefined)
                  .filter((file): file is File => Boolean(file))
                  .map(file => ({
                    artifact: deriveArtifactPath(file, form.getFieldValue("artifactPrefix") || "/"),
                    key: `${file.name}-${file.size}`,
                    name: file.webkitRelativePath || file.name
                  }))}
                pagination={false}
                rowKey="key"
                size="small"
              />
            ) : null}
            <Button htmlType="submit" type="primary">上传</Button>
          </Form>
        </Card>
      </div>
    </Space>
  )
}

function deriveArtifactPath(file: File, artifactPrefix: string) {
  const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, "/")
  const withoutMapSuffix = relativePath.replace(/\.map$/i, "")
  const normalizedPath = withoutMapSuffix.replace(/^\/+/, "")
  const prefix = (artifactPrefix || "/").trim() || "/"
  const normalizedPrefix = prefix === "/" ? "" : `/${prefix.replace(/^\/+|\/+$/g, "")}`
  return `${normalizedPrefix}/${normalizedPath}`.replace(/\/{2,}/g, "/")
}
