import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, safeStorage, screen, shell, type WebContents } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AppTheme, AskAnswer, AskQuestion, Deck, GenerateEvent, GenerateRequest, Settings, VideoFormat } from '@shared/types'
import { buildDeckDocument, type DeckDocumentOptions } from '@shared/deckHtml'
import { isVideo, VIDEO_FORMATS, videoFormat } from '@shared/video'
import { parseReply } from '@shared/parseSlides'
import { applyFixes, finishReply, toSlide, type ReplyEnd } from '@shared/applyReply'
import { TEMPLATES } from '@shared/templates'
import { newId } from '@shared/ids'
import { cleanSettingsPatch, Store } from './store'
import { AiError, AiStoppedError, listModels, streamSlides } from './ai'
import { ensureLocalServer, listLocalModels, stopLocalServer } from './ai/fastgguf'
import { designSupport, getProvider, isProviderId, PROVIDER_IDS, type ProviderId } from '@shared/providers'
import type { ToolOutput } from './ai/agent'
import { buildDesignReview, createDesignTools, designCheckNote, isArabicText } from './designTools'
import { SlideRenderer } from './render'
import { AUDIO_EXTENSIONS, MediaStore, VideoRecorder } from './video'
import type { StoredSettings } from './store'

let mainWindow: BrowserWindow | null = null
let store: Store
let media: MediaStore

/** Video exports in progress, by job id: the recorder and where the file goes. */
const videoJobs = new Map<string, { recorder: VideoRecorder; target: string }>()

interface RunningJob {
  controller: AbortController
  deckId: string
  /** Set when the deck is deleted mid-request, so the reply is never saved. */
  deleted: boolean
}
const running = new Map<string, RunningJob>()
/** Requests waiting for the user to answer the AI's questions, by request id. */
const waitingAnswers = new Map<string, (answers: AskAnswer[] | null) => void>()

/** The renderer's answers, checked: a list of { questionId, option?, text? }, or null to skip. */
function cleanAnswers(v: unknown): AskAnswer[] | null {
  if (!Array.isArray(v)) return null
  return v.slice(0, 10).flatMap((a): AskAnswer[] => {
    const r = (a ?? {}) as Record<string, unknown>
    if (typeof r.questionId !== 'string') return []
    return [
      {
        questionId: r.questionId.slice(0, 20),
        ...(Number.isInteger(r.option) && (r.option as number) >= 0 ? { option: r.option as number } : {}),
        ...(typeof r.text === 'string' && r.text.trim() ? { text: r.text.slice(0, 300) } : {})
      }
    ]
  })
}

// ---------- API keys (one per provider, encrypted with the OS keychain when available) ----------

function envKey(provider: ProviderId): string | null {
  for (const name of getProvider(provider).envVars) {
    if (process.env[name]) return process.env[name]!
  }
  return null
}

async function readApiKey(provider: ProviderId): Promise<string | null> {
  try {
    const buf = await fs.readFile(store.keyFile(provider))
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8')
  } catch {
    return envKey(provider)
  }
}

