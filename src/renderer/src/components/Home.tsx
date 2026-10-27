import { useState } from 'react'
import type { Settings, VideoFormat } from '@shared/types'
import { choiceKey, getProvider, modelOptions, providerReady } from '@shared/providers'
import { THEMES } from '@shared/themes'
import { DEFAULT_VIDEO_FORMAT, VIDEO_FORMATS } from '@shared/video'
import { useStoredFlag } from '../util'
import { Dropdown } from './Dropdown'
import { PromptBox } from './PromptBox'
import { IconFolder, IconLayers, IconPalette, IconSlides, IconSparkle, IconTemplate, IconVideo } from './icons'

export interface NewDeckRequest {
  prompt: string
  project: string
  themeId: string
  slideCount?: number
  /** Set for a video: its size. */
  video?: { format: VideoFormat }
}

interface Props {
  settings: Settings
  projects: string[]
  onCreate: (req: NewDeckRequest) => void
  /** Gets "provider:model". */
  onModelChange: (key: string) => void
  onBrowseTemplates: () => void
  onOpenSettings: () => void
}

const SUGGESTIONS = [
  'A pitch deck for a neighborhood coffee shop',
  'Teach photosynthesis to 10 year olds, with a quiz',
  'Quarterly business review with charts',
  'عرض تقديمي عن الذكاء الاصطناعي في التعليم'
]

const VIDEO_SUGGESTIONS = [
  'A 20-second ad for a specialty coffee brand',
  'Launch teaser for a fitness app, energetic and bold',
  'Grand opening promo for a bakery, warm and friendly',
  'إعلان قصير لمتجر عطور فاخر'
]

const COUNTS = ['auto', '5', '8', '10', '12', '15'] as const
const SCENE_COUNTS = ['auto', '4', '6', '8', '10', '12'] as const

/** The small picture of a video size in the size picker: a box with that shape. */
export function FormatShape({ format }: { format: VideoFormat }) {
  const f = VIDEO_FORMATS.find((v) => v.id === format) ?? VIDEO_FORMATS[0]
  const k = 14 / Math.max(f.width, f.height)
  return <span className="format-shape" style={{ width: Math.round(f.width * k), height: Math.round(f.height * k) }} />
}

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
  // If the chosen project is deleted, fall back to the first one left.
  if (projects.length && !projects.includes(project)) setProject(projects[0])
  const [themeId, setThemeId] = useState(settings.defaultThemeId)
  // When the default theme changes in Settings, the picker here follows it.
  const [seenDefault, setSeenDefault] = useState(settings.defaultThemeId)
  if (seenDefault !== settings.defaultThemeId) {
    setSeenDefault(settings.defaultThemeId)
    setThemeId(settings.defaultThemeId)
  }
  const [count, setCount] = useState<string>('auto')
  const [videoMode, setVideoMode] = useStoredFlag('lv.homeVideo', false)
  const [format, setFormat] = useState<VideoFormat>(DEFAULT_VIDEO_FORMAT)
  const hasKey = providerReady(settings, settings.provider)
  const counts: readonly string[] = videoMode ? SCENE_COUNTS : COUNTS
  // The two modes offer different counts; switching keeps "auto" or a count both have.
  if (!counts.includes(count)) setCount('auto')

  const submit = (): void => {
    if (!prompt.trim()) return
    if (!hasKey) {
      onOpenSettings()
      return
    }
    onCreate({
      prompt: prompt.trim(),
      project,
      themeId,
      slideCount: count === 'auto' ? undefined : Number(count),
      ...(videoMode ? { video: { format } } : {})
    })
    setPrompt('')
  }

  return (
    <div className="home">
      <div className="home-inner">
        <div className="mode-switch" role="tablist" aria-label="What to make">
          <button role="tab" aria-selected={!videoMode} className={videoMode ? '' : 'on'} onClick={() => setVideoMode(false)}>
            <IconSlides size={15} /> Presentation
          </button>
          <button role="tab" aria-selected={videoMode} className={videoMode ? 'on' : ''} onClick={() => setVideoMode(true)}>
            <IconVideo size={15} /> Video
          </button>
        </div>
        <h1 className="home-title">{videoMode ? 'What video do you want to make?' : 'What do you want to present?'}</h1>
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
          placeholder={
            videoMode
              ? 'Describe your promo video… product or brand, audience, mood, the message and call to action'
              : 'Describe your presentation… topic, audience, tone, anything to include'
          }
          left={
            <>
              {!videoMode && (
                <button className="icon-btn" title="Start from a template" onClick={onBrowseTemplates}>
                  <IconTemplate />
                </button>
              )}
              <Dropdown
                value={choiceKey(settings)}
                options={modelOptions(settings)}
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
              options={counts.map((c) => ({
                value: c,
                label: c === 'auto' ? 'Auto length' : `${c} ${videoMode ? 'scenes' : 'slides'}`
              }))}
              onChange={setCount}
              title={videoMode ? 'Number of scenes' : 'Number of slides'}
            />
          }
          footer={
            <div className="prompt-footer-row">
              <Dropdown
                up={false}
                value={themeId}
                icon={<IconPalette size={14} />}
                options={THEMES.map((t) => ({ value: t.id, label: t.name, icon: <Swatch colors={t.swatch} /> }))}
                onChange={setThemeId}
                title="Theme"
              />
              {videoMode && (
                <Dropdown
                  up={false}
                  value={format}
                  icon={<FormatShape format={format} />}
                  options={VIDEO_FORMATS.map((f) => ({ value: f.id, label: f.name, hint: f.hint, icon: <FormatShape format={f.id} /> }))}
                  onChange={(v) => setFormat(v as VideoFormat)}
                  title="Video size"
                />
              )}
            </div>
          }
        />
        {!hasKey && (
          <p className="home-note">
            Set up {getProvider(settings.provider).name} in{' '}
            <button className="link" onClick={onOpenSettings}>
              Settings
            </button>{' '}
            to generate {videoMode ? 'videos' : 'slides'} with AI
            {!videoMode && (
              <>
                , or{' '}
                <button className="link" onClick={onBrowseTemplates}>
                  start from a template
                </button>
              </>
            )}
            .
          </p>
        )}
        <div className="suggestions">
          {(videoMode ? VIDEO_SUGGESTIONS : SUGGESTIONS).map((s) => (
            <button key={s} className="suggestion" dir="auto" onClick={() => setPrompt(s)}>
              <IconSparkle size={13} /> {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
