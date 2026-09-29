import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppGrid, BottomCorners, Dock, SearchBar, TopBar } from './components/Shell'
import { Calendar, ClockWeather, Music, SystemStats, Todo } from './components/Widgets'
import './layout.css'
import './themes.css'

const STAGE_WIDTH = 1600
const STAGE_HEIGHT = 900
const launchableApps: Record<string, string> = {
  Files: 'files',
  zter: 'zter',
  Chrome: 'chrome',
  'VS Code': 'vscode',
  Discord: 'discord',
  Spotify: 'spotify',
  Photos: 'photos',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

function useStageScale() {
  const calculate = () => Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
  const [scale, setScale] = useState(calculate)

  useEffect(() => {
    function update() {
      setScale(calculate())
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export default function App() {
  const now = useClock()
  const scale = useStageScale()
  const searchRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<'sakura' | 'moonlight'>('sakura')
  const [message, setMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 1600)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function notify(text: string) {
    setMessage(text)
  }

  async function selectApp(name: string) {
    if (name === 'Settings') {
      const next = theme === 'sakura' ? 'moonlight' : 'sakura'
      setTheme(next)
      notify(`${next === 'sakura' ? 'Sakura' : 'Moonlight'} theme`)
    } else if (launchableApps[name]) {
      try {
        const response = await fetch('/api/apps/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: launchableApps[name] }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        notify(`Opening ${name}`)
      } catch {
        notify(`Could not open ${name}`)
      }
    } else {
      notify(`${name} preview`)
    }
  }

  const stageStyle: CSSProperties = {
    transform: `translate(-50%, -50%) scale(${scale})`,
  }

  return (
    <>
      <main id="st" style={stageStyle} aria-label="Zhanami desktop preview">
        <TopBar now={now} onSearch={() => searchRef.current?.focus()} onNotify={notify} />
        <Dock onSelect={selectApp} />
        <ClockWeather now={now} />
        <Music onNotify={notify} />
        <AppGrid onSelect={selectApp} />
        <SystemStats />
        <Todo />
        <Calendar now={now} />
        <SearchBar inputRef={searchRef} onNotify={notify} />
        <BottomCorners />
      </main>
      <div id="toast" className={message ? 'on' : ''} role="status" aria-live="polite">{message}</div>
    </>
  )
}
