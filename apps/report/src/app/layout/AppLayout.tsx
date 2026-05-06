import { Alert, Button, Layout, Menu, Space, Spin, Typography } from "antd"
import {
  AlertOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CodeOutlined,
  DashboardOutlined,
  LogoutOutlined
} from "@ant-design/icons"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ProjectFilterBar } from "../../components/ProjectFilterBar"
import { useProject } from "../project"
import { useSession } from "../session"

const { Content, Header, Sider } = Layout

const items = [
  { icon: <DashboardOutlined />, key: "/", label: <Link to="/">首页</Link> },
  { icon: <BarChartOutlined />, key: "/reports", label: <Link to="/reports">报表</Link> },
  { icon: <AppstoreOutlined />, key: "/manage", label: <Link to="/manage">管理</Link> },
  { icon: <CodeOutlined />, key: "/source-maps", label: <Link to="/source-maps">Source Map</Link> }
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, session } = useSession()
  const { currentProjectId, dateRange, loading, projects, setCurrentProjectId, setDateRange } = useProject()

  return (
    <Layout className="shell-layout">
      <Sider breakpoint="lg" collapsedWidth={72} theme="light" width={232}>
        <div className="brand-block">
          <Typography.Title level={4}>Report Console</Typography.Title>
          <Typography.Text type="secondary">frontend-monitor</Typography.Text>
        </div>
        <Menu items={items} mode="inline" selectedKeys={[location.pathname]} />
      </Sider>
      <Layout>
        <Header className="shell-header">
          <div>
            <Typography.Text strong>{session?.user.email}</Typography.Text>
            <Typography.Text type="secondary">统一接入 backend 管理接口</Typography.Text>
          </div>
          <Space>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                void logout().then(() => navigate("/login"))
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="shell-content">
          <div className="content-top">
            <ProjectFilterBar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onProjectChange={setCurrentProjectId}
              projectId={currentProjectId}
              projects={projects}
            />
          </div>
          {loading ? (
            <div className="loading-block">
              <Spin />
            </div>
          ) : projects.length === 0 ? (
            <Alert message="暂无可用项目，请先在管理页创建项目。" type="info" />
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
