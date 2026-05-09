import { Alert, Button, Collapse, Empty, Skeleton } from "antd"
import { lazy, Suspense, useState } from "react"
import { getReplay } from "../../../api/replays.api"
import { adaptReplaySession, type ReplayPlayerData } from "../utils/replay-adapter"

const ReplayPlayerCard = lazy(() => import("./ReplayPlayerCard").then(module => ({ default: module.ReplayPlayerCard })))

type ReplayPanelProps = {
  replayId: string
}

export function ReplayPanel({ replayId }: ReplayPanelProps) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [playerData, setPlayerData] = useState<ReplayPlayerData | null>(null)

  async function loadReplay() {
    if (loaded || loading) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const replay = await getReplay(replayId)
      setPlayerData(adaptReplaySession(replay))
      setLoaded(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "回放加载失败")
    } finally {
      setLoading(false)
    }
  }

  async function retryReplay() {
    setLoaded(false)
    setPlayerData(null)
    await loadReplay()
  }

  return (
    <Collapse
      items={[
        {
          key: "session-replay",
          label: "Session Replay",
          children: loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : error ? (
            <Alert
              action={<Button onClick={() => void retryReplay()} size="small">重试</Button>}
              message={error}
              type="error"
            />
          ) : playerData ? (
            <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
              <ReplayPlayerCard data={playerData} />
            </Suspense>
          ) : (
            <Empty description="回放数据不可用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        }
      ]}
      onChange={keys => {
        if (Array.isArray(keys) && keys.includes("session-replay")) {
          void loadReplay()
        }
      }}
    />
  )
}
