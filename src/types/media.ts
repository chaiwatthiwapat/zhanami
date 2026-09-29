export type MediaAction = 'playPause' | 'previous' | 'next' | 'seek'

export type MediaSnapshot = {
  playerId: string
  playerName: string
  title: string
  artist: string
  artUrl: string | null
  playbackStatus: 'Playing' | 'Paused' | 'Stopped'
  positionSeconds: number
  lengthSeconds: number | null
  rate: number
  canPlayPause: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  canSeek: boolean
}

export type MediaControlResult = { ok: true } | { ok: false; reason: string }
