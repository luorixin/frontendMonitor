import cors from "cors"
import express from "express"

type StoredPayload = {
  base: Record<string, unknown>
  events: Array<Record<string, unknown>>
}

const app = express()
const port = 4318
const events: StoredPayload[] = []

const corsOptions = {
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  origin: true
} as const

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))
app.use(express.json({ limit: "1mb" }))

app.get("/events", (_request, response) => {
  response.json({
    count: events.length,
    items: events
  })
})

app.get("/health", (_request, response) => {
  response.json({ ok: true })
})

app.get("/bad-request", (_request, response) => {
  response.status(404).json({
    message: "Simulated request error"
  })
})

app.post("/collect", (request, response) => {
  const payload = request.body as StoredPayload
  events.push(payload)

  if (events.length > 100) {
    events.shift()
  }

  console.info("[mock-server] collect", {
    eventCount: payload?.events?.length ?? 0,
    eventTypes: payload?.events?.map(event => event.type) ?? []
  })

  response.status(200).json({
    ok: true,
    received: payload?.events?.length ?? 0
  })
})

app.listen(port, () => {
  console.info(`[mock-server] listening on http://localhost:${port}`)
})