async function writeApiKey(provider: ProviderId, key: string | null): Promise<void> {
  const file = store.keyFile(provider)
  if (!key) {
    await fs.rm(file, { force: true })
    return
  }
  const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : Buffer.from(key, 'utf8')
  await fs.writeFile(file, data, { mode: 0o600 })
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

async function getSettings(): Promise<Settings> {
  const s = await store.getSettings()
  const keys = {} as Settings['keys']
  const envKeys = {} as Settings['envKeys']
  for (const id of PROVIDER_IDS) {
    keys[id] = await exists(store.keyFile(id))
    envKeys[id] = Boolean(envKey(id))
  }
  return { ...s, keys, envKeys }
}

/** The key and endpoint for a provider, or an error saying what is missing. */
async function connection(provider: ProviderId, baseUrl: string): Promise<{ apiKey: string; baseURL?: string }> {
  if (provider === 'local') throw new Error('Local AI connects through localConnection.')
  const info = getProvider(provider)
  const apiKey = (await readApiKey(provider)) ?? ''
  if (provider === 'custom') {
    if (!baseUrl.trim()) throw new AiError('Add the server address for the OpenAI-compatible provider in Settings.')
    return { apiKey, baseURL: baseUrl.trim() }
  }
  if (!apiKey) throw new AiError(`Add your ${info.name} API key in Settings to generate slides.`)
  return { apiKey, baseURL: info.baseURL }
}

/** Starts fastgguf with the chosen model (or reuses it) and returns its address. */
function localConnection(s: StoredSettings, signal: AbortSignal, onLoading: () => void) {
  return ensureLocalServer(
    { exe: s.localExe, modelsDir: s.localModelsDir, model: s.model, ctx: s.localCtx, device: s.localDevice },
    signal,
    onLoading
  )
}

// ---------- Deck files for presenting and exporting ----------

async function requireDeck(id: string): Promise<Deck> {
  const deck = await store.getDeck(id)
  if (!deck) throw new Error('Deck not found')
  return deck
}

/** Videos play by themselves, with their music from the media folder. */
function playOptions(deck: Deck): DeckDocumentOptions {
  if (!isVideo(deck)) return {}
  const audio = media.path(deck.audio)
  return { videoMode: 'play', audioUrl: audio ? pathToFileURL(audio).href : undefined }
}

async function writeDeckFile(deck: Deck, startIndex = 0, opts: DeckDocumentOptions = {}): Promise<string> {
  const dir = join(app.getPath('userData'), 'exports')
  await fs.mkdir(dir, { recursive: true })
  const file = join(dir, `${deck.id}.html`)
  await fs.writeFile(file, buildDeckDocument(deck, { ...opts, startIndex }), 'utf8')
  return file
}

function safeFileName(title: string): string {
  return (title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'presentation').slice(0, 80)
}

/** Opens http(s) links in the user's browser instead of inside the app. */
function guardNavigation(contents: WebContents, allow: (url: string) => boolean): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (e, url) => {
    if (allow(url)) return
    e.preventDefault()
    if (/^https?:/i.test(url)) void shell.openExternal(url)
  })
}

async function presentDeck(deckId: string, startIndex: number): Promise<void> {
  const deck = await requireDeck(deckId)
  const video = isVideo(deck)
  const file = await writeDeckFile(deck, startIndex, playOptions(deck))
  // A video plays in a window of its own shape (F goes full screen); a presentation fills the screen.
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize
  const f = videoFormat(deck)
  const fitScale = Math.min((area.width * 0.85) / f.width, (area.height * 0.85) / f.height)
  const win = new BrowserWindow({
    fullscreen: !video,
    ...(video ? { width: Math.round(f.width * fitScale), height: Math.round(f.height * fitScale), useContentSize: true, center: true } : {}),
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: deck.title,
    webPreferences: { sandbox: true, contextIsolation: true }
  })
  win.setMenu(null)
  const fileUrl = pathToFileURL(file).href
  guardNavigation(win.webContents, (url) => url.split('#')[0] === fileUrl)
  // Escape leaves the presentation.
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') win.close()
  })
  await win.loadURL(`${fileUrl}#${startIndex + 1}`)
}

async function exportPdf(deck: Deck, target: string): Promise<void> {
  const file = await writeDeckFile(deck)
  const win = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { sandbox: true } })
  try {
    await win.loadFile(file)
    // Give web fonts and slide scripts a moment to settle.
    await new Promise((r) => setTimeout(r, 600))
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
    await fs.writeFile(target, pdf)
  } finally {
    win.destroy()
  }
}

// ---------- AI generation ----------

