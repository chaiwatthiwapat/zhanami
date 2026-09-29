import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { findLaunchableApp } from './appCatalog'
import { AppGrid, BottomCorners, Dock, TopBar } from './components/Shell'
import { SearchPalette } from './components/SearchPalette'
import { Calendar, ClockWeather, Music, SystemStats, Todo } from './components/Widgets'
import './layout.css'
import './themes.css'
import './search.css'

const STAGE_WIDTH = 1600
const STAGE_HEIGHT = 900
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
  const [theme, setTheme] = useState<'sakura' | 'moonlight'>('sakura')
  const [message, setMessage] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSession, setSearchSession] = useState(0)

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
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key === 'o' || key === 'i') {
        event.preventDefault()
        if (!event.repeat) {
          setSearchSession((current) => current + 1)
          setSearchOpen(true)
        }
      } else if (key === 'q' && searchOpen) {
        event.preventDefault()
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  function openSearch() {
    setSearchSession((current) => current + 1)
    setSearchOpen(true)
  }

  function notify(text: string) {
    setMessage(text)
  }

  async function selectApp(name: string) {
    const app = findLaunchableApp(name)
    if (name === 'Settings') {
      const next = theme === 'sakura' ? 'moonlight' : 'sakura'
      setTheme(next)
      notify(`${next === 'sakura' ? 'Sakura' : 'Moonlight'} theme`)
    } else if (app) {
      try {
        const response = await fetch('/api/apps/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: app.id }),
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
        <TopBar now={now} onSearch={openSearch} onNotify={notify} />
        <Dock onSelect={selectApp} onSearch={openSearch} />
        <ClockWeather now={now} />
        <Music onNotify={notify} />
        <AppGrid onSelect={selectApp} />
        <SystemStats />
        <Todo />
        <Calendar now={now} />
        <BottomCorners />
      </main>
      {searchOpen && <SearchPalette key={searchSession} onClose={() => setSearchOpen(false)} onSelect={(name) => { void selectApp(name) }} />}
      <div id="toast" className={message ? 'on' : ''} role="status" aria-live="polite">{message}</div>
    </>
  )
}
