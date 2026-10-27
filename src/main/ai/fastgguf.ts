import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { LocalDevice } from '@shared/types'
import { AiError, AiStoppedError } from './prompt'

/**
 * Local AI: runs .gguf models on this computer with fastgguf's built-in server
 * (`fastgguf serve model.gguf PORT CTX`), which speaks the OpenAI Chat Completions API.
 * One server runs at a time; it is restarted when the model or its settings change.
 */

export interface LocalConfig {
  /** The fastgguf program, e.g. fastgguf_big.exe. */
  exe: string
  modelsDir: string
  /** A .gguf file name, relative to modelsDir. */
  model: string
  ctx: number
  device: LocalDevice
}

/** How long a model may take to load before giving up. Big models on a slow disk take a while. */
const LOAD_TIMEOUT_MS = 10 * 60_000

// fastgguf reads FASTGGUF_GPU: auto = a dedicated card when there is one, off = CPU only, on = any card.
const GPU_ENV: Record<LocalDevice, string> = { auto: 'auto', cpu: 'off', gpu: 'on' }

const isGguf = (name: string): boolean => /\.gguf$/i.test(name) && !/mmproj/i.test(name)

/** The .gguf files in the models folder and its direct subfolders, as paths relative to it. */
export async function listLocalModels(dir: string): Promise<string[]> {
  if (!dir) throw new AiError('Choose the folder with your .gguf models in Settings.')
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    throw new AiError(`Could not open the models folder ${dir}. Choose it again in Settings.`)
  }
  const out: string[] = []
  for (const e of entries) {
    if (e.isFile() && isGguf(e.name)) out.push(e.name)
    else if (e.isDirectory()) {
      const inner = await fs.readdir(join(dir, e.name), { withFileTypes: true }).catch(() => [])
      for (const f of inner) if (f.isFile() && isGguf(f.name)) out.push(`${e.name}/${f.name}`)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** The full path of a model file. Refuses names that point outside the models folder. */
export function resolveLocalModel(dir: string, model: string): string {
  const full = resolve(dir, model)
  const rel = relative(resolve(dir), full)
  if (!/\.gguf$/i.test(model) || !rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new AiError('Pick a .gguf model from your models folder in Settings.')
  }
  return full
}

/** fastgguf's server arguments: numbers are read as the port, then the context size. */
export function serveArgs(modelPath: string, port: number, ctx: number): string[] {
  return ['serve', modelPath, String(port), String(ctx)]
}

interface LocalServer {
  /** The settings this server was started with. */
  key: string
  baseURL: string
  /** Random key the server requires, so other programs on the network can't use it. */
  apiKey: string
  proc: ChildProcess | null
  ready: Promise<void>
  loaded: boolean
  exited: boolean
  /** The last lines fastgguf printed, for error messages. */
  log: string[]
}

let server: LocalServer | null = null

function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const s = createServer()
    s.once('error', fail)
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      s.close(() => ok(port))
    })
  })
}

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function lastLines(log: string[]): string {
  const tail = log.slice(-4).join(' ').trim()
  return tail ? ` fastgguf said: ${tail}` : ''
}

async function waitUntilListening(s: LocalServer): Promise<void> {
  const deadline = Date.now() + LOAD_TIMEOUT_MS
  // fastgguf loads the model before it opens the port, so the first answer means it is ready.
  while (!s.exited) {
    try {
      const res = await fetch(`${s.baseURL}/models`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) throw new AiError('The local model took too long to load.' + lastLines(s.log))
    await pause(300)
  }
}

function startServer(key: string, cfg: LocalConfig, modelPath: string): LocalServer {
  const s: LocalServer = {
    key,
    baseURL: '',
    apiKey: randomBytes(24).toString('hex'),
    proc: null,
    ready: Promise.resolve(),
    loaded: false,
    exited: false,
    log: []
  }
  s.ready = (async () => {
    const port = await freePort()
    s.baseURL = `http://127.0.0.1:${port}/v1`
    const proc = spawn(cfg.exe, serveArgs(modelPath, port, cfg.ctx), {
      cwd: dirname(cfg.exe),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FASTGGUF_API_KEY: s.apiKey, FASTGGUF_GPU: GPU_ENV[cfg.device] }
    })
    s.proc = proc
    // Always read the output: a full pipe would block fastgguf.
    const onOutput = (buf: Buffer): void => {
      for (const line of buf.toString('utf8').split(/\r?\n/)) if (line.trim()) s.log.push(line.trim())
      if (s.log.length > 40) s.log.splice(0, s.log.length - 40)
    }
    proc.stdout?.on('data', onOutput)
    proc.stderr?.on('data', onOutput)
    const stopped = new Promise<never>((_, fail) => {
      proc.once('error', (e) => {
        s.exited = true
        fail(new AiError(`Could not start fastgguf: ${e.message}`))
      })
      proc.once('exit', (code) => {
        s.exited = true
        fail(new AiError(`fastgguf stopped while loading the model (exit code ${code}).` + lastLines(s.log)))
      })
    })
    await Promise.race([stopped, waitUntilListening(s)])
    s.loaded = true
  })()
  // A failed start is reported to whoever waits for it; nothing else should see it.
  s.ready.catch(() => {})
  return s
}

/** Stops the local server, if one runs. */
export function stopLocalServer(): void {
  if (server?.proc && !server.exited) server.proc.kill()
  server = null
}

/**
 * Starts fastgguf with this model (or reuses the running server) and waits until the
 * model is loaded. onLoading is called when the user has to wait for a load.
 */
export async function ensureLocalServer(
  cfg: LocalConfig,
  signal: AbortSignal,
  onLoading: () => void = () => {}
): Promise<{ baseURL: string; apiKey: string }> {
  if (!cfg.exe) throw new AiError('Choose the fastgguf program in Settings to use Local AI.')
  const modelPath = resolveLocalModel(cfg.modelsDir, cfg.model)
  if (!(await fs.stat(cfg.exe).then((st) => st.isFile(), () => false))) {
    throw new AiError(`fastgguf was not found at ${cfg.exe}. Choose it again in Settings.`)
  }
  if (!(await fs.stat(modelPath).then((st) => st.isFile(), () => false))) {
    throw new AiError(`The model file ${cfg.model} is not in the models folder any more. Pick another model in Settings.`)
  }

  const key = JSON.stringify([cfg.exe, modelPath, cfg.ctx, cfg.device])
  if (!server || server.key !== key || server.exited) {
    stopLocalServer()
    server = startServer(key, cfg, modelPath)
  }
  const s = server
  if (!s.loaded) onLoading()

  const aborted = new Promise<never>((_, fail) => {
    const stop = (): void => fail(new AiStoppedError('Stopped.'))
    if (signal.aborted) stop()
    else signal.addEventListener('abort', stop, { once: true })
  })
  aborted.catch(() => {})
  try {
    await Promise.race([s.ready, aborted])
  } catch (e) {
    // Start again next time instead of reusing a server that failed to load.
    if (server === s && !(e instanceof AiStoppedError)) stopLocalServer()
    throw e
  }
  return { baseURL: s.baseURL, apiKey: s.apiKey }
}
