import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  appendStorageQueue,
  clearStorageQueue,
  readStorageQueue,
  writeStorageQueue
} from "./storageQueue"

type StoredItem = {
  id: string
}

const isStoredItem = (value: unknown): value is StoredItem =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof (value as { id?: unknown }).id === "string"

describe("storageQueue", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("returns an empty queue for invalid JSON and non-array payloads", () => {
    window.localStorage.setItem("__queue__", "{broken")
    expect(readStorageQueue({ key: "__queue__", validate: isStoredItem })).toEqual([])

    window.localStorage.setItem("__queue__", JSON.stringify({ id: "not-array" }))
    expect(readStorageQueue({ key: "__queue__", validate: isStoredItem })).toEqual([])
  })

  it("filters invalid entries and trims to maxEntries on append", () => {
    window.localStorage.setItem(
      "__queue__",
      JSON.stringify([{ id: "a" }, { invalid: true }])
    )

    appendStorageQueue(
      { id: "b" },
      {
        key: "__queue__",
        maxEntries: 2,
        validate: isStoredItem
      }
    )
    appendStorageQueue(
      { id: "c" },
      {
        key: "__queue__",
        maxEntries: 2,
        validate: isStoredItem
      }
    )

    expect(readStorageQueue({ key: "__queue__", validate: isStoredItem })).toEqual([
      { id: "b" },
      { id: "c" }
    ])
  })

  it("reports write errors without throwing", () => {
    const onWriteError = vi.fn()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })

    expect(
      writeStorageQueue([{ id: "a" }], {
        key: "__queue__",
        onWriteError,
        validate: isStoredItem
      })
    ).toBe(false)
    expect(onWriteError).toHaveBeenCalledWith(expect.any(Error))
  })

  it("clears empty queues by removing their storage key", () => {
    window.localStorage.setItem("__queue__", JSON.stringify([{ id: "a" }]))

    expect(writeStorageQueue([], { key: "__queue__" })).toBe(true)
    expect(window.localStorage.getItem("__queue__")).toBeNull()

    window.localStorage.setItem("__queue__", JSON.stringify([{ id: "b" }]))
    clearStorageQueue("__queue__")
    expect(window.localStorage.getItem("__queue__")).toBeNull()
  })
})
