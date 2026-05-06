import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
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

const dependencyFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

const workspacePackages = new Map(
  packageDirs.map(packageDir => {
    const manifest = readJson(path.join(repoRoot, packageDir, "package.json"))
    return [manifest.name, { directory: packageDir, version: manifest.version }]
  })
)

function rewriteWorkspaceVersion(range, packageName) {
  if (!range.startsWith("workspace:")) {
    return range
  }

  const workspacePackage = workspacePackages.get(packageName)
  if (!workspacePackage) {
    throw new Error(`Unknown workspace dependency "${packageName}"`)
  }

  const workspaceRange = range.slice("workspace:".length)
  if (workspaceRange === "*" || workspaceRange === "") {
    return workspacePackage.version
  }
  if (workspaceRange === "^" || workspaceRange === "~") {
    return `${workspaceRange}${workspacePackage.version}`
  }
  if (workspaceRange.startsWith("^") || workspaceRange.startsWith("~")) {
    return `${workspaceRange[0]}${workspacePackage.version}`
  }

  return workspacePackage.version
}

function createPublishDirectory(packageDir, manifest) {
  const sourceDir = path.join(repoRoot, packageDir)
  const stagingRoot = mkdtempSync(path.join(os.tmpdir(), `${manifest.name.replaceAll("/", "-")}-`))
  const publishDir = path.join(stagingRoot, path.basename(packageDir))

  cpSync(sourceDir, publishDir, { recursive: true })

  const publishManifestPath = path.join(publishDir, "package.json")
  const publishManifest = readJson(publishManifestPath)

  for (const field of dependencyFields) {
    if (!publishManifest[field]) {
      continue
    }

    for (const [dependencyName, dependencyRange] of Object.entries(publishManifest[field])) {
      publishManifest[field][dependencyName] = rewriteWorkspaceVersion(dependencyRange, dependencyName)
    }
  }

  writeFileSync(publishManifestPath, `${JSON.stringify(publishManifest, null, 2)}\n`)

  return { publishDir, stagingRoot }
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
  const { publishDir, stagingRoot } = createPublishDirectory(packageDir, manifest)

  try {
    execFileSync("npm", args, {
      cwd: publishDir,
      stdio: "inherit",
      env: process.env
    })
  } finally {
    rmSync(stagingRoot, { force: true, recursive: true })
  }
}
