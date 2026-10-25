import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell, type WebContents } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Deck, GenerateEvent, GenerateRequest, Settings } from '@shared/types'
import { buildDeckDocument } from '@shared/deckHtml'
import { parseReply } from '@shared/parseSlides'
import { applyReply, toSlide } from '@shared/applyReply'
import { TEMPLATES } from '@shared/templates'
import { newId } from '@shared/ids'
import { Store } from './store'
import { AiError, streamSlides } from './ai'

let mainWindow: BrowserWindow | null = null
let store: Store
const running = new Map<string, AbortController>()

// ---------- API key (encrypted with the OS keychain when available) ----------

async function readApiKey(): Promise<string | null> {
  try {
    const buf = await fs.readFile(store.keyFile)
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8')
  } catch {
    return process.env.ANTHROPIC_API_KEY || null
  }
}

async function writeApiKey(key: string | null): Promise<void> {
  if (!key) {
    await fs.rm(store.keyFile, { force: true })
    return
  }
  const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : Buffer.from(key, 'utf8')
  await fs.writeFile(store.keyFile, data, { mode: 0o600 })
}

async function getSettings(): Promise<Settings> {
  const s = await store.getSettings()
  let hasApiKey = true
  try {
    await fs.access(store.keyFile)
  } catch {
    hasApiKey = false
  }
  return { ...s, hasApiKey, envApiKey: Boolean(process.env.ANTHROPIC_API_KEY) }
}

// ---------- Deck files for presenting and exporting ----------

async function requireDeck(id: string): Promise<Deck> {
  const deck = await store.getDeck(id)
  if (!deck) throw new Error('Deck not found')
  return deck
}

async function writeDeckFile(deck: Deck, startIndex = 0): Promise<string> {
  const dir = join(app.getPath('userData'), 'exports')
  await fs.mkdir(dir, { recursive: true })
  const file = join(dir, `${deck.id}.html`)
  await fs.writeFile(file, buildDeckDocument(deck, { startIndex }), 'utf8')
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
  const file = await writeDeckFile(deck, startIndex)
  const win = new BrowserWindow({
    fullscreen: true,
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
  const controller = new AbortController()
  running.set(req.requestId, controller)

  try {
    const apiKey = await readApiKey()
    if (!apiKey) throw new AiError('Add your Anthropic API key in Settings to generate slides.')
    const settings = await store.getSettings()
    let deck = await requireDeck(req.deckId)

    deck = { ...deck, chat: [...deck.chat, { role: 'user', text: req.prompt, at: Date.now() }] }
    deck = await store.saveDeck(deck)

    send({ requestId: req.requestId, type: 'status', text: 'Thinking…' })
    let full = ''
    let emitted = 0
    let metaSent = false

    const text = await streamSlides({
      apiKey,
      model: settings.model,
      effort: settings.effort,
      deck,
      prompt: req.prompt,
      scope: req.scope,
      slideIndex: req.slideIndex,
      slideCount: req.slideCount,
      signal: controller.signal,
      onText: (delta) => {
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
          send({ requestId: req.requestId, type: 'status', text: `Designing slide ${emitted + 1}…` })
        }
      }
    })

    const reply = parseReply(text)
    let next = applyReply(deck, reply, req.scope, req.slideIndex)
    const note =
      reply.message ||
      (reply.slides.length ? `Updated ${reply.slides.length} slide${reply.slides.length === 1 ? '' : 's'}.` : 'No slides were returned.')
    next = { ...next, chat: [...next.chat, { role: 'assistant', text: note, at: Date.now() }] }
    next = await store.saveDeck(next)
    send({ requestId: req.requestId, type: 'done', deck: next })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    send({ requestId: req.requestId, type: 'error', message })
  } finally {
    running.delete(req.requestId)
  }
}

// ---------- IPC ----------

function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', async (_e, patch) => {
    // The renderer may only change these fields.
    const { model, effort, defaultThemeId, projects } = patch ?? {}
    const clean = Object.fromEntries(
      Object.entries({ model, effort, defaultThemeId, projects }).filter(([, v]) => v !== undefined)
    )
    await store.saveSettings(clean)
    return getSettings()
  })
  ipcMain.handle('settings:setApiKey', async (_e, key: string | null) => {
    await writeApiKey(typeof key === 'string' && key.trim() ? key.trim() : null)
    return getSettings()
  })

  ipcMain.handle('decks:list', () => store.listDecks())
  ipcMain.handle('decks:get', (_e, id: string) => store.getDeck(id))
  ipcMain.handle('decks:save', (_e, deck: Deck) => store.saveDeck(deck))
  ipcMain.handle('decks:delete', (_e, id: string) => store.deleteDeck(id))
  ipcMain.handle(
    'decks:create',
    async (_e, opts: { title?: string; project: string; themeId: string; templateId?: string }) => {
      const tpl = TEMPLATES.find((t) => t.id === opts.templateId)
      const now = Date.now()
      const deck: Deck = {
        id: newId('d'),
        title: opts.title || (tpl && tpl.id !== 'blank' ? tpl.name : 'Untitled presentation'),
        project: opts.project,
        themeId: tpl?.themeId ?? opts.themeId,
        css: '',
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
  ipcMain.handle('ai:cancel', (_e, requestId: string) => {
    running.get(requestId)?.abort()
  })

  ipcMain.handle('deck:present', (_e, id: string, startIndex = 0) => presentDeck(id, startIndex))
  ipcMain.handle('deck:openInBrowser', async (_e, id: string) => {
    const file = await writeDeckFile(await requireDeck(id))
    await shell.openExternal(pathToFileURL(file).href)
  })
  ipcMain.handle('deck:exportHtml', async (_e, id: string) => {
    const deck = await requireDeck(id)
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${safeFileName(deck.title)}.html`,
      filters: [{ name: 'HTML presentation', extensions: ['html'] }]
    })
    if (res.canceled || !res.filePath) return null
    await fs.writeFile(res.filePath, buildDeckDocument(deck), 'utf8')
    return res.filePath
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#141414',
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
  await store.init()
  registerIpc()
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
