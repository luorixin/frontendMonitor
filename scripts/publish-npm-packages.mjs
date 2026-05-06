import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const dryRun = process.argv.includes("--dry-run")

const packageDirs = [
  "packages/core",
  "packages/vue3",
  "packages/react",
  "packages/nuxt3"
]

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

function npmViewVersion(packageName) {
  try {
    return execFileSync("npm", ["view", packageName, "version"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim()
  } catch {
    return null
  }
}

for (const packageDir of packageDirs) {
  const cwd = path.join(repoRoot, packageDir)
  const manifestPath = path.join(cwd, "package.json")

  if (!existsSync(manifestPath)) {
    throw new Error(`Missing package manifest: ${manifestPath}`)
  }

  const manifest = readJson(manifestPath)
  const publishedVersion = npmViewVersion(manifest.name)

  if (publishedVersion === manifest.version) {
    console.log(`Skipping ${manifest.name}@${manifest.version}; already published`)
    continue
  }

  const args = ["publish", "--access", "public"]

  if (dryRun) {
    args.push("--dry-run")
  }

  console.log(`Publishing ${manifest.name}@${manifest.version}`)
  execFileSync("npm", args, {
    cwd,
    stdio: "inherit",
    env: process.env
  })
}
