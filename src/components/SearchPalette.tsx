import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { launchableApps } from '../appCatalog'
import { AppIcon, ToolbarIcon } from './Shell'

type SearchMode = 'normal' | 'vim'
type SearchPhase = 'insert' | 'normal' | 'results'
type Snapshot = { query: string; cursor: number }
const MODE_STORAGE_KEY = 'zhanami.searchMode.v1'
const COMMAND_TIMEOUT_MS = 1800

function readMode(): SearchMode {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === 'vim' ? 'vim' : 'normal'
  } catch {
    return 'normal'
  }
}

function clampCursor(query: string, position: number): number {
  return Math.max(0, Math.min(position, Math.max(0, query.length - 1)))
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}\p{M}_]/u.test(character)
}

function wordRange(query: string, position: number): { start: number; end: number } | null {
  if (!query) return null
  let index = clampCursor(query, position)
  if (!isWordCharacter(query[index])) {
    let right = index
    while (right < query.length && !isWordCharacter(query[right])) right++
    if (right < query.length) index = right
    else {
      let left = index - 1
      while (left >= 0 && !isWordCharacter(query[left])) left--
      if (left < 0) return null
      index = left
    }
  }

  let start = index
  let end = index + 1
  while (start > 0 && isWordCharacter(query[start - 1])) start--
  while (end < query.length && isWordCharacter(query[end])) end++
  return { start, end }
}

function nextWordStart(query: string, position: number): number {
  let index = Math.min(position + 1, query.length)
  if (isWordCharacter(query[position])) {
    while (index < query.length && isWordCharacter(query[index])) index++
  }
  while (index < query.length && !isWordCharacter(query[index])) index++
  return clampCursor(query, index)
}

function previousWordStart(query: string, position: number): number {
  let index = position - 1
  while (index >= 0 && !isWordCharacter(query[index])) index--
  while (index > 0 && isWordCharacter(query[index - 1])) index--
  return Math.max(0, index)
}

