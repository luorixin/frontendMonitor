import { App as AntApp, ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "./routes"
import { ProjectProvider } from "./project"
import { SessionProvider } from "./session"

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <SessionProvider>
          <ProjectProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ProjectProvider>
        </SessionProvider>
      </AntApp>
    </ConfigProvider>
  )
}
