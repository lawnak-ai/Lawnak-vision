import { useState } from 'react'
import { MODELS, type Effort, type Settings } from '@shared/types'
import { THEMES } from '@shared/themes'
import { IconX } from './icons'

interface Props {
  settings: Settings
  onClose: () => void
  onSave: (patch: Partial<Settings>) => Promise<void>
  onSaveKey: (key: string | null) => Promise<void>
}

const EFFORTS: { value: Effort; label: string; hint: string }[] = [
  { value: 'low', label: 'Fast', hint: 'Quickest, good for small edits' },
  { value: 'medium', label: 'Balanced', hint: 'Recommended' },
  { value: 'high', label: 'Thorough', hint: 'Slower, more polished design' }
]

export function SettingsDialog({ settings, onClose, onSave, onSaveKey }: Props) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  const keyStatus = settings.hasApiKey
    ? 'A key is saved on this computer.'
    : settings.envApiKey
      ? 'Using ANTHROPIC_API_KEY from the environment.'
      : 'No key yet.'

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Settings">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <IconX />
          </button>
        </div>

        <section className="settings-section">
          <h3>Anthropic API key</h3>
          <p className="muted small">
            Needed for AI slide generation. Get one at console.anthropic.com. The key is encrypted with your system keychain
            and never leaves this computer except to call the Claude API.
          </p>
          <div className="row">
            <input
              type="password"
              placeholder={settings.hasApiKey ? '••••••••••••••••' : 'sk-ant-…'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              className="btn accent"
              disabled={!key.trim() || saving}
              onClick={async () => {
                setSaving(true)
                await onSaveKey(key)
                setKey('')
                setSaving(false)
              }}
            >
              Save key
            </button>
            {settings.hasApiKey && (
              <button className="btn" onClick={() => onSaveKey(null)}>
                Remove
              </button>
            )}
          </div>
          <p className="muted small">{keyStatus}</p>
        </section>

        <section className="settings-section">
          <h3>Model</h3>
          <div className="radio-list">
            {MODELS.map((m) => (
              <label key={m.id} className="radio">
                <input type="radio" name="model" checked={settings.model === m.id} onChange={() => onSave({ model: m.id })} />
                {m.label}
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Design effort</h3>
          <div className="radio-list">
            {EFFORTS.map((e) => (
              <label key={e.value} className="radio">
                <input type="radio" name="effort" checked={settings.effort === e.value} onChange={() => onSave({ effort: e.value })} />
                {e.label} <span className="muted small">· {e.hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Default theme</h3>
          <div className="theme-row">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-pill ${settings.defaultThemeId === t.id ? 'on' : ''}`}
                onClick={() => onSave({ defaultThemeId: t.id })}
                style={{ background: t.swatch[0], color: t.swatch[1] }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
