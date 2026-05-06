import { Empty } from "antd"

export function JsonViewer(props: { value: unknown }) {
  if (!props.value) {
    return <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return <pre className="json-viewer">{JSON.stringify(props.value, null, 2)}</pre>
}
