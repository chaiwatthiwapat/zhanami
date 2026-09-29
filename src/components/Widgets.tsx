import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { ToolbarIcon } from './Shell'
import type { SystemMetrics } from '../types/system'
import type { MediaAction, MediaSnapshot } from '../types/media'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function ClockWeather({ now }: { now: Date }) {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const date = `${weekdays[now.getDay()]}, ${months[now.getMonth()].slice(0, 3)} ${now.getDate()}, ${now.getFullYear()}`

  return (
    <section id="clock" className="g" aria-label="Clock and preview weather">
      <div className="t">{time}</div><div className="d">{date}</div><hr />
      <div className="wx">
        <svg className="cl" viewBox="0 0 56 56" aria-hidden="true">
          <path d="M34 6a13 13 0 108 22 11 11 0 01-8-22z" fill="#f4e9b8" />
          <path d="M14 46a9 9 0 010-18 12 12 0 0122-2 8 8 0 012 20z" fill="#eee7f2" opacity=".95" />
        </svg>
        <div className="n">24°<small>Partly cloudy</small></div>
        <div className="r1">↑ 29° &nbsp;↓ 22°</div><div className="r2">⌖ Bangkok</div>
      </div>
    </section>
  )
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function Music({ onNotify }: { onNotify: (message: string) => void }) {
  const [media, setMedia] = useState<(MediaSnapshot & { receivedAt: number }) | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    let active = true
    let pending = false

    async function refresh() {
      if (pending) return
      pending = true
      try {
        const response = await fetch('/api/media', { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const snapshot = await response.json() as MediaSnapshot | null
        if (active) setMedia(snapshot ? { ...snapshot, receivedAt: Date.now() } : null)
      } catch {
        if (active) setMedia(null)
      } finally {
        pending = false
      }
    }

    void refresh()
    const statusTimer = window.setInterval(() => { void refresh() }, 2000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 250)
    return () => { active = false; window.clearInterval(statusTimer); window.clearInterval(clockTimer) }
  }, [])

  async function command(action: MediaAction, seconds?: number) {
    if (!media) return
    try {
      const response = await fetch('/api/media/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: media.playerId, action, seconds }),
      })
      if (!response.ok) {
        if (response.status !== 409) onNotify('Media control unavailable')
        return
      }
      const latest = await fetch('/api/media', { cache: 'no-store' })
      if (latest.ok) {
        const snapshot = await latest.json() as MediaSnapshot | null
        setMedia(snapshot ? { ...snapshot, receivedAt: Date.now() } : null)
      }
    } catch {
      onNotify('Media control unavailable')
    }
  }

  const playing = media ? media.playbackStatus === 'Playing' : true
  const length = media?.lengthSeconds ?? 252
  const seconds = media
    ? Math.min(length, media.positionSeconds + (playing ? Math.max(0, now - media.receivedAt) / 1000 * media.rate : 0))
    : 87

  function seek(event: MouseEvent<HTMLButtonElement>) {
    if (!media?.canSeek || !media.lengthSeconds) return
    const rect = event.currentTarget.getBoundingClientRect()
    const target = Math.min(media.lengthSeconds, Math.max(0, ((event.clientX - rect.left) / rect.width) * media.lengthSeconds))
    void command('seek', target)
  }

  return (
    <section id="music" className="g" aria-label="Music player">
      <div className="cov" aria-hidden="true">{media?.artUrl && <img key={media.artUrl} src={media.artUrl} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}</div>
      <h3 title={media?.title}>{media?.title || 'Sakura'}</h3><p title={media?.artist}>{media ? (media.artist || media.playerName) : 'Hoshimachi Suisei'}</p>
      <svg className="hr" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17S2 12 2 7a4 4 0 018-1 4 4 0 018 1c0 5-8 10-8 10z" /></svg>
      <button type="button" className="pb" aria-label="Seek track" aria-disabled={!media?.canSeek} onClick={seek}><i style={{ width: `${Math.min(100, seconds / length * 100)}%` }} /></button>
      <div className="tm"><span>{formatTime(seconds)}</span><span>{media && media.lengthSeconds == null ? '--:--' : formatTime(length)}</span></div>
      <div className="ctl">
        <button type="button" aria-label="Shuffle (visual only)"><svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 6h3l8 8h4M2 14h3l2-2M13 6h4M15 4l2 2-2 2M15 12l2 2-2 2" /></svg></button>
        <button type="button" aria-label="Previous track" aria-disabled={!media?.canGoPrevious} onClick={() => { if (media?.canGoPrevious) void command('previous') }}><svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4v12M16 4v12L7 10z" fill="white" /></svg></button>
        <button type="button" className="play" aria-label={playing ? 'Pause' : 'Play'} aria-disabled={!media?.canPlayPause} onClick={() => { if (media?.canPlayPause) void command('playPause') }}>
          {playing ? <svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg>
            : <svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13l11-6.5z" /></svg>}
        </button>
        <button type="button" aria-label="Next track" aria-disabled={!media?.canGoNext} onClick={() => { if (media?.canGoNext) void command('next') }}><svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><path d="M15 4v12M4 4v12l9-6z" fill="white" /></svg></button>
        <button type="button" aria-label="Repeat (visual only)"><svg className="tb" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 9V7a2 2 0 012-2h9l-2-2M16 11v2a2 2 0 01-2 2H5l2 2" /></svg></button>
      </div>
    </section>
  )
}

function RingCaption({ text }: { text: string }) {
  const frame = useRef<HTMLElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  const [travel, setTravel] = useState(0)

  useEffect(() => {
    const outer = frame.current
    const inner = content.current
    if (!outer || !inner) return

    function measure() {
      if (!outer || !inner) return
      setTravel(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth + 2)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [text])

  return <em ref={frame} className="ring-caption" title={text}>
    <span ref={content} className={travel > 2 ? 'panning' : ''}
      style={{ '--caption-travel': `${travel}px` } as CSSProperties}>{text}</span>
  </em>
}

function wholeGb(bytes: number) {
  return `${Math.round(bytes / 1_000_000_000)} GB`
}

export function SystemStats() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let pending = false
    async function refresh() {
      if (pending) return
      pending = true
      try {
        const response = await fetch('/api/system', { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const next = await response.json() as SystemMetrics
        if (active) { setMetrics(next); setFailed(false) }
      } catch {
        if (active) { setMetrics(null); setFailed(true) }
      } finally {
        pending = false
      }
    }

    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 2500)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const placeholder = failed ? 'Unavailable' : 'Loading...'
  const stats = [
    { label: 'CPU', value: metrics?.cpu.usagePercent, color: '#f4a3cb', caption: metrics?.cpu.model ?? placeholder },
    { label: 'RAM', value: metrics?.memory.usagePercent, color: '#b98cff', caption: metrics ? wholeGb(metrics.memory.totalBytes) : placeholder },
    { label: 'Disk', value: metrics?.disk.usagePercent, color: '#62b4ff', caption: metrics ? `${Math.round(metrics.disk.usedBytes / 1_000_000_000)}/${Math.round(metrics.disk.totalBytes / 1_000_000_000)} GB` : placeholder },
  ]

  return (
    <section id="sys" className="g" aria-label="Local system statistics">
      {stats.map((stat, index) => (
        <div className="ring" style={{ left: 10 + index * 104 }} key={stat.label}>
          <svg viewBox="0 0 84 84" aria-hidden="true"><circle className="bg" cx="42" cy="42" r="38" />
            <circle cx="42" cy="42" r="38" stroke={stat.color} strokeDasharray="238.8" strokeDashoffset={238.8 * (1 - (stat.value ?? 0) / 100)} /></svg>
          <div className="v">{stat.label}<b>{stat.value == null ? '--' : `${stat.value}%`}</b></div>
          <RingCaption text={stat.caption} />
        </div>
      ))}
    </section>
  )
}

type Task = { id: number; text: string; done: boolean }
const initialTasks: Task[] = [
  { id: 1, text: 'Finish RAG chunking', done: true },
  { id: 2, text: 'Update wfchat UI', done: true },
  { id: 3, text: 'Read Rust book', done: false },
  { id: 4, text: 'Game prototype (web)', done: false },
  { id: 5, text: 'Plan tomorrow', done: false },
]

export function Todo() {
  const [tasks, setTasks] = useState(initialTasks)

  function addTask() {
    const text = window.prompt('New task')?.trim()
    if (text) setTasks((current) => [...current, { id: Date.now(), text, done: false }])
  }

  return (
    <section id="todo" className="g" aria-label="Preview tasks">
      <h2>Today</h2><span className="cnt">{tasks.filter((task) => task.done).length}/{tasks.length}</span>
      <button className="add" type="button" aria-label="Add task" onClick={addTask}>+</button>
      <ul id="tl">{tasks.map((task) => (
        <li key={task.id} className={task.done ? 'done' : ''}>
          <button className="todo-row" type="button" aria-label={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.text}`}
            onClick={() => setTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, done: !entry.done } : entry))}>
            <div className="ck" aria-hidden="true">{task.done ? '✓' : ''}</div><span>{task.text}</span>
          </button>
        </li>
      ))}</ul>
    </section>
  )
}

export function Calendar({ now }: { now: Date }) {
  const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  function move(delta: number) {
    setView((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <section id="cal" className="g" aria-label="Calendar preview">
      <h2>{months[month]} {year}</h2>
      <div className="nv">
        <button type="button" aria-label="Previous month" onClick={() => move(-1)}><ToolbarIcon name="left" /></button>
        <button type="button" aria-label="Next month" onClick={() => move(1)}><ToolbarIcon name="right" /></button>
      </div>
      <div className="cg">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <div className="h" key={day}>{day}</div>)}
        {Array.from({ length: firstDay }, (_, index) => <div key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1
          const today = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
          return <div key={day} className={new Date(year, month, day).getDay() === 0 ? 'o' : ''}>
            <div className={`d${today ? ' t' : ''}`}>{day}</div>
          </div>
        })}
      </div>
    </section>
  )
}
