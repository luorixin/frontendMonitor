import { LockOutlined, UserOutlined } from "@ant-design/icons"
import { Alert, Button, Card, Form, Input, Typography } from "antd"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { getErrorMessage } from "../../../api/helpers"
import { useSession } from "../../../app/session"

type FormValues = {
  password: string
  username: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function onFinish(values: FormValues) {
    setSubmitting(true)
    setError("")
    try {
      await login(values.username, values.password)
      navigate("/", { replace: true })
    } catch (reason) {
      setError(getErrorMessage(reason, "登录失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <Card className="login-card" variant="borderless">
        <Typography.Text className="login-kicker">frontend-monitor report</Typography.Text>
        <Typography.Title level={2}>后台管理系统</Typography.Title>
        <Typography.Paragraph type="secondary">
          基于 backend 暴露接口构建的监控报表与运营管理台。
        </Typography.Paragraph>
        {error ? <Alert className="login-alert" message={error} type="error" /> : null}
        <Form<FormValues> initialValues={{ password: "admin123456", username: "admin" }} layout="vertical" onFinish={onFinish}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button block htmlType="submit" loading={submitting} size="large" type="primary">
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}
