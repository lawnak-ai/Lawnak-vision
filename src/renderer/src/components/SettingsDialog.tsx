import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { LOCAL_CTX_SIZES, type AppTheme, type Effort, type LocalDevice, type Settings } from '@shared/types'
import { THEMES } from '@shared/themes'
import {
  addExtraModel,
  getProvider,
  localModelLabel,
  PROVIDERS,
  providerModels,
  providerReady,
  supportsEffort,
  designSupport,
  type ProviderId
} from '@shared/providers'
import { IconChevronDown, IconPalette, IconSearch, IconSettings, IconSparkle, IconX } from './icons'

interface Props {
  settings: Settings
  onClose: () => void
  onSave: (patch: Partial<Settings>) => Promise<void>
  onSaveKey: (provider: ProviderId, key: string | null) => Promise<void>
  /** Opens the file or folder picker for Local AI. */
  onPickLocal: (what: 'exe' | 'modelsDir') => Promise<void>
}

type PageId = 'general' | 'ai' | 'appearance'

const PAGES: { id: PageId; label: string; icon: (p: { size?: number }) => ReactElement; keywords: string }[] = [
  { id: 'general', label: 'General', icon: IconSettings, keywords: 'effort design speed quality fast balanced thorough check review screenshot pictures' },
  { id: 'ai', label: 'AI provider', icon: IconSparkle, keywords: 'provider api key model server address openai claude gemini local offline gguf fastgguf' },
  { id: 'appearance', label: 'Appearance', icon: IconPalette, keywords: 'theme light dark system mode color colors look default deck' }
]

const APP_THEMES: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

/** A small drawing of the app in one look. */
function MiniApp({ look }: { look: 'light' | 'dark' }) {
  return (
    <span className={`mini-app ${look}`}>
      <span className="mini-side">
        <i />
        <i />
        <i />
      </span>
      <span className="mini-main">
        <i className="mini-title" />
        <i />
        <i className="short" />
        <i className="mini-accent" />
      </span>
    </span>
  )
}

const EFFORTS: { value: Effort; label: string; hint: string }[] = [
  { value: 'low', label: 'Fast', hint: 'Quickest, good for small edits.' },
  { value: 'medium', label: 'Balanced', hint: 'Recommended for most decks.' },
  { value: 'high', label: 'Thorough', hint: 'Slower, more polished design.' }
]

/** One setting: title and description on the left, its control on the right. */
function Row({ title, desc, children, stack }: { title: string; desc?: ReactNode; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={`set-row ${stack ? 'stack' : ''}`}>
      <div className="set-row-text">
        <div className="set-row-title">{title}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      {children && <div className="set-row-control">{children}</div>}
    </div>
  )
}

