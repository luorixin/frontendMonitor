# Reports Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lazy-loaded session replay playback to the `Issue 详情` drawer in the reports module.

**Architecture:** Keep the backend replay API unchanged and add a thin report-side adapter that converts replay chunks into one rrweb event stream. Keep the UI split into a panel component for lazy loading and a player component for rrweb mount lifecycle so `ReportsPage.tsx` stays focused on issue workflow.

**Tech Stack:** React 18, Ant Design 5, Vite 7, existing `/monitor/replays/{replayId}` API, `rrweb-player`

---

## File Structure

- Modify: `apps/report/package.json`
  - add the replay player dependency used by the reports module
- Modify: `apps/report/src/types/models.ts`
  - keep replay API types aligned with backend response
- Create: `apps/report/src/modules/reports/utils/replay-adapter.ts`
  - normalize replay chunks into a player-ready event array
- Create: `apps/report/src/modules/reports/components/ReplayPlayerCard.tsx`
  - mount and tear down the rrweb player instance
- Create: `apps/report/src/modules/reports/components/ReplayPanel.tsx`
  - lazy fetch replay detail on expand and own loading/error/empty states
- Modify: `apps/report/src/modules/reports/pages/ReportsPage.tsx`
  - resolve `replayId` from issue events and render the replay panel inside the issue drawer
- Modify: `apps/backend/monitor-admin/src/test/java/com/monitor/web/controller/monitor/MonitorModuleIntegrationTest.java`
  - keep the replay-related backend regression path exercised while the report-side consumer is added

## Task 1: Add Replay Player Dependency and Adapter Foundation

**Files:**
- Modify: `apps/report/package.json`
- Create: `apps/report/src/modules/reports/utils/replay-adapter.ts`
- Modify: `apps/report/src/types/models.ts`

- [ ] **Step 1: Add the player dependency**

Update `apps/report/package.json` to include the replay UI dependency:

```json
{
  "dependencies": {
    "rrweb-player": "^1.0.0-alpha.4"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: install completes and `package-lock.json` updates without removing existing app dependencies

- [ ] **Step 3: Write the replay adapter**

Create `apps/report/src/modules/reports/utils/replay-adapter.ts`:

```ts
import type { ReplaySession } from "../../../types/models"

export type ReplayPlayerData = {
  replayId: string
  startedAt?: string
  initialUrl?: string
  events: unknown[]
}

type ReplayChunkPayload = {
  events?: unknown[]
}

export function adaptReplaySession(session: ReplaySession): ReplayPlayerData {
  const chunks = [...(session.chunks || [])].sort((left, right) => left.sequenceNo - right.sequenceNo)
  const events: unknown[] = []

  for (const chunk of chunks) {
    if (!chunk.payloadJson || !chunk.payloadJson.trim()) {
      continue
    }

    const parsed = JSON.parse(chunk.payloadJson) as ReplayChunkPayload
    if (!Array.isArray(parsed.events)) {
      throw new Error("Replay chunk payload does not contain an events array")
    }

    events.push(...parsed.events)
  }

  if (events.length === 0) {
    throw new Error("Replay session does not contain playable events")
  }

  return {
    replayId: session.replayId,
    startedAt: session.startedAt,
    initialUrl: session.initialUrl,
    events
  }
}
```

- [ ] **Step 4: Keep replay API types explicit**

Ensure `apps/report/src/types/models.ts` keeps the replay contract needed by the adapter:

```ts
export type ReplayChunk = {
  id: number
  sequenceNo: number
  eventCount: number
  payloadJson: string
  createTime?: string
}