export function SearchPalette({ onClose, onSelect }: { onClose: () => void; onSelect: (name: string) => void }) {
  const [mode, setMode] = useState<SearchMode>(readMode)
  const [phase, setPhase] = useState<SearchPhase>('insert')
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [active, setActive] = useState(0)
  const [pending, setPending] = useState('')
  const panelRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const pendingRef = useRef('')
  const pendingTimerRef = useRef<number | null>(null)
  const yankRef = useRef('')
  const undoRef = useRef<Snapshot[]>([])
  const insertSnapshotRef = useRef<Snapshot | null>({ query: '', cursor: 0 })
  const insertCaretRef = useRef<number | null>(null)
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null)
  const results = launchableApps.filter((app) => (app.name + ' ' + app.keywords).toLowerCase().includes(query.trim().toLowerCase()))
  const activeIndex = Math.min(active, results.length - 1)

  useLayoutEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => { if (returnFocus.current?.isConnected) returnFocus.current.focus() }
  }, [])

  useLayoutEffect(() => {
    if (phase === 'results') {
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('.search-palette-results button')
      buttons?.[activeIndex]?.focus()
      return
    }

    const input = inputRef.current
    input?.focus()
    if (mode === 'vim' && phase === 'normal') {
      const position = clampCursor(query, cursor)
      input?.setSelectionRange(position, Math.min(position + 1, query.length))
    } else if (insertCaretRef.current !== null) {
      const position = Math.min(insertCaretRef.current, query.length)
      input?.setSelectionRange(position, position)
      insertCaretRef.current = null
    }
  }, [mode, phase, query, cursor, activeIndex])

  useEffect(() => () => {
    if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current)
  }, [])

  function clearPending() {
    if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = null
    pendingRef.current = ''
    setPending('')
  }

  function waitForCommand(keys: string) {
    clearPending()
    pendingRef.current = keys
    setPending(keys)
    pendingTimerRef.current = window.setTimeout(clearPending, COMMAND_TIMEOUT_MS)
  }

  function pushUndo(snapshot: Snapshot) {
    undoRef.current.push(snapshot)
    if (undoRef.current.length > 50) undoRef.current.shift()
  }

  function finishInsert() {
    const snapshot = insertSnapshotRef.current
    if (mode === 'vim' && snapshot && snapshot.query !== query) pushUndo(snapshot)
    insertSnapshotRef.current = null
  }

  function startInsert(snapshot: Snapshot, position: number) {
    insertSnapshotRef.current = snapshot
    insertCaretRef.current = position
    setPhase('insert')
  }

  function changeMode(next: SearchMode) {
    clearPending()
    if (mode === 'vim' && phase === 'insert') finishInsert()
    setMode(next)
    insertSnapshotRef.current = next === 'vim' ? { query, cursor: inputRef.current?.selectionStart ?? cursor } : null
    setPhase('insert')
    try { window.localStorage.setItem(MODE_STORAGE_KEY, next) } catch { /* Mode still works for this session. */ }
  }

  function choose(index: number) {
    const app = results[index]
    if (!app) return
    onClose()
    onSelect(app.name)
  }

  function focusResults() {
    if (results.length === 0) return
    if (results.length === 1) { choose(0); return }
    if (mode === 'vim' && phase === 'insert') {
      finishInsert()
      setCursor(clampCursor(query, (inputRef.current?.selectionStart ?? query.length) - 1))
    }
    setActive(0)
    setPhase('results')
  }

  function enterNormal() {
    clearPending()
    if (phase === 'results') {
      setPhase(mode === 'vim' ? 'normal' : 'insert')
    } else if (mode === 'vim') {
      if (phase === 'insert') {
        finishInsert()
        setCursor(clampCursor(query, (inputRef.current?.selectionStart ?? query.length) - 1))
        setPhase('normal')
      } else {
        inputRef.current?.focus()
        const position = clampCursor(query, cursor)
        inputRef.current?.setSelectionRange(position, Math.min(position + 1, query.length))
      }
    } else onClose()
  }

  function handleVimNormalKey(event: KeyboardEvent<HTMLElement>) {
    const key = event.key
    const command = pendingRef.current + key
    if (['c', 'ci', 'y', 'yi', 'd'].includes(command)) {
      event.preventDefault()
      waitForCommand(command)
      return
    }

    if (command === 'ciw' || command === 'yiw' || command === 'dd') {
      event.preventDefault()
      clearPending()
      if (command === 'dd') {
        if (query) {
          pushUndo({ query, cursor })
          yankRef.current = query
          setQuery('')
          setCursor(0)
          setActive(0)
        }
        return
      }
      const range = wordRange(query, cursor)
      if (!range) return
      if (command === 'yiw') {
        yankRef.current = query.slice(range.start, range.end)
      } else {
        startInsert({ query, cursor }, range.start)
        setQuery(query.slice(0, range.start) + query.slice(range.end))
        setCursor(range.start)
        setActive(0)
      }
      return
    }

    if (pendingRef.current) {
      event.preventDefault()
      clearPending()
      return
    }

    let nextCursor: number | null = null
    if (key === 'h' || key === 'ArrowLeft') nextCursor = cursor - 1
    else if (key === 'l' || key === 'ArrowRight') nextCursor = cursor + 1
    else if (key === 'w') nextCursor = nextWordStart(query, cursor)
    else if (key === 'b') nextCursor = previousWordStart(query, cursor)
    else if (key === '0') nextCursor = 0
    else if (key === '$') nextCursor = query.length - 1
    if (nextCursor !== null) {
      event.preventDefault()
      setCursor(clampCursor(query, nextCursor))
      return
    }

    if (key === 'i' || key === 'a' || key === 'A') {
      event.preventDefault()
      const position = key === 'A' ? query.length : key === 'a' && query ? cursor + 1 : cursor
      startInsert({ query, cursor }, position)
      return
    }

    if (key === 'C') {
      event.preventDefault()
      startInsert({ query, cursor }, cursor)
      setQuery(query.slice(0, cursor))
      setActive(0)
      return
    }

    if (key === 'x') {
      event.preventDefault()
      if (query) {
        pushUndo({ query, cursor })
        const next = query.slice(0, cursor) + query.slice(cursor + 1)
        setQuery(next)
        setCursor(clampCursor(next, cursor))
        setActive(0)
      }
      return
    }

    if (key === 'p' || key === 'P') {
      event.preventDefault()
      const yanked = yankRef.current
      if (yanked) {
        pushUndo({ query, cursor })
        const position = key === 'p' && query ? cursor + 1 : cursor
        const next = query.slice(0, position) + yanked + query.slice(position)
        setQuery(next)
        setCursor(clampCursor(next, position + yanked.length - 1))
        setActive(0)
      }
      return
    }

    if (key === 'u') {
      event.preventDefault()
      const snapshot = undoRef.current.pop()
      if (snapshot) {
        setQuery(snapshot.query)
        setCursor(clampCursor(snapshot.query, snapshot.cursor))
        setActive(0)
      }
      return
    }

    if (key.length === 1 || key === 'Backspace' || key === 'Delete') event.preventDefault()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (event.key === 'Escape') {
      event.preventDefault()
      enterNormal()
      return
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button, input') ?? [])
      const first = focusable[0]
      const last = focusable.at(-1)
      if (document.activeElement === panelRef.current) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
      return
    }

    if (event.target instanceof HTMLButtonElement && !event.target.closest('.search-palette-results')) return

    if (phase === 'results') {
      const direction = event.key === 'ArrowDown' || (mode === 'vim' && event.key === 'j') ? 1
        : event.key === 'ArrowUp' || (mode === 'vim' && event.key === 'k') ? -1 : 0
      if (direction) {
        event.preventDefault()
        if (results.length) setActive((current) => Math.max(0, Math.min(current + direction, results.length - 1)))
      } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault()
        choose(activeIndex)
      }
      return
    }

    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      focusResults()
      return
    }

    if (mode === 'vim' && phase === 'normal') {
      handleVimNormalKey(event)
      return
    }

    if (mode === 'normal' && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault()
      setActive(event.key === 'ArrowDown' ? 0 : results.length - 1)
      setPhase('results')
    }
  }

  const status = phase === 'results' ? 'RESULTS' : mode === 'vim' ? phase.toUpperCase() : 'SEARCH'

  return (
    <div className="search-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={panelRef} className="search-palette" role="dialog" aria-modal="true" aria-labelledby="search-title"
        tabIndex={-1} onKeyDown={handleKeyDown}>
        <header className="search-palette-header">
          <div><h2 id="search-title">Apps</h2><span>Open an application</span></div>
          <div className="search-palette-actions">
            <div className="search-modes" role="group" aria-label="Search mode">
              <button type="button" className={mode === 'normal' ? 'selected' : ''} aria-pressed={mode === 'normal'}
                onClick={() => changeMode('normal')}>Standard</button>
              <button type="button" className={mode === 'vim' ? 'selected' : ''} aria-pressed={mode === 'vim'}
                onClick={() => changeMode('vim')}>Vim</button>
            </div>
            <button type="button" className="search-palette-close" aria-label="Close search" title="Close search"
              onClick={onClose}>×</button>
          </div>
        </header>
        <div className="search-palette-input">
          <ToolbarIcon name="search" />
          <input ref={inputRef} value={query} aria-label="Search apps" placeholder="Search apps..." autoComplete="off"
            onFocus={() => {
              if (phase === 'results') {
                insertSnapshotRef.current = mode === 'vim' ? { query, cursor } : null
                setPhase('insert')
              }
            }}
            onBeforeInput={(event) => { if (mode === 'vim' && phase === 'normal') event.preventDefault() }}
            onPaste={(event) => { if (mode === 'vim' && phase === 'normal') event.preventDefault() }}
            onClick={(event) => {
              if (mode === 'vim' && phase === 'normal') {
                const position = clampCursor(query, event.currentTarget.selectionStart ?? cursor)
                setCursor(position)
                event.currentTarget.setSelectionRange(position, Math.min(position + 1, query.length))
              }
            }}
            onChange={(event) => {
              if (mode === 'vim' && phase === 'normal') return
              setQuery(event.target.value)
              setActive(0)
            }} />
          <kbd title="Super+I also works in the preview">Super + O</kbd>
        </div>
        <div className="search-palette-results" aria-label="Matching applications">
          {results.length ? results.map((app, index) => (
            <button key={app.id} type="button" className={index === activeIndex ? 'active' : ''}
              aria-label={'Open ' + app.name} onFocus={() => {
                setActive(index)
                if (phase !== 'results') {
                  if (mode === 'vim' && phase === 'insert') finishInsert()
                  setPhase('results')
                }
              }} onMouseMove={(event) => {
                const { clientX: x, clientY: y } = event
                const previous = lastPointerPositionRef.current
                if (previous?.x === x && previous.y === y) return
                lastPointerPositionRef.current = { x, y }
                setActive(index)
              }} onClick={() => choose(index)}>
              <AppIcon name={app.icon} /><span>{app.name}</span><small>{app.id === 'photos' ? 'Open Pictures' : 'Launch app'}</small>
            </button>
          )) : <p className="search-palette-empty">No matching apps</p>}
        </div>
        <footer>
          <strong className="search-vim-state" aria-live="polite">--{status}--</strong>
          {pending && <span className="search-pending" aria-live="polite">{pending}</span>}
        </footer>
      </section>
    </div>
  )
}