async function runGeneration(sender: WebContents, req: GenerateRequest): Promise<void> {
  const send = (ev: GenerateEvent): void => {
    if (!sender.isDestroyed()) sender.send('ai:event', ev)
  }
  const status = (text: string): void => send({ requestId: req.requestId, type: 'status', text })
  const job: RunningJob = { controller: new AbortController(), deckId: req.deckId, deleted: false }
  running.set(req.requestId, job)
  // The deck as it was when the request started, with the user's message added.
  let deck: Deck | null = null
  // The model's reply. A reply may take several turns when the model uses the design tools.
  let full = ''
  // 'review' once the slides are written and the model is looking at pictures of them.
  let phase = 'write' as 'write' | 'review'
  let reviewText = ''
  const fixesSent = new Set<number>()
  let renderer: SlideRenderer | null = null
  const getRenderer = (): SlideRenderer => (renderer ??= new SlideRenderer(app.getPath('temp')))

  const finish = async (text: string, end: ReplyEnd, reviewProblem?: string): Promise<void> => {
    if (!deck || job.deleted) {
      send({ requestId: req.requestId, type: 'error', message: 'This presentation was deleted.' })
      return
    }
    const result = finishReply(deck, text, req.scope, req.slideIndex, end)
    let next = result.deck
    let note = result.note
    if (phase === 'review') {
      const fixes = applyFixes(next, reviewText)
      next = fixes.deck
      const said = fixes.message && !/^looks good/i.test(fixes.message) ? fixes.message + ' ' : ''
      const checkNote = designCheckNote(fixes.fixed, reviewProblem, isArabicText(req.prompt))
      const check = fixes.fixed.length ? said + checkNote : checkNote
      note = `${note}\n\n${check}`
    }
    next = { ...next, chat: [...next.chat, { role: 'assistant', text: note, at: Date.now() }] }
    next = await store.saveDeck(next)
    send({ requestId: req.requestId, type: 'done', deck: next })
  }

  try {
    const settings = await store.getSettings()
    const local = settings.provider === 'local'
    const { apiKey, baseURL } = local
      ? await localConnection(settings, job.controller.signal, () => status('Loading the local model…'))
      : await connection(settings.provider, settings.customBaseUrl)
    const start = await requireDeck(req.deckId)
    deck = await store.saveDeck({ ...start, chat: [...start.chat, { role: 'user', text: req.prompt, at: Date.now() }] })
    // The look the design tools render with; it changes when the user picks a theme.
    let look: Deck = start
    const ask = (questions: AskQuestion[]): Promise<AskAnswer[] | null> =>
      new Promise((resolve, reject) => {
        const signal = job.controller.signal
        const onAbort = (): void => {
          waitingAnswers.delete(req.requestId)
          reject(new AiStoppedError('Stopped.'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        waitingAnswers.set(req.requestId, (answers) => {
          signal.removeEventListener('abort', onAbort)
          resolve(answers)
        })
        send({ requestId: req.requestId, type: 'ask', questions })
      })
    const switchTheme = (themeId: string): void => {
      look = { ...look, themeId }
      if (deck) deck = { ...deck, themeId }
      send({ requestId: req.requestId, type: 'theme', themeId })
    }

    status('Thinking…')
    let emitted = 0
    let metaSent = false
    const support = designSupport(settings.provider)

    // The design check: render the slides just written and let the model fix what looks wrong.
    const followUp = async (): Promise<ToolOutput | null> => {
      try {
        const reply = parseReply(full)
        if (!reply.slides.length) return null
        const draft = finishReply(deck!, full, req.scope, req.slideIndex, 'complete').deck
        const indices =
          req.scope === 'slide' && req.slideIndex !== undefined
            ? reply.slides.map((_, k) => req.slideIndex! + k)
            : // In an edit of the whole deck, only the slides the model changed.
              draft.slides
                .map((s, i) => ({ s, i, old: start.slides[i] }))
                .filter(({ s, old }) => !old || old.html !== s.html || old.className !== s.className)
                .map(({ i }) => i)
        if (!indices.length) return null
        const message = await buildDesignReview(draft, indices, getRenderer(), support.vision, status)
        if (message) {
          phase = 'review'
          status('Improving the design…')
        }
        return message
      } catch (e) {
        // The check is a bonus: if rendering fails, keep the slides as written.
        console.error('Design check failed:', e)
        return null
      }
    }

    const result = await streamSlides({
      provider: settings.provider,
      apiKey,
      baseURL,
      model: settings.model,
      // The server stops at the end of the context, so this lets a local model write as much as fits.
      maxTokens: local ? settings.localCtx : undefined,
      effort: settings.effort,
      // The model sees earlier requests from the chat; leave out this one, which is sent as the request itself.
      deck: start,
      prompt: req.prompt,
      scope: req.scope,
      slideIndex: req.slideIndex,
      slideCount: req.slideCount,
      signal: job.controller.signal,
      tools: support.tools
        ? createDesignTools({
            deck: () => look,
            renderer: getRenderer(),
            vision: support.vision,
            onStatus: status,
            // Asking about the look only makes sense for a whole deck.
            ask: req.scope === 'deck' ? ask : undefined,
            onTheme: switchTheme
          })
        : undefined,
      followUp: settings.designCheck && !local ? followUp : undefined,
      onTurn: () => {
        if (phase !== 'write' || !full) return
        // A new turn after a tool call starts the reply again. Keep the title and CSS it already set,
        // and drop the rest (remarks before the tool call, or slides it is about to rewrite).
        const keep = full.match(/<deck-title>[\s\S]*?<\/deck-title>|<deck-css>[\s\S]*?<\/deck-css>/gi) ?? []
        full = keep.join('\n') + (keep.length ? '\n' : '')
        emitted = 0
      },
      onText: (delta) => {
        if (phase === 'review') {
          reviewText += delta
          // Show each fixed slide as soon as it is finished.
          for (const p of parseReply(reviewText).slides) {
            const i = (p.number ?? 0) - 1
            if (fixesSent.has(i) || i < 0) continue
            fixesSent.add(i)
            send({ requestId: req.requestId, type: 'slide', index: i, slide: toSlide(p) })
            status(`Improved slide ${i + 1}…`)
          }
          return
        }
        full += delta
        send({ requestId: req.requestId, type: 'text', text: delta })
        const parsed = parseReply(full)
        if (!metaSent && parsed.title) {
          metaSent = true
          send({ requestId: req.requestId, type: 'meta', title: parsed.title, css: parsed.css })
        }
        while (emitted < parsed.slides.length) {
          const index = req.scope === 'slide' && req.slideIndex !== undefined ? req.slideIndex + emitted : emitted
          send({ requestId: req.requestId, type: 'slide', index, slide: toSlide(parsed.slides[emitted]) })
          emitted++
          status(`Designing slide ${emitted + 1}…`)
        }
      }
    })

    // A cut-off design check still leaves the slides complete; only its finished fixes are used.
    await finish(full, phase === 'review' || !result.truncated ? 'complete' : 'truncated')
  } catch (e) {
    try {
      // Stopping keeps the slides that were already finished. A failure during the design
      // check keeps the slides as they were written.
      if (phase === 'review' && deck) {
        const why = e instanceof AiStoppedError ? 'you stopped it.' : e instanceof Error ? e.message : String(e)
        await finish(full, 'complete', why)
      } else if (e instanceof AiStoppedError && deck) {
        await finish(full, 'stopped')
      } else {
        throw e
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      send({ requestId: req.requestId, type: 'error', message })
    }
  } finally {
    running.delete(req.requestId)
    await (renderer as SlideRenderer | null)?.close().catch(() => undefined)
  }
}

// ---------- IPC ----------

function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', async (_e, patch) => {
    const saved = await store.saveSettings(cleanSettingsPatch(patch))
    applyAppTheme(saved.appTheme)
    return getSettings()
  })
  ipcMain.handle('settings:setApiKey', async (_e, provider: unknown, key: string | null) => {
    if (!isProviderId(provider)) throw new Error('Unknown provider')
    await writeApiKey(provider, typeof key === 'string' && key.trim() ? key.trim() : null)
    return getSettings()
  })
  ipcMain.handle('ai:listModels', async (_e, provider: unknown) => {
    if (!isProviderId(provider)) return { models: [], error: 'Unknown provider' }
    try {
      const settings = await store.getSettings()
      if (provider === 'local') return { models: await listLocalModels(settings.localModelsDir) }
      const { apiKey, baseURL } = await connection(provider, settings.customBaseUrl)
      return { models: await listModels(provider, apiKey, baseURL) }
    } catch (e) {
      return { models: [], error: e instanceof Error ? e.message : String(e) }
    }
  })

  // The program Local AI runs is only ever set here, from a file the user picked.
  ipcMain.handle('settings:pickLocalExe', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose the fastgguf program',
      properties: ['openFile'],
      filters: process.platform === 'win32' ? [{ name: 'Programs', extensions: ['exe'] }] : []
    })
    if (!res.canceled && res.filePaths[0]) {
      stopLocalServer()
      await store.saveSettings({ localExe: res.filePaths[0] })
    }
    return getSettings()
  })
  ipcMain.handle('settings:pickLocalModelsDir', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose the folder with your .gguf models',
      properties: ['openDirectory']
    })
    if (!res.canceled && res.filePaths[0]) await store.saveSettings({ localModelsDir: res.filePaths[0] })
    return getSettings()
  })

  ipcMain.handle('decks:list', () => store.listDecks())
  ipcMain.handle('decks:get', (_e, id: string) => store.getDeck(id))
  ipcMain.handle('decks:save', (_e, deck: Deck) => store.saveDeck(deck))
  ipcMain.handle('decks:delete', async (_e, id: string) => {
    await media.removeFor(id).catch(() => undefined)
    // Stop any AI request on this deck so its reply can't bring the deck back.
    for (const job of running.values()) {
      if (job.deckId !== id) continue
      job.deleted = true
      job.controller.abort()
    }
    await store.deleteDeck(id)
  })
  ipcMain.handle(
    'decks:create',
    async (_e, opts: { title?: string; project: string; themeId: string; templateId?: string; kind?: unknown; format?: unknown }) => {
      const video = opts.kind === 'video'
      // Templates are presentations; a video starts empty.
      const tpl = video ? undefined : TEMPLATES.find((t) => t.id === opts.templateId)
      const format = VIDEO_FORMATS.find((f) => f.id === opts.format)?.id ?? ('16:9' as VideoFormat)
      const now = Date.now()
      const deck: Deck = {
        id: newId('d'),
        title: opts.title || (tpl && tpl.id !== 'blank' ? tpl.name : video ? 'Untitled video' : 'Untitled presentation'),
        project: opts.project,
        ...(video ? { kind: 'video' as const, format } : {}),
        themeId: tpl?.themeId ?? opts.themeId,
        css: tpl?.css ?? '',
        transition: video ? 'zoom' : tpl?.transition,
        slides: (tpl?.slides ?? []).map((s) => ({ ...s, id: newId('s') })),
        chat: [],
        createdAt: now,
        updatedAt: now
      }
      return store.saveDeck(deck)
    }
  )

  ipcMain.handle('ai:generate', (e, req: GenerateRequest) => {
    void runGeneration(e.sender, req)
  })
  ipcMain.handle('ai:answer', (_e, requestId: string, answers: unknown) => {
    const resolve = waitingAnswers.get(requestId)
    waitingAnswers.delete(requestId)
    resolve?.(cleanAnswers(answers))
  })
  ipcMain.handle('ai:cancel', (_e, requestId: string) => {
    running.get(requestId)?.controller.abort()
  })

  ipcMain.handle('deck:present', (_e, id: string, startIndex = 0) => presentDeck(id, startIndex))
  ipcMain.handle('deck:openInBrowser', async (_e, id: string) => {
    const deck = await requireDeck(id)
    const file = await writeDeckFile(deck, 0, playOptions(deck))
    await shell.openExternal(pathToFileURL(file).href)
  })
  ipcMain.handle('deck:exportHtml', async (_e, id: string) => {
    const deck = await requireDeck(id)
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${safeFileName(deck.title)}.html`,
      filters: [{ name: 'HTML presentation', extensions: ['html'] }]
    })
    if (res.canceled || !res.filePath) return null
    // A video carries its music inside the file, so the file works anywhere.
    const music = isVideo(deck) ? await media.read(deck.audio) : null
    const audioUrl = music ? `data:${music.mime};base64,${music.data.toString('base64')}` : undefined
    const opts: DeckDocumentOptions = isVideo(deck) ? { videoMode: 'play', audioUrl } : {}
    await fs.writeFile(res.filePath, buildDeckDocument(deck, opts), 'utf8')
    return res.filePath
  })

  // ---- Videos ----

  // The music file is only ever chosen here, with a file picker, and copied into the media folder.
  ipcMain.handle('video:pickAudio', async (_e, deckId: string) => {
    await requireDeck(deckId)
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose music for the video',
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    return media.add(deckId, res.filePaths[0])
  })

  /** Asks where to save, then opens the deck in a hidden window ready to record frames. */
  ipcMain.handle('video:begin', async (_e, id: string, container: unknown) => {
    const deck = await requireDeck(id)
    if (!isVideo(deck)) throw new Error('Only videos can be exported as a video file.')
    if (!deck.slides.length) throw new Error('This video has no scenes yet.')
    const ext = container === 'webm' ? 'webm' : 'mp4'
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${safeFileName(deck.title)}.${ext}`,
      filters: [{ name: ext === 'mp4' ? 'MP4 video' : 'WebM video', extensions: [ext] }]
    })
    if (res.canceled || !res.filePath) return null
    const recorder = new VideoRecorder(deck, app.getPath('temp'))
    try {
      await recorder.start()
    } catch (e) {
      await recorder.close()
      throw e
    }
    videoJobs.set(recorder.info.jobId, { recorder, target: res.filePath })
    const music = await media.read(deck.audio)
    return {
      ...recorder.info,
      audio: music ? { data: new Uint8Array(music.data), volume: deck.audio?.volume ?? 1 } : null
    }
  })
  ipcMain.handle('video:frame', async (_e, jobId: string) => {
    const job = videoJobs.get(jobId)
    if (!job) throw new Error('The video export was stopped.')
    const frame = await job.recorder.frame()
    return frame ? new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength) : null
  })
  ipcMain.handle('video:finish', async (_e, jobId: string, data: unknown) => {
    const job = videoJobs.get(jobId)
    videoJobs.delete(jobId)
    if (!job) throw new Error('The video export was stopped.')
    await job.recorder.close()
    if (!(data instanceof Uint8Array)) throw new Error('The video could not be made.')
    await fs.writeFile(job.target, data)
    return job.target
  })
  ipcMain.handle('video:cancel', async (_e, jobId: string) => {
    const job = videoJobs.get(jobId)
    videoJobs.delete(jobId)
    await job?.recorder.close()
  })
  ipcMain.handle('deck:exportPdf', async (_e, id: string) => {
    const deck = await requireDeck(id)
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${safeFileName(deck.title)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (res.canceled || !res.filePath) return null
    await exportPdf(deck, res.filePath)
    return res.filePath
  })
  ipcMain.handle('shell:showFile', (_e, path: string) => shell.showItemInFolder(path))
}

