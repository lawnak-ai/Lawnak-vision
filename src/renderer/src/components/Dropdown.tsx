import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconChevronDown } from './icons'

export interface DropdownOption<T extends string> {
  value: T
  label: string
  hint?: string
  icon?: ReactNode
}

interface Props<T extends string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  icon?: ReactNode
  /** Open the menu upwards (for controls near the bottom of the screen). */
  up?: boolean
  align?: 'left' | 'right'
  className?: string
  title?: string
}

export function Dropdown<T extends string>({ value, options, onChange, icon, up, align = 'left', className, title }: Props<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`dropdown ${className ?? ''}`}>
      <button type="button" className="chip" onClick={() => setOpen((o) => !o)} title={title} aria-haspopup="listbox">
        {icon ?? current?.icon}
        <span>{current?.label ?? value}</span>
        <IconChevronDown size={13} />
      </button>
      {open && (
        <div className={`menu ${up ? 'menu-up' : ''} ${align === 'right' ? 'menu-right' : ''}`} role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`menu-item ${o.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.icon}
              <span className="menu-label">{o.label}</span>
              {o.hint && <span className="menu-hint">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
