import { useMemo, useRef, useState } from 'react'
import type { DeckSummary } from '@shared/types'
import { relativeTime } from '../util'
import {
  IconFolder,
  IconFolderPlus,
  IconHistory,
  IconLogo,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSidebar,
  IconTemplate
} from './icons'

export type View = { kind: 'home' } | { kind: 'deck'; id: string } | { kind: 'history' } | { kind: 'templates' }

interface Props {
  view: View
  decks: DeckSummary[]
  projects: string[]
  generatingDeckId: string | null
  onNavigate: (view: View) => void
  onNewProject: (name: string) => void
  onToggle: () => void
  onOpenSettings: () => void
}

export function Sidebar({ view, decks, projects, generatingDeckId, onNavigate, onNewProject, onToggle, onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [sortByName, setSortByName] = useState(false)
  const [addingProject, setAddingProject] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const names = Array.from(new Set([...projects, ...decks.map((d) => d.project)]))
    return names.map((name) => {
      let items = decks.filter((d) => d.project === name && (!q || d.title.toLowerCase().includes(q)))
      if (sortByName) items = [...items].sort((a, b) => a.title.localeCompare(b.title))
      return { name, items }
    })
  }, [decks, projects, query, sortByName])

  const activeDeck = view.kind === 'deck' ? view.id : null

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <span className="logo" title="Lawnak Vision">
          <IconLogo size={20} />
        </span>
        <button className="icon-btn" onClick={onToggle} title="Toggle sidebar (Ctrl+\)">
          <IconSidebar />
        </button>
        <button
          className="icon-btn"
          title="Search presentations"
          onClick={() => {
            setSearching((s) => !s)
            setTimeout(() => searchRef.current?.focus(), 0)
          }}
        >
          <IconSearch />
        </button>
      </div>

      {searching && (
        <input
          ref={searchRef}
          className="sidebar-search"
          placeholder="Search presentations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              setSearching(false)
            }
          }}
        />
      )}

      <button className={`nav-item primary ${view.kind === 'home' ? 'active' : ''}`} onClick={() => onNavigate({ kind: 'home' })}>
        <IconPlus /> New Presentation
      </button>
      <button className={`nav-item ${view.kind === 'history' ? 'active' : ''}`} onClick={() => onNavigate({ kind: 'history' })}>
        <IconHistory /> Presentation History
      </button>
      <button className={`nav-item ${view.kind === 'templates' ? 'active' : ''}`} onClick={() => onNavigate({ kind: 'templates' })}>
        <IconTemplate /> Templates
      </button>

      <div className="section-header">
        <span>Projects</span>
        <div className="section-actions">
          <button className={`icon-btn small ${sortByName ? 'on' : ''}`} title={sortByName ? 'Sorted by name' : 'Sorted by date'} onClick={() => setSortByName((s) => !s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
          <button className="icon-btn small" title="New project" onClick={() => setAddingProject(true)}>
            <IconFolderPlus size={15} />
          </button>
        </div>
      </div>

      <div className="projects">
        {addingProject && (
          <input
            autoFocus
            className="sidebar-search"
            placeholder="Project name, then Enter"
            onBlur={() => setAddingProject(false)}
            onKeyDown={(e) => {
              const value = (e.target as HTMLInputElement).value.trim()
              if (e.key === 'Enter' && value) {
                onNewProject(value)
                setAddingProject(false)
              } else if (e.key === 'Escape') setAddingProject(false)
            }}
          />
        )}
        {groups.map((g) => (
          <div key={g.name} className="project">
            <div className="project-name">
              <IconFolder size={15} /> {g.name}
            </div>
            {g.items.length === 0 ? (
              <div className="deck-item empty">No presentations yet</div>
            ) : (
              g.items.map((d) => (
                <button
                  key={d.id}
                  className={`deck-item ${activeDeck === d.id ? 'active' : ''}`}
                  onClick={() => onNavigate({ kind: 'deck', id: d.id })}
                  title={`${d.title} · ${d.slideCount} slides`}
                >
                  <span className="deck-title">{d.title}</span>
                  {generatingDeckId === d.id ? <span className="pulse" /> : <span className="deck-time">{relativeTime(d.updatedAt)}</span>}
                </button>
              ))
            )}
          </div>
        ))}
      </div>

      <button className="nav-item settings" onClick={onOpenSettings}>
        <IconSettings /> Settings
      </button>
    </aside>
  )
}
