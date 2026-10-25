import { useState } from 'react'
import { MODELS, type ModelId, type Settings } from '@shared/types'
import { THEMES } from '@shared/themes'
import { Dropdown } from './Dropdown'
import { PromptBox } from './PromptBox'
import { IconFolder, IconLayers, IconPalette, IconSparkle, IconTemplate } from './icons'

export interface NewDeckRequest {
  prompt: string
  project: string
  themeId: string
  slideCount?: number
}

interface Props {
  settings: Settings
  projects: string[]
  onCreate: (req: NewDeckRequest) => void
  onModelChange: (model: ModelId) => void
  onBrowseTemplates: () => void
  onOpenSettings: () => void
}

const SUGGESTIONS = [
  'A pitch deck for a neighborhood coffee shop',
  'Teach photosynthesis to 10 year olds, with a quiz',
  'Quarterly business review with charts',
  'عرض تقديمي عن الذكاء الاصطناعي في التعليم'
]

const COUNTS = ['auto', '5', '8', '10', '12', '15'] as const

export function Swatch({ colors }: { colors: [string, string] }) {
  return (
    <span className="swatch" style={{ background: colors[0] }}>
      <i style={{ background: colors[1] }} />
    </span>
  )
}

export function Home({ settings, projects, onCreate, onModelChange, onBrowseTemplates, onOpenSettings }: Props) {
  const [prompt, setPrompt] = useState('')
  const [project, setProject] = useState(projects[0] ?? 'My Presentations')
  const [themeId, setThemeId] = useState(settings.defaultThemeId)
  const [count, setCount] = useState<(typeof COUNTS)[number]>('auto')
  const hasKey = settings.hasApiKey || settings.envApiKey

  const submit = (): void => {
    if (!prompt.trim()) return
    if (!hasKey) {
      onOpenSettings()
      return
    }
    onCreate({ prompt: prompt.trim(), project, themeId, slideCount: count === 'auto' ? undefined : Number(count) })
    setPrompt('')
  }

  return (
    <div className="home">
      <div className="home-inner">
        <h1 className="home-title">What do you want to present?</h1>
        <Dropdown
          className="project-picker"
          value={project}
          icon={<IconFolder size={15} />}
          options={projects.map((p) => ({ value: p, label: p }))}
          onChange={setProject}
          title="Project"
        />
        <PromptBox
          autoFocus
          value={prompt}
          onChange={setPrompt}
          onSubmit={submit}
          placeholder="Describe your presentation… topic, audience, tone, anything to include"
          left={
            <>
              <button className="icon-btn" title="Start from a template" onClick={onBrowseTemplates}>
                <IconTemplate />
              </button>
              <Dropdown
                value={settings.model}
                options={MODELS.map((m) => ({ value: m.id, label: m.label }))}
                onChange={onModelChange}
                title="Model"
              />
            </>
          }
          right={
            <Dropdown
              align="right"
              value={count}
              icon={<IconLayers size={14} />}
              options={COUNTS.map((c) => ({ value: c, label: c === 'auto' ? 'Auto length' : `${c} slides` }))}
              onChange={setCount}
              title="Number of slides"
            />
          }
          footer={
            <Dropdown
              up={false}
              value={themeId}
              icon={<IconPalette size={14} />}
              options={THEMES.map((t) => ({ value: t.id, label: t.name, icon: <Swatch colors={t.swatch} /> }))}
              onChange={setThemeId}
              title="Theme"
            />
          }
        />
        {!hasKey && (
          <p className="home-note">
            Add your Anthropic API key in{' '}
            <button className="link" onClick={onOpenSettings}>
              Settings
            </button>{' '}
            to generate slides with AI, or{' '}
            <button className="link" onClick={onBrowseTemplates}>
              start from a template
            </button>
            .
          </p>
        )}
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="suggestion" dir="auto" onClick={() => setPrompt(s)}>
              <IconSparkle size={13} /> {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
