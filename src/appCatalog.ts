export const launchableApps = [
  { id: 'files', name: 'Files', icon: 'Files', keywords: 'folder nautilus' },
  { id: 'chrome', name: 'Chrome', icon: 'Browser', keywords: 'browser web' },
  { id: 'zter', name: 'zter', icon: 'Terminal', keywords: 'terminal shell' },
  { id: 'vscode', name: 'VS Code', icon: 'Code', keywords: 'code editor' },
  { id: 'discord', name: 'Discord', icon: 'Discord', keywords: 'chat' },
  { id: 'spotify', name: 'Spotify', icon: 'Spotify', keywords: 'music' },
  { id: 'photos', name: 'Photos', icon: 'Photos', keywords: 'pictures gallery' },
] as const

export function findLaunchableApp(name: string) {
  return launchableApps.find((app) => app.name === name)
}
