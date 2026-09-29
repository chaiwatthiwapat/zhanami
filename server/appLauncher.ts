import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const apps = {
  files: { command: '/usr/bin/nautilus', args: [] },
  zter: { command: resolve(homedir(), '.local/bin/zter'), args: [] },
  chrome: { command: '/usr/bin/google-chrome', args: [] },
  vscode: { command: '/usr/bin/code', args: [] },
  discord: { command: '/usr/bin/discord', args: [] },
  spotify: { command: '/usr/bin/spotify', args: [] },
  photos: { command: '/usr/bin/nautilus', args: [resolve(homedir(), 'Pictures')] },
} as const

export type LaunchableApp = keyof typeof apps

export function isLaunchableApp(value: unknown): value is LaunchableApp {
  return typeof value === 'string' && Object.hasOwn(apps, value)
}

export async function launchApp(app: LaunchableApp): Promise<void> {
  const { command, args } = apps[app]
  const child = spawn(command, args, {
    cwd: homedir(),
    detached: true,
    stdio: 'ignore',
  })

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', reject)
  })
  child.unref()
}