export type ReplaySession = {
  id: number
  projectId: number
  replayId: string
  initialUrl?: string
  startedAt?: string
  chunks?: ReplayChunk[]
}
```

- [ ] **Step 5: Run a build smoke check**

Run: `npm run build`

Expected: `vite build` succeeds after adding `rrweb-player`

- [ ] **Step 6: Commit**

```bash
git add apps/report/package.json apps/report/package-lock.json apps/report/src/types/models.ts apps/report/src/modules/reports/utils/replay-adapter.ts
git commit -m "Enable replay adapter foundation for reports"
```

## Task 2: Build the Embedded Replay Player

**Files:**
- Create: `apps/report/src/modules/reports/components/ReplayPlayerCard.tsx`

- [ ] **Step 1: Write the player wrapper**

Create `apps/report/src/modules/reports/components/ReplayPlayerCard.tsx`:

```tsx
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
    if (!containerRef.current) return

    try {
      containerRef.current.innerHTML = ""
      playerRef.current = new rrwebPlayer({
        target: containerRef.current,
        props: {
          autoPlay: false,
          events: data.events,
          height: 480,
          showController: true,
          width: 960
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
    <Card
      extra={data.initialUrl || "-"}
      size="small"
      title={`Replay ${data.replayId}`}
    >
      <div ref={containerRef} />
    </Card>
  )
}
```

- [ ] **Step 2: Run a build check**

Run: `npm run build`

Expected: build succeeds and the player dependency resolves in Vite

- [ ] **Step 3: Commit**

```bash
git add apps/report/src/modules/reports/components/ReplayPlayerCard.tsx
git commit -m "Add embedded rrweb player card for report issues"
```

## Task 3: Build the Lazy Replay Panel

**Files:**
- Create: `apps/report/src/modules/reports/components/ReplayPanel.tsx`
- Modify: `apps/report/src/api/replays.api.ts` (only if request types need export cleanup)

- [ ] **Step 1: Write the lazy-loading panel**

Create `apps/report/src/modules/reports/components/ReplayPanel.tsx`:

```tsx
import { Alert, Collapse, Empty, Skeleton, Button } from "antd"
import { useMemo, useState } from "react"
import { getReplay } from "../../../api/replays.api"
import type { ReplaySession } from "../../../types/models"
import { ReplayPlayerCard } from "./ReplayPlayerCard"
import { adaptReplaySession, type ReplayPlayerData } from "../utils/replay-adapter"

type ReplayPanelProps = {
  replayId: string
}

export function ReplayPanel({ replayId }: ReplayPanelProps) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [session, setSession] = useState<ReplaySession | null>(null)

  const playerData = useMemo<ReplayPlayerData | null>(() => {
    if (!session) return null
    return adaptReplaySession(session)
  }, [session])

  async function loadReplay() {
    if (loaded || loading) return
    setLoading(true)
    setError("")
    try {
      setSession(await getReplay(replayId))
      setLoaded(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "回放加载失败")
    } finally {
      setLoading(false)
    }
  }

  async function retryReplay() {
    setLoaded(false)
    setSession(null)
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
            <ReplayPlayerCard data={playerData} />
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
```

- [ ] **Step 2: Run the build to catch type issues**

Run: `npm run build`

Expected: build succeeds with the new panel and no unresolved imports

- [ ] **Step 3: Commit**

```bash
git add apps/report/src/modules/reports/components/ReplayPanel.tsx apps/report/src/api/replays.api.ts
git commit -m "Add lazy replay panel for issue drawer"
```

## Task 4: Integrate Replay into the Issue Drawer

**Files:**
- Modify: `apps/report/src/modules/reports/pages/ReportsPage.tsx`

- [ ] **Step 1: Resolve the replay candidate from issue events**

In `ReportsPage.tsx`, add a derived replay id near the issue drawer state:

```tsx
const issueReplayId =
  selectedIssue && issueEvents.length > 0
    ? issueEvents.find(event => event.replayId && event.replayId.trim())?.replayId
    : undefined
```

- [ ] **Step 2: Import the replay panel**

Add:

```tsx
import { ReplayPanel } from "../components/ReplayPanel"
```

Use the correct relative path from `pages/ReportsPage.tsx`.

- [ ] **Step 3: Render the replay panel inside the issue drawer**

Inside the `selectedIssue` drawer content, insert the replay section above the trend card:

```tsx
{issueReplayId ? <ReplayPanel replayId={issueReplayId} /> : null}
```

Keep the existing issue metadata, trend table, and related events table unchanged.

- [ ] **Step 4: Preserve the current failure boundaries**

Do not move replay loading into `inspectIssue`. Keep replay fetching lazy and isolated:

```tsx
async function inspectIssue(issue: Issue, pageNum = 1, pageSize = issueEventsPageSize) {
  // keep existing issue events + trend fetch only
}
```

- [ ] **Step 5: Run the report build**

Run: `npm run build`

Expected: build succeeds and `ReportsPage` compiles with the new replay section

- [ ] **Step 6: Commit**

```bash
git add apps/report/src/modules/reports/pages/ReportsPage.tsx
git commit -m "Show lazy replay panel in issue detail drawer"
```

## Task 5: Verify End-to-End Support and Backend Compatibility

**Files:**
- Modify: `apps/backend/monitor-admin/src/test/java/com/monitor/web/controller/monitor/MonitorModuleIntegrationTest.java` (only if current replay-linked issue assertions need extension)

- [ ] **Step 1: Extend backend regression coverage if needed**

If the current replay-linked issue test does not explicitly prove replay detail retrieval for a replay-linked issue, add or tighten assertions like:

```java
mockMvc.perform(get("/api/v1/monitor/replays/" + replayId).with(user("admin")))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.data.replayId").value(replayId))
    .andExpect(jsonPath("$.data.chunks[0].payloadJson").isNotEmpty());
```

- [ ] **Step 2: Run focused backend regressions**

Run:

```bash
mvn -pl monitor-admin -am -Dtest=MonitorFlywayMigrationScriptTest,MonitorSourceMapArtifactMapperXmlTest,MonitorModuleIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false -Dmaven.repo.local=.m2/repository test
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Run final report build**

Run:

```bash
npm run build
```

Expected: `vite build` succeeds for `apps/report`

- [ ] **Step 4: Manual smoke check**

Run the report app and verify this flow in a browser:

```bash
npm run dev -- --host 127.0.0.1 --port 4174
```

Expected manual result:

- open `/reports`
- inspect a replay-linked issue
- confirm `Session Replay` panel is collapsed by default
- expand it once
- see player controls render and session playback start only when the user presses play

- [ ] **Step 5: Diff hygiene**

Run:

```bash
git diff --check -- apps/report apps/backend/monitor-admin
```

Expected: no output

- [ ] **Step 6: Commit**

```bash
git add apps/report apps/backend/monitor-admin
git commit -m "Add report-side replay playback for issue investigation"
```

## Self-Review

- Spec coverage:
  - issue drawer entry point: Task 4
  - lazy load on expand: Task 3
  - chunk-to-event adaptation: Task 1
  - embedded playback only: Task 2
  - existing replay API reuse: Tasks 1, 3, 5
- Placeholder scan:
  - no `TODO`/`TBD`
  - commands are explicit
  - file paths are explicit
- Type consistency:
  - `ReplaySession` remains the API contract
  - `ReplayPlayerData` is the local normalized shape
  - `ReplayPanel` takes `replayId`
  - `ReplayPlayerCard` takes normalized data