export function SettingsDialog({ settings, onClose, onSave, onSaveKey, onPickLocal }: Props) {
  const [page, setPage] = useState<PageId>('general')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const pages = q ? PAGES.filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(q)) : PAGES

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-window" role="dialog" aria-label="Settings">
        <div className="settings-titlebar">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <IconX />
          </button>
        </div>

        <div className="settings-body">
          <nav className="settings-nav">
            <label className="settings-search">
              <IconSearch />
              <input
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && pages[0] && setPage(pages[0].id)}
              />
            </label>
            <div className="settings-nav-group">Preferences</div>
            {pages.map((p) => (
              <button key={p.id} className={`settings-nav-item ${page === p.id ? 'on' : ''}`} onClick={() => setPage(p.id)}>
                <p.icon size={18} />
                {p.label}
              </button>
            ))}
            {pages.length === 0 && <div className="settings-nav-empty">No matches</div>}
          </nav>

          <div className="settings-content">
            {page === 'general' && <GeneralPage settings={settings} onSave={onSave} />}
            {page === 'ai' && <AiPage settings={settings} onSave={onSave} onSaveKey={onSaveKey} onPickLocal={onPickLocal} />}
            {page === 'appearance' && <AppearancePage settings={settings} onSave={onSave} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneralPage({ settings, onSave }: Pick<Props, 'settings' | 'onSave'>) {
  const current = EFFORTS.find((e) => e.value === settings.effort)
  return (
    <section className="set-section">
      <h3>General</h3>
      <Row
        title="Design effort"
        desc={
          <>
            How much time the AI spends on each deck. {current?.hint}
            {!supportsEffort(settings.provider) && ' Only Claude models use this; other providers use their own default.'}
          </>
        }
      >
        <div className="segmented" role="radiogroup" aria-label="Design effort">
          {EFFORTS.map((e) => (
            <button
              key={e.value}
              role="radio"
              aria-checked={settings.effort === e.value}
              className={settings.effort === e.value ? 'on' : ''}
              onClick={() => void onSave({ effort: e.value })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </Row>
      <Row
        title="Design check"
        desc={
          <>
            After writing slides, the AI looks at pictures of them and fixes text that runs off the slide, overlaps or
            looks plain. Slower and uses more tokens.
            {!designSupport(settings.provider).vision && ' This model cannot see pictures, so it only gets the automatic layout check.'}
          </>
        }
      >
        <div className="segmented" role="radiogroup" aria-label="Design check">
          {[
            { value: true, label: 'On' },
            { value: false, label: 'Off' }
          ].map((o) => (
            <button
              key={o.label}
              role="radio"
              aria-checked={settings.designCheck === o.value}
              className={settings.designCheck === o.value ? 'on' : ''}
              onClick={() => void onSave({ designCheck: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Row>
    </section>
  )
}

function AppearancePage({ settings, onSave }: Pick<Props, 'settings' | 'onSave'>) {
  return (
    <>
      <section className="set-section">
        <h3>Appearance</h3>
        <Row title="Color mode" desc="How the app looks. System follows your computer's light or dark setting." stack>
          <div className="mode-cards" role="radiogroup" aria-label="Color mode">
            {APP_THEMES.map((t) => (
              <button
                key={t.value}
                role="radio"
                aria-checked={settings.appTheme === t.value}
                className={`mode-card ${settings.appTheme === t.value ? 'on' : ''}`}
                onClick={() => void onSave({ appTheme: t.value })}
              >
                <span className="mode-preview">
                  {t.value === 'system' ? (
                    <>
                      <span className="mode-half">
                        <MiniApp look="light" />
                      </span>
                      <span className="mode-half">
                        <MiniApp look="dark" />
                      </span>
                    </>
                  ) : (
                    <MiniApp look={t.value} />
                  )}
                </span>
                <span className="mode-name">{t.label}</span>
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="set-section">
        <h3>Presentations</h3>
        <Row
          title="Default slide theme"
          desc="The look new presentations start with. It does not change the app or decks you already made."
          stack
        >
          <div className="theme-cards">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-card ${settings.defaultThemeId === t.id ? 'on' : ''}`}
                onClick={() => void onSave({ defaultThemeId: t.id })}
                aria-pressed={settings.defaultThemeId === t.id}
              >
                <span className="theme-card-preview" style={{ background: t.swatch[0] }}>
                  <i style={{ background: t.swatch[1], width: '58%' }} />
                  <i style={{ background: t.swatch[1], width: '82%', opacity: 0.45 }} />
                  <i style={{ background: t.swatch[1], width: '70%', opacity: 0.45 }} />
                </span>
                <span className="theme-card-name">{t.name}</span>
              </button>
            ))}
          </div>
        </Row>
      </section>
    </>
  )
}

const DEVICES: { value: LocalDevice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'cpu', label: 'CPU' },
  { value: 'gpu', label: 'GPU' }
]

/** A chosen file or folder, or a note that none is chosen yet. */
function PathText({ path }: { path: string }) {
  return path ? <span className="path-text" title={path}>{path}</span> : <>Not chosen yet.</>
}

function AiPage({ settings, onSave, onSaveKey, onPickLocal }: Omit<Props, 'onClose'>) {
  // The provider being viewed; the one in use is settings.provider.
  const [tab, setTab] = useState<ProviderId>(settings.provider)
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [baseUrl, setBaseUrl] = useState(settings.customBaseUrl)
  const [otherModel, setOtherModel] = useState('')
  const [loaded, setLoaded] = useState<{ provider: ProviderId; models: string[] } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  const provider = getProvider(tab)
  const hasKey = settings.keys[tab]
  const envKey = settings.envKeys[tab]
  const keyStatus = hasKey
    ? 'A key is saved on this computer.'
    : envKey
      ? `Using ${provider.envVars.join(' or ')} from the environment.`
      : tab === 'custom'
        ? 'No key saved. Local servers such as Ollama do not need one.'
        : 'No key yet.'

  const switchTab = (id: ProviderId): void => {
    setTab(id)
    setKey('')
    setOtherModel('')
    setLoadError('')
  }

  /** Uses a model, remembering it in the pickers when it is not a preset. */
  const useModel = (model: string): Promise<void> =>
    onSave({ provider: tab, model, extraModels: addExtraModel(settings.extraModels, tab, model) })

  const loadModels = async (): Promise<void> => {
    setLoading(true)
    setLoadError('')
    const res = await window.api.listModels(tab)
    setLoading(false)
    if (res.error) setLoadError(res.error)
    else if (!res.models.length) setLoadError(tab === 'local' ? 'No .gguf files in the models folder.' : 'The provider returned no models.')
    else setLoaded({ provider: tab, models: res.models })
  }

  const isLocal = tab === 'local'
  const localReady = providerReady(settings, 'local')

  // Local models are files on this computer, so list them as soon as the folder is known.
  useEffect(() => {
    if (isLocal && localReady) void loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, localReady, settings.localModelsDir])

  const saveKey = async (): Promise<void> => {
    setSaving(true)
    await onSaveKey(tab, key)
    setKey('')
    setSaving(false)
  }

  const submitOther = (): void => {
    if (!otherModel.trim()) return
    void useModel(otherModel.trim())
    setOtherModel('')
  }

  const inUse = settings.provider === tab
  const presets = providerModels(settings, tab)
  const presetIds = new Set(presets.map((m) => m.id))
  const fetched = loaded?.provider === tab ? loaded.models.filter((m) => !presetIds.has(m)) : []
  const current = inUse ? settings.model : ''
  const currentMissing = current !== '' && !presetIds.has(current) && !fetched.includes(current)
  const urlValid = baseUrl.trim() === '' || /^https?:\/\/\S+$/i.test(baseUrl.trim())

  return (
    <>
      <section className="set-section">
        <h3>AI provider</h3>
        <Row
          title="Provider"
          desc="Your deck is sent to the provider you pick when you ask for slides. Pick one to set it up."
        >
          <div className="select-wrap">
            <select value={tab} onChange={(e) => switchTab(e.target.value as ProviderId)} aria-label="Provider">
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {settings.provider === p.id ? '  (in use)' : providerReady(settings, p.id) ? '  (ready)' : ''}
                </option>
              ))}
            </select>
            <IconChevronDown />
          </div>
        </Row>
        <Row
          title="Status"
          desc={inUse ? 'This provider is making your decks.' : 'Pick a model below to start using this provider.'}
        >
          <span className={`status-pill ${providerReady(settings, tab) ? 'ok' : ''}`}>
            <span className="status-dot" />
            {inUse ? 'In use' : providerReady(settings, tab) ? 'Ready' : 'Not set up'}
          </span>
        </Row>

        {isLocal && (
          <>
            <Row
              title="fastgguf program"
              desc={
                <>
                  <PathText path={settings.localExe} /> Use fastgguf_big.exe or fastgguf.exe. The app starts it in the
                  background when you ask for slides, and stops it when you quit.
                </>
              }
            >
              <button className="btn" onClick={() => void onPickLocal('exe')}>
                {settings.localExe ? 'Change…' : 'Choose…'}
              </button>
            </Row>
            <Row
              title="Models folder"
              desc={
                <>
                  <PathText path={settings.localModelsDir} /> The folder with your .gguf files.
                </>
              }
            >
              <button className="btn" onClick={() => void onPickLocal('modelsDir')}>
                {settings.localModelsDir ? 'Change…' : 'Choose…'}
              </button>
            </Row>
            <Row
              title="Context size"
              desc="Room for your request and the reply, in tokens. Bigger decks need more, and more takes more memory."
            >
              <div className="select-wrap">
                <select
                  value={settings.localCtx}
                  onChange={(e) => void onSave({ localCtx: Number(e.target.value) })}
                  aria-label="Context size"
                >
                  {LOCAL_CTX_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n / 1024}K tokens
                    </option>
                  ))}
                </select>
                <IconChevronDown />
              </div>
            </Row>
            <Row title="Run on" desc="Auto uses a dedicated graphics card when there is one, otherwise the processor.">
              <div className="segmented" role="radiogroup" aria-label="Run on">
                {DEVICES.map((d) => (
                  <button
                    key={d.value}
                    role="radio"
                    aria-checked={settings.localDevice === d.value}
                    className={settings.localDevice === d.value ? 'on' : ''}
                    onClick={() => void onSave({ localDevice: d.value })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Row>
          </>
        )}

        {tab === 'custom' && (
          <Row
            title="Server address"
            desc={
              urlValid ? (
                'Any OpenAI-compatible server, such as OpenRouter or a local Ollama.'
              ) : (
                <span className="error-text">The address must start with http:// or https://.</span>
              )
            }
          >
            <div className="control-row">
              <input
                className="set-input"
                placeholder="https://openrouter.ai/api/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <button
                className="btn"
                disabled={!urlValid || baseUrl.trim() === settings.customBaseUrl}
                onClick={() => void onSave({ customBaseUrl: baseUrl.trim() })}
              >
                Save
              </button>
            </div>
          </Row>
        )}

        {!isLocal && (
        <Row
          title="API key"
          desc={
            <>
              {keyStatus} Keys are encrypted with your system keychain and only sent to {provider.name}.
              {provider.keyUrl && <> Get a key at {provider.keyUrl.replace(/^https:\/\//, '')}.</>}
            </>
          }
        >
          <div className="control-row">
            <input
              className="set-input"
              type="password"
              placeholder={hasKey ? '••••••••••••••••' : provider.keyPlaceholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && key.trim() && !saving && void saveKey()}
            />
            <button className="btn accent" disabled={!key.trim() || saving} onClick={() => void saveKey()}>
              Save
            </button>
            {hasKey && (
              <button className="btn" onClick={() => void onSaveKey(tab, null)}>
                Remove
              </button>
            )}
          </div>
        </Row>
        )}
      </section>

      <section className="set-section">
        <h3>Model</h3>
        <Row
          title="Model"
          desc={
            inUse
              ? `In use: ${isLocal ? localModelLabel(settings.model) : settings.model}`
              : `Choosing a model switches to ${provider.name}.`
          }
        >
          <div className="select-wrap">
            <select value={current} onChange={(e) => e.target.value && void useModel(e.target.value)} aria-label="Model">
              {current === '' && <option value="">Choose a model…</option>}
              {currentMissing && <option value={current}>{isLocal ? localModelLabel(current) : current}</option>}
              {presets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              {fetched.length > 0 && (
                <optgroup label={isLocal ? 'In your models folder' : `From ${provider.name}`}>
                  {fetched.map((m) => (
                    <option key={m} value={m}>
                      {isLocal ? localModelLabel(m) : m}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <IconChevronDown />
          </div>
        </Row>
        {!isLocal && (
        <Row
          title="Other model"
          desc={tab === 'custom' ? 'Type a model name, e.g. llama3.3 or deepseek/deepseek-chat.' : 'Type any model name the provider offers.'}
        >
          <div className="control-row">
            <input
              className="set-input"
              placeholder="Model name"
              value={otherModel}
              onChange={(e) => setOtherModel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitOther()}
            />
            <button className="btn" disabled={!otherModel.trim()} onClick={submitOther}>
              Use
            </button>
          </div>
        </Row>
        )}
        <Row
          title={isLocal ? 'Model files' : 'Load models'}
          desc={
            loadError ? (
              <span className="error-text">{loadError}</span>
            ) : isLocal ? (
              localReady ? (
                `Found ${loaded?.provider === 'local' ? loaded.models.length : 0} model files. Pick one in the Model list above.`
              ) : (
                'Choose the fastgguf program and the models folder first.'
              )
            ) : fetched.length ? (
              `Loaded ${loaded!.models.length} models. They are in the Model list above.`
            ) : (
              `Ask ${provider.name} for every model your key can use.`
            )
          }
        >
          <button className="btn" disabled={!providerReady(settings, tab) || loading} onClick={() => void loadModels()}>
            {loading ? 'Loading…' : isLocal ? 'Refresh' : 'Load models'}
          </button>
        </Row>
      </section>
    </>
  )
}
