import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  appendAsyncQueue,
  clearAsyncQueue,
  readAsyncQueue,
  writeAsyncQueue
} from "./queueStore"
import { FakeIndexedDB, resetFakeIndexedDB } from "./test-utils/browserFakes"

type StoredItem = {
  id: string
}

const isStoredItem = (value: unknown): value is StoredItem =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof (value as { id?: unknown }).id === "string"

describe("queueStore", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetFakeIndexedDB()
    vi.restoreAllMocks()
    vi.stubGlobal("indexedDB", FakeIndexedDB as unknown as IDBFactory)
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: FakeIndexedDB
    })
  })

  it("reads, appends, and trims entries through IndexedDB", async () => {
    await appendAsyncQueue(
      { id: "a" },
      {
        key: "__queue__",
        maxEntries: 2,
        validate: isStoredItem
      }
    )
    await appendAsyncQueue(
      { id: "b" },
      {
        key: "__queue__",
        maxEntries: 2,
        validate: isStoredItem
      }
    )
    await appendAsyncQueue(
      { id: "c" },
      {
        key: "__queue__",
        maxEntries: 2,
        validate: isStoredItem
      }
    )

    expect(
      await readAsyncQueue({ key: "__queue__", validate: isStoredItem })
    ).toEqual([{ id: "b" }, { id: "c" }])
    expect(window.localStorage.getItem("__queue__")).toBeNull()
  })

  it("falls back to localStorage when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined)
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined
    })

    expect(
      await writeAsyncQueue([{ id: "a" }], {
        key: "__queue__",
        validate: isStoredItem
      })
    ).toBe(true)

    expect(
      JSON.parse(window.localStorage.getItem("__queue__") ?? "[]")
    ).toEqual([{ id: "a" }])
  })

  it("clears empty queues by deleting their IndexedDB key", async () => {
    await writeAsyncQueue([{ id: "a" }], {
      key: "__queue__",
      validate: isStoredItem
    })

    expect(
      await readAsyncQueue({ key: "__queue__", validate: isStoredItem })
    ).toEqual([{ id: "a" }])

    await clearAsyncQueue("__queue__")

    expect(
      await readAsyncQueue({ key: "__queue__", validate: isStoredItem })
    ).toEqual([])
  })
})
