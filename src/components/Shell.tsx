import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'

type Notify = (message: string) => void
type IconName = 'volume' | 'bluetooth' | 'wifi' | 'search' | 'power' | 'left' | 'right' | 'zoom'

export function ToolbarIcon({ name, className = 'tb' }: { name: IconName; className?: string }) {
  const paths = {
    volume: <path d="M3 8v4h3l4 3V5L6 8zM13 7.5a3.5 3.5 0 010 5" />,
    bluetooth: <path d="M6 6l8 8-4 3V3l4 3-8 8" />,
    wifi: <path d="M2 8a11 11 0 0116 0M5 11a7 7 0 0110 0M8 14a3 3 0 014 0" />,
    search: <><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></>,
    power: <path d="M10 3v7M5.5 6a6 6 0 109 0" />,
    left: <path d="M12 4l-6 6 6 6" />,
    right: <path d="M8 4l6 6-6 6" />,
    zoom: <><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4M9 6.5v5M6.5 9h5" /></>,
  }

  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true">{paths[name]}</svg>
}

function AppIcon({ name }: { name: string }) {
  return <img className="ic app-icon" src={`/assets/icons/${name.toLowerCase()}.svg`} alt="" draggable={false} />
}

const dockApps = ['Files', 'Browser', 'Terminal', 'Code', 'Discord', 'Spotify', 'Photos', 'Apps']
const gridApps = ['Code', 'Browser', 'Terminal', 'Files', 'Docker', 'Git', 'Music', 'Settings']

export function TopBar({ now, onSearch, onNotify }: { now: Date; onSearch: () => void; onNotify: Notify }) {
  const [workspace, setWorkspace] = useState(1)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = `${weekdays[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <header id="bar" className="g dk">
      <div className="l">
        <span className="av" aria-hidden="true" /><span>znnn</span>
        <nav className="ws" aria-label="Preview workspaces">
          {[1, 2, 3, 4].map((number) => (
            <button key={number} type="button" className={workspace === number ? 'on' : ''}
              aria-label={`Workspace ${number}`} aria-current={workspace === number ? 'page' : undefined}
              onClick={() => { setWorkspace(number); onNotify(`Workspace ${number} preview`) }}>{number}</button>
          ))}
          <button type="button" aria-label="Add workspace" onClick={() => onNotify('Add workspace preview')}>
            <svg className="tb" viewBox="0 0 20 20" style={{ width: 14, height: 14 }} aria-hidden="true"><circle cx="10" cy="10" r="6" /></svg>
          </button>
        </nav>
      </div>
      <div className="c">{date} {time}</div>
      <div className="r">
        <ToolbarIcon name="volume" /><ToolbarIcon name="bluetooth" /><ToolbarIcon name="wifi" />
        <span className="bat"><i><b /></i>85%</span>
        <button type="button" aria-label="Focus search" onClick={onSearch}><ToolbarIcon name="search" /></button>
        <button type="button" aria-label="Power preview" onClick={() => onNotify('Power menu preview')}><ToolbarIcon name="power" /></button>
      </div>
    </header>
  )
}

export function Dock({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <nav id="dock" className="g dk" aria-label="Preview dock">
      {dockApps.map((name) => <button key={name} type="button" aria-label={name} onClick={() => onSelect(name)}><AppIcon name={name} /></button>)}
    </nav>
  )
}

export function AppGrid({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <section id="apps" className="g" aria-label="Applications">
      {gridApps.map((name, index) => (
        <button key={name} type="button" style={{ left: 14 + (index % 4) * 97, top: 22 + Math.floor(index / 4) * 98 }}
          onClick={() => onSelect(name)}><AppIcon name={name} />{name}</button>
      ))}
    </section>
  )
}

export function SearchBar({ inputRef, onNotify }: { inputRef: RefObject<HTMLInputElement | null>; onNotify: Notify }) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = inputRef.current?.value.trim()
    if (value) onNotify(`Search preview: ${value}`)
  }

  return (
    <form id="search" className="g dk" onSubmit={search} role="search">
      <ToolbarIcon name="search" className="tb search-icon" />
      <input ref={inputRef} aria-label="Search preview" placeholder="Search apps, files, web..." autoComplete="off" />
    </form>
  )
}

export function BottomCorners() {
  return (
    <>
      <div className="g cn" style={{ left: 11, width: 86 }} aria-hidden="true"><ToolbarIcon name="left" /><ToolbarIcon name="right" /></div>
      <div className="g cn" style={{ left: 1509, width: 71 }} aria-hidden="true"><ToolbarIcon name="zoom" /><ToolbarIcon name="right" /></div>
    </>
  )
}
