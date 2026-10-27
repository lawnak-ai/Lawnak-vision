import { useMemo, useRef, useState } from 'react'
import type { DeckSummary } from '@shared/types'
import { relativeTime, useStoredFlag } from '../util'
import {
  IconChevronDown,
  IconChevronRight,
  IconComponents,
  IconFolder,
  IconFolderPlus,
  IconHistory,
  IconLogo,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSidebar,
  IconTemplate,
  IconTrash,
  IconVideo
} from './icons'

export type View = { kind: 'home' } | { kind: 'deck'; id: string } | { kind: 'history' } | { kind: 'templates' } | { kind: 'components' }

interface Props {
  view: View
  decks: DeckSummary[]
  projects: string[]
  generatingDeckId: string | null
  onNavigate: (view: View) => void
  onNewProject: (name: string) => void
  onDeleteProject: (name: string) => void
  onDeleteDeck: (id: string) => void
  onToggle: () => void
  onOpenSettings: () => void
}

export function Sidebar({ view, decks, projects, generatingDeckId, onNavigate, onNewProject, onDeleteProject, onDeleteDeck, onToggle, onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [sortByName, setSortByName] = useState(false)
  const [addingProject, setAddingProject] = useState(false)
  const [projectsHidden, setProjectsHidden] = useStoredFlag('lv.projectsHidden', false)
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
      <button className={`nav-item ${view.kind === 'components' ? 'active' : ''}`} onClick={() => onNavigate({ kind: 'components' })}>
        <IconComponents /> Components
      </button>

      <div className="section-header">
        <button
          className="section-toggle"
          onClick={() => setProjectsHidden((h) => !h)}
          title={projectsHidden ? 'Show projects' : 'Hide projects'}
          aria-expanded={!projectsHidden}
        >
          {projectsHidden ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />} Projects
        </button>
        <div className="section-actions">
          <button className={`icon-btn small ${sortByName ? 'on' : ''}`} title={sortByName ? 'Sorted by name' : 'Sorted by date'} onClick={() => setSortByName((s) => !s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
          <button
            className="icon-btn small"
            title="New project"
            onClick={() => {
              setProjectsHidden(false)
              setAddingProject(true)
            }}
          >
            <IconFolderPlus size={15} />
          </button>
        </div>
      </div>

      <div className={`projects ${projectsHidden ? 'collapsed' : ''}`}>
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
        {!projectsHidden && groups.map((g) => (
          <div key={g.name} className="project">
            <div className="project-name">
              <IconFolder size={15} /> <span className="project-title">{g.name}</span>
              <button className="icon-btn small row-action" title="Delete project" onClick={() => onDeleteProject(g.name)}>
                <IconTrash size={14} />
              </button>
            </div>
            {g.items.length === 0 ? (
              <div className="deck-item empty">No presentations yet</div>
            ) : (
              g.items.map((d) => (
                <div key={d.id} className="deck-row">
                  <button
                    className={`deck-item ${activeDeck === d.id ? 'active' : ''}`}
                    onClick={() => onNavigate({ kind: 'deck', id: d.id })}
                    title={`${d.title} · ${d.slideCount} ${d.kind === 'video' ? 'scenes' : 'slides'}`}
                  >
                    {d.kind === 'video' && <IconVideo size={13} className="deck-kind" aria-label="Video" />}
                    <span className="deck-title">{d.title}</span>
                    {generatingDeckId === d.id ? <span className="pulse" /> : <span className="deck-time">{relativeTime(d.updatedAt)}</span>}
                  </button>
                  <button className="icon-btn small row-action" title="Delete presentation" onClick={() => onDeleteDeck(d.id)}>
                    <IconTrash size={14} />
                  </button>
                </div>
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
