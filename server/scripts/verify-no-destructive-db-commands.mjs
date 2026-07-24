import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.cwd()
const scanRoots = ['package.json', 'prisma', 'scripts']
const forbidden = [
  /--force-reset/i,
  /--accept-data-loss/i,
  /prisma\s+db\s+seed/i,
  /\bdeleteMany\s*\(\s*(?:\{\s*\})?\s*\)/,
]

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const result = []
  for (const entry of entries) {
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) result.push(...await files(entryPath))
    else result.push(entryPath)
  }
  return result
}

const targets = []
for (const target of scanRoots) {
  const path = join(root, target)
  if (target.endsWith('.json')) targets.push(path)
  else targets.push(...await files(path))
}

const violations = []
for (const path of targets) {
  if (path.endsWith('verify-no-destructive-db-commands.mjs')) continue
  const content = await readFile(path, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(content)) violations.push(`${relative(root, path)} matches ${pattern}`)
  }
}

if (violations.length) {
  console.error('Destructive database command check failed:\n' + violations.join('\n'))
  process.exit(1)
}

console.log('No destructive database command entrypoints found.')
