import React, { lazy, Suspense } from "react"
import { Spin } from "antd"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "./layout/AppLayout"
import { useProject } from "./project"
import { useSession } from "./session"

const LoginPage = lazy(() =>
  import("../modules/auth/pages/LoginPage").then(module => ({ default: module.LoginPage }))
)
const HomePage = lazy(() =>
  import("../modules/home/pages/HomePage").then(module => ({ default: module.HomePage }))
)
const ReportsPage = lazy(() =>
  import("../modules/reports/pages/ReportsPage").then(module => ({ default: module.ReportsPage }))
)
const ManagePage = lazy(() =>
  import("../modules/manage/pages/ManagePage").then(module => ({ default: module.ManagePage }))
)
const SourceMapPage = lazy(() =>
  import("../modules/source-map/pages/SourceMapPage").then(module => ({ default: module.SourceMapPage }))
)

function RouteLoading() {
  return <div className="loading-block"><Spin /></div>
}

function ProtectedLayout() {
  const { isAuthenticated } = useSession()
  const { loading } = useProject()

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  if (loading) {
    return <div className="loading-block"><Spin /></div>
  }

  return <AppLayout />
}

export function AppRoutes() {
  const { isAuthenticated } = useSession()

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          element={isAuthenticated ? <Navigate replace to="/" /> : <LoginPage />}
          path="/login"
        />
        <Route element={<ProtectedLayout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<ReportsPage />} path="/reports" />
          <Route element={<ManagePage />} path="/manage" />
          <Route element={<SourceMapPage />} path="/source-maps" />
        </Route>
      </Routes>
    </Suspense>
  )
}
