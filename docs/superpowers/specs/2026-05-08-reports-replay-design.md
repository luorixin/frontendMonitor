# Reports Replay Design

## Summary

Add session replay playback to the report-side issue workflow in `apps/report/src/modules/reports`.

The first release is intentionally narrow:

- entry point: `Issue 详情` drawer only
- visibility: only when the selected issue can resolve to a `replayId`
- loading: lazy, on expand
- playback: basic rrweb timeline playback only
- exclusions: no standalone replay route, no error timestamp seek, no speed controls, no fullscreen workflow, no cross-issue cache

## Goals

- Let an operator inspect an issue and immediately replay the related user session without leaving the reports module.
- Reuse the existing replay detail API instead of changing backend replay contracts.
- Keep the first version small enough to verify with focused backend regression tests and a frontend build pass.

## Non-goals

- New backend replay endpoints
- Replay playback in `ManagePage`
- Automatic selection across multiple replay candidates
- Highlighting the error moment inside the replay
- Timeline annotations, event jump list, playback speed presets, fullscreen mode

## Current State

The repository already has:

- replay collection and replay detail APIs
- report-side `getReplay(replayId)` data access
- issue detail drawer in `ReportsPage.tsx`
- issue-linked `replayId` on events, but no playback UI

The missing layer is presentation: replay chunks are still returned as `payloadJson` blobs and the reports module does not adapt them into a player-ready event stream.

## Chosen Approach

Use the existing replay detail API and add a thin report-side adapter:

1. resolve a `replayId` from the selected issue's related events
2. lazy-load replay detail when the user expands the replay panel
3. adapt replay chunks into one ordered rrweb event array
4. render that array in an embedded player inside the issue drawer

This keeps backend changes minimal and gives the frontend a reversible seam. If a future standalone replay page needs a more normalized API, the adapter can move to the backend later without breaking this first UI.

## UX Design

### Issue Drawer

Inside `Issue 详情`, add a new section named `Session Replay`.

Behavior:

- hidden when the issue has no replay candidate
- rendered as a collapsible panel when a replay candidate exists
- collapsed by default
- first expand triggers the network request

Panel states:

- idle: collapsed label only
- loading: spinner/skeleton
- success: embedded player
- empty/bad data: inline empty state
- fetch failure: inline error alert with retry button

### Replay Candidate Resolution

The issue object does not carry a canonical replay id.

For this first version, the replay panel uses the already loaded `issueEvents` list:

- first non-empty `event.replayId` wins
- if no event carries `replayId`, replay UI stays hidden

This avoids changing issue contracts during the first pass.

## Technical Design

### Frontend Modules

Add small, local modules under `apps/report/src/modules/reports`:

- `components/ReplayPanel.tsx`
  - owns collapsed/expanded state
  - triggers lazy loading
  - owns loading/error/empty rendering
- `components/ReplayPlayerCard.tsx`
  - owns player mount lifecycle
  - receives normalized rrweb events
- `utils/replay-adapter.ts`
  - converts `ReplaySession` into player input

`ReportsPage.tsx` should only:

- decide whether a replay candidate exists
- pass the selected issue and replay id into `ReplayPanel`

### Data Flow

1. user opens `Issue 详情`
2. reports page loads `issueEvents` as it already does
3. page derives `replayId` from `issueEvents`
4. user expands `Session Replay`
5. `ReplayPanel` calls `getReplay(replayId)`
6. adapter:
   - sorts chunks by `sequenceNo`
   - parses `payloadJson`
   - extracts each chunk's `events`
   - concatenates them into one rrweb event array
7. player renders from the normalized array

### Adapter Contract

The adapter should return a small normalized structure like:

```ts
type ReplayPlayerData = {
  replayId: string
  startedAt?: string
  initialUrl?: string
  events: unknown[]
}
```

Adapter rules:

- ignore chunks with empty payloads
- fail fast on malformed JSON
- reject payloads that do not contain an event array
- preserve chunk order by `sequenceNo`

### Player Choice

Use an rrweb-compatible player in the report app.

The player surface only needs:

- render container
- play/pause
- timeline scrubber provided by the player default UI

The first release should prefer the lightest integration that fits the existing stack. No custom transport, annotations, or synchronized side panels are needed.

## Backend Design

No new replay endpoint is required for the first version.

The existing `GET /api/v1/monitor/replays/{replayId}` contract remains the source of truth.

Backend work is limited to keeping current replay detail tests green while the report-side consumer is added.

## Error Handling

- no replay candidate: hide the replay section
- 404 replay detail: show inline error state
- malformed chunk payload: show "回放数据不可用"
- empty merged event list: show empty state
- player init failure: show inline error and keep the drawer usable

Failures in replay rendering must not break issue detail rendering.

## Testing

### Frontend

Add focused tests where practical for:

- replay adapter sorts chunks correctly
- replay adapter merges chunk event arrays correctly
- replay adapter rejects malformed payloads
- replay panel does not fetch until expanded

If the report app lacks a current unit-test harness, keep the adapter isolated so tests can be added in a follow-up without reshaping production code.

### Backend

Keep these regression tests green:

- replay collection/detail module tests
- monitor issue detail regressions already added
- Flyway compatibility regressions

### Verification

- targeted backend replay and issue regressions
- `apps/report` production build
- manual smoke check in the issue drawer after implementation

## Risks

- replay payload shape may differ between chunks if future SDK changes land before the UI is updated
- large replay sessions may be heavy to parse on first expand
- deriving `replayId` from issue events assumes the event list contains at least one replay-linked event in the selected time window

## Follow-ups

- add error timestamp seek/highlight
- add standalone replay route
- cache replay detail per replay id during a session
- consider backend-side normalized replay payload when a second consumer appears
