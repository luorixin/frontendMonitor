import { Alert, Card } from "antd"
import { useEffect, useRef, useState } from "react"
import rrwebPlayer from "rrweb-player"
import "rrweb-player/dist/style.css"
import type { ReplayPlayerData } from "../utils/replay-adapter"

type ReplayPlayerCardProps = {
  data: ReplayPlayerData
}

export function ReplayPlayerCard({ data }: ReplayPlayerCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<rrwebPlayer | null>(null)
  const [mountError, setMountError] = useState("")

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    try {
      containerRef.current.innerHTML = ""
      const width = Math.max(containerRef.current.clientWidth - 24, 320)
      playerRef.current = new rrwebPlayer({
        target: containerRef.current,
        props: {
          autoPlay: false,
          events: data.events,
          height: Math.round(width * 0.625),
          showController: true,
          width
        }
      })
      setMountError("")
    } catch (reason) {
      setMountError(reason instanceof Error ? reason.message : "回放播放器初始化失败")
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
      playerRef.current = null
    }
  }, [data])

  if (mountError) {
    return <Alert message={mountError} type="error" />
  }

  return (
    <Card extra={data.initialUrl || "-"} size="small" title={`Replay ${data.replayId}`}>
      <div ref={containerRef} style={{ width: "100%" }} />
    </Card>
  )
}
