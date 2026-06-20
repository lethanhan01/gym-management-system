const { createHash } = require('node:crypto')
const fs = require('node:fs')
const net = require('node:net')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const dotenv = require('dotenv')

const serverRoot = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '.env.local'), override: true })

const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[dev] PORT khong hop le: ${process.env.PORT}`)
  process.exit(1)
}

const workspaceKey = createHash('sha1')
  .update(process.platform === 'win32' ? serverRoot.toLowerCase() : serverRoot)
  .digest('hex')
  .slice(0, 12)
const lockPath = path.join(os.tmpdir(), `gym-server-dev-${workspaceKey}.json`)

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function removeOwnLock() {
  const lock = readLock()
  if (lock?.pid !== process.pid) return
  try {
    fs.unlinkSync(lockPath)
  } catch {
    // The lock may already have been removed by another shutdown handler.
  }
}

function isPortAvailable() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.unref()
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false)
        return
      }
      reject(error)
    })
    probe.once('listening', () => {
      probe.close(() => resolve(true))
    })
    probe.listen({ host: '::', port, exclusive: true })
  })
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  child.kill('SIGTERM')
}

async function main() {
  const existingLock = readLock()
  if (existingLock && isProcessAlive(existingLock.pid)) {
    console.log(
      `[dev] Server dev da chay tai http://localhost:${existingLock.port ?? port} ` +
        `(PID ${existingLock.pid}).`,
    )
    return
  }

  if (existingLock) {
    fs.rmSync(lockPath, { force: true })
  }

  if (!(await isPortAvailable())) {
    console.error(
      `[dev] Port ${port} dang duoc mot tien trinh khac su dung. ` +
        'Hay dung tien trinh do hoac thay doi PORT trong .env.',
    )
    process.exitCode = 1
    return
  }

  try {
    fs.writeFileSync(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        port,
        serverRoot,
        startedAt: new Date().toISOString(),
      }),
      { flag: 'wx' },
    )
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log('[dev] Mot tien trinh dev khac dang khoi dong.')
      return
    }
    throw error
  }

  const nestCli = path.join(serverRoot, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js')
  const child = spawn(process.execPath, [nestCli, 'start', '--watch'], {
    cwd: serverRoot,
    env: process.env,
    stdio: 'inherit',
  })

  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    stopChild(child)
    removeOwnLock()
  }

  process.once('SIGINT', () => {
    shutdown()
    process.exit(130)
  })
  process.once('SIGTERM', () => {
    shutdown()
    process.exit(143)
  })
  process.once('exit', removeOwnLock)

  child.once('error', (error) => {
    console.error('[dev] Khong the khoi dong Nest CLI:', error.message)
    shutdown()
    process.exitCode = 1
  })
  child.once('exit', (code, signal) => {
    removeOwnLock()
    if (signal) {
      process.exitCode = 1
      return
    }
    process.exitCode = code ?? 0
  })
}

main().catch((error) => {
  removeOwnLock()
  console.error('[dev] Khoi dong server that bai:', error)
  process.exitCode = 1
})