// ---------- Window and menu ----------

function sendMenu(action: string): void {
  mainWindow?.webContents.send('menu', action)
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Presentation', accelerator: 'CmdOrCtrl+N', click: () => sendMenu('new') },
        { type: 'separator' },
        { label: 'Present', accelerator: 'F5', click: () => sendMenu('present') },
        { label: 'Open in Browser', accelerator: 'CmdOrCtrl+B', click: () => sendMenu('browser') },
        { label: 'Export as HTML…', accelerator: 'CmdOrCtrl+E', click: () => sendMenu('export-html') },
        { label: 'Export as PDF…', accelerator: 'CmdOrCtrl+P', click: () => sendMenu('export-pdf') },
        { label: 'Export Video…', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendMenu('export-video') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => sendMenu('settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: () => sendMenu('toggle-sidebar') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/** Window background for each look, so no other color flashes while the page loads. */
const WINDOW_BG = { light: '#f9f9f8', dark: '#141414' }

/** Makes the native parts (menus, scrollbars, the page's color scheme) follow the app theme. */
function applyAppTheme(theme: AppTheme): void {
  nativeTheme.themeSource = theme
  mainWindow?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? WINDOW_BG.dark : WINDOW_BG.light)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? WINDOW_BG.dark : WINDOW_BG.light,
    title: 'Lawnak Vision',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  guardNavigation(mainWindow.webContents, (url) => Boolean(devUrl && url.startsWith(devUrl)))
  if (devUrl) void mainWindow.loadURL(devUrl)
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  mainWindow.on('closed', () => (mainWindow = null))
}

app.whenReady().then(async () => {
  store = new Store(app.getPath('userData'))
  media = new MediaStore(app.getPath('userData'))
  await store.init()
  registerIpc()
  buildMenu()
  applyAppTheme((await store.getSettings()).appTheme)
  // With the 'system' theme, follow the computer when it switches.
  nativeTheme.on('updated', () =>
    mainWindow?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? WINDOW_BG.dark : WINDOW_BG.light)
  )
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// fastgguf runs as a separate program, so stop it with the app.
app.on('will-quit', () => stopLocalServer())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
