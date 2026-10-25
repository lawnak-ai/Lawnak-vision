import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Deck, DeckSummary, GenerateEvent, ModelId, Settings, Slide } from '@shared/types'
import { parseReply } from '@shared/parseSlides'
import { newId } from '@shared/ids'
import { Sidebar, type View } from './components/Sidebar'
import { Home, type NewDeckRequest } from './components/Home'
import { DeckEditor } from './components/DeckEditor'
import { HistoryView, TemplatesView } from './components/Views'
import { SettingsDialog } from './components/SettingsDialog'
import type { LiveGeneration } from './components/ChatPanel'
import { IconSidebar } from './components/icons'
import { titleFromPrompt } from './util'

interface Generation {
  requestId: string
  deckId: string
  scope: 'deck' | 'slide'
  slideIndex?: number
  raw: string
  draft: Slide[]
  title?: string
  status: string
}

interface Toast {
  text: string
  path?: string
}

const api = window.api

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [view, setView] = useState<View>({ kind: 'home' })
  const [deck, setDeck] = useState<Deck | null>(null)
  const [gen, setGen] = useState<Generation | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const saveTimer = useRef<number | undefined>(undefined)
  const pendingSave = useRef<Deck | null>(null)
  const selectedIndex = useRef(0)
  const genRef = useRef<Generation | null>(null)
  genRef.current = gen

  const refreshDecks = useCallback(async () => setDecks(await api.listDecks()), [])

  const showToast = useCallback((t: Toast) => {
    setToast(t)
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 6000)
  }, [])

  useEffect(() => {
    void api.getSettings().then(setSettings)
    void refreshDecks()
  }, [refreshDecks])

  // ---- Saving: edits are written to disk shortly after they stop. ----

  const flushSave = useCallback(async () => {
    window.clearTimeout(saveTimer.current)
    const d = pendingSave.current
    pendingSave.current = null
    if (d) {
      await api.saveDeck(d)
      await refreshDecks()
    }
  }, [refreshDecks])

  const editDeck = useCallback(
    (next: Deck) => {
      if (genRef.current?.deckId === next.id) return // read-only while the AI is writing
      setDeck(next)
      pendingSave.current = next
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => void flushSave(), 400)
    },
    [flushSave]
  )

  // ---- Navigation ----

  const navigate = useCallback(
    async (next: View) => {
      await flushSave()
      setView(next)
      if (next.kind === 'deck') {
        if (deck?.id !== next.id) {
          const d = await api.getDeck(next.id)
          if (d) setDeck(d)
          else {
            showToast({ text: 'That presentation could not be found.' })
            setView({ kind: 'home' })
            await refreshDecks()
          }
        }
      }
    },
    [deck?.id, flushSave, refreshDecks, showToast]
  )

  // ---- AI generation ----

  useEffect(
    () =>
      api.onGenerateEvent((ev: GenerateEvent) => {
        const g = genRef.current
        if (!g || ev.requestId !== g.requestId) return
        // Events can arrive faster than React renders, so keep the ref current.
        const update = (next: Generation | null): void => {
          genRef.current = next
          setGen(next)
        }
        switch (ev.type) {
          case 'status':
            update({ ...g, status: ev.text })
            break
          case 'text':
            update({ ...g, raw: g.raw + ev.text })
            break
          case 'meta':
            update({ ...g, title: ev.title })
            break
          case 'slide': {
            const draft = [...g.draft]
            draft[g.scope === 'slide' ? ev.index - (g.slideIndex ?? 0) : ev.index] = ev.slide
            update({ ...g, draft })
            break
          }
          case 'done':
            update(null)
            setDeck((cur) => (cur?.id === ev.deck.id ? ev.deck : cur))
            void refreshDecks()
            break
          case 'error':
            update(null)
            showToast({ text: ev.message })
            // The user's message was saved before the request; reload to show it.
            void api.getDeck(g.deckId).then((d) => d && setDeck((cur) => (cur?.id === d.id ? d : cur)))
            void refreshDecks()
            break
        }
      }),
    [refreshDecks, showToast]
  )

  const startGeneration = useCallback(
    async (target: Deck, prompt: string, scope: 'deck' | 'slide', slideIndex?: number, slideCount?: number) => {
      if (genRef.current) {
        showToast({ text: 'Wait for the current generation to finish, or stop it.' })
        return
      }
      await flushSave()
      const requestId = newId('r')
      const g: Generation = { requestId, deckId: target.id, scope, slideIndex, raw: '', draft: [], status: 'Starting…' }
      genRef.current = g
      setGen(g)
      // Show the user's message straight away; the main process saves it too.
      setDeck((cur) =>
        cur?.id === target.id ? { ...cur, chat: [...cur.chat, { role: 'user', text: prompt, at: Date.now() }] } : cur
      )
      await api.generate({ requestId, deckId: target.id, prompt, scope, slideIndex, slideCount })
    },
    [flushSave, showToast]
  )

  const stopGeneration = useCallback(() => {
    if (genRef.current) void api.cancel(genRef.current.requestId)
  }, [])

  const createFromPrompt = useCallback(
    async (req: NewDeckRequest) => {
      const d = await api.createDeck({ title: titleFromPrompt(req.prompt), project: req.project, themeId: req.themeId })
      setDeck(d)
      setView({ kind: 'deck', id: d.id })
      await refreshDecks()
      await startGeneration(d, req.prompt, 'deck', undefined, req.slideCount)
    },
    [refreshDecks, startGeneration]
  )

  const createFromTemplate = useCallback(
    async (templateId: string) => {
      if (!settings) return
      const d = await api.createDeck({ project: settings.projects[0] ?? 'My Presentations', themeId: settings.defaultThemeId, templateId })
      setDeck(d)
      setView({ kind: 'deck', id: d.id })
      await refreshDecks()
    },
    [refreshDecks, settings]
  )

  // ---- Present / export ----

  const withDeck = useCallback(
    async (fn: (id: string) => Promise<unknown>) => {
      if (view.kind !== 'deck' || !deck) return
      await flushSave()
      try {
        return await fn(deck.id)
      } catch (e) {
        showToast({ text: e instanceof Error ? e.message : String(e) })
      }
    },
    [deck, flushSave, showToast, view.kind]
  )

  const present = useCallback((index: number) => void withDeck((id) => api.present(id, index)), [withDeck])
  const openInBrowser = useCallback(() => void withDeck((id) => api.openInBrowser(id)), [withDeck])
  const exportAs = useCallback(
    (kind: 'html' | 'pdf') =>
      void withDeck(async (id) => {
        const path = kind === 'html' ? await api.exportHtml(id) : await api.exportPdf(id)
        if (path) showToast({ text: `Saved ${kind.toUpperCase()} to ${path}`, path })
      }),
    [showToast, withDeck]
  )

  const deleteDeck = useCallback(async () => {
    if (!deck || !window.confirm(`Delete “${deck.title}”? This cannot be undone.`)) return
    window.clearTimeout(saveTimer.current)
    pendingSave.current = null
    await api.deleteDeck(deck.id)
    setDeck(null)
    setView({ kind: 'home' })
    await refreshDecks()
  }, [deck, refreshDecks])

  // ---- Settings ----

  const saveSettings = useCallback(async (patch: Partial<Settings>) => setSettings(await api.setSettings(patch)), [])
  const setModel = useCallback((model: ModelId) => void saveSettings({ model }), [saveSettings])

  // ---- Menu shortcuts from the main process ----

  useEffect(
    () =>
      api.onMenu((action) => {
        if (action === 'new') void navigate({ kind: 'home' })
        else if (action === 'settings') setShowSettings(true)
        else if (action === 'toggle-sidebar') setSidebarOpen((o) => !o)
        else if (action === 'present') present(selectedIndex.current)
        else if (action === 'browser') openInBrowser()
        else if (action === 'export-html') exportAs('html')
        else if (action === 'export-pdf') exportAs('pdf')
      }),
    [exportAs, navigate, openInBrowser, present]
  )

  // ---- What the editor shows: the saved deck, or the slides arriving from the AI. ----

  const viewDeck = useMemo(() => {
    if (!deck || !gen || gen.deckId !== deck.id) return deck
    let slides = deck.slides
    if (gen.scope === 'deck') {
      if (gen.draft.length || deck.slides.length === 0) slides = gen.draft.filter(Boolean)
    } else if (gen.slideIndex !== undefined && gen.draft.length) {
      slides = [...deck.slides]
      slides.splice(gen.slideIndex, 1, ...gen.draft.filter(Boolean))
    }
    return { ...deck, slides, title: gen.title ?? deck.title }
  }, [deck, gen])

  const live: LiveGeneration | null =
    gen && deck && gen.deckId === deck.id
      ? { status: gen.status, message: parseReply(gen.raw).message, slidesDone: gen.draft.length, scope: gen.scope }
      : null

  if (!settings) return <div className="loading" />

  const projects = Array.from(new Set([...settings.projects, ...decks.map((d) => d.project)]))
  const hasKey = settings.hasApiKey || settings.envApiKey

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-hidden'}`}>
      {sidebarOpen && (
        <Sidebar
          view={view}
          decks={decks}
          projects={projects}
          generatingDeckId={gen?.deckId ?? null}
          onNavigate={(v) => void navigate(v)}
          onNewProject={(name) => void saveSettings({ projects: Array.from(new Set([...settings.projects, name])) })}
          onToggle={() => setSidebarOpen(false)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      <main className="main">
        {!sidebarOpen && (
          <button className="icon-btn floating" onClick={() => setSidebarOpen(true)} title="Show sidebar">
            <IconSidebar />
          </button>
        )}
        {view.kind === 'home' && (
          <Home
            settings={settings}
            projects={projects}
            onCreate={(r) => void createFromPrompt(r)}
            onModelChange={setModel}
            onBrowseTemplates={() => setView({ kind: 'templates' })}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {view.kind === 'templates' && <TemplatesView onUse={(id) => void createFromTemplate(id)} />}
        {view.kind === 'history' && <HistoryView decks={decks} onOpen={(id) => void navigate({ kind: 'deck', id })} />}
        {view.kind === 'deck' && viewDeck && viewDeck.id === view.id && (
          <DeckEditor
            key={viewDeck.id}
            deck={viewDeck}
            busy={gen?.deckId === viewDeck.id}
            live={live}
            model={settings.model}
            hasKey={hasKey}
            onChange={editDeck}
            onGenerate={(prompt, scope, index) => void startGeneration(viewDeck, prompt, scope, scope === 'slide' ? index : undefined)}
            onStop={stopGeneration}
            onModelChange={setModel}
            onPresent={present}
            onOpenInBrowser={openInBrowser}
            onExportHtml={() => exportAs('html')}
            onExportPdf={() => exportAs('pdf')}
            onDelete={() => void deleteDeck()}
            onOpenSettings={() => setShowSettings(true)}
            onSelectionChange={(i) => (selectedIndex.current = i)}
          />
        )}
      </main>

      {showSettings && (
        <SettingsDialog
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={saveSettings}
          onSaveKey={async (key) => setSettings(await api.setApiKey(key))}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.path && (
            <button className="link" onClick={() => void api.showFile(toast.path!)}>
              Show in folder
            </button>
          )}
          <button className="icon-btn small" onClick={() => setToast(null)} title="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
