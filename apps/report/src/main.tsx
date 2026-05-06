import "antd/dist/reset.css"
import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./app/App"
import "./app/styles.css"

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
