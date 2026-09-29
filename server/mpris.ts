import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import type { MediaAction, MediaControlResult, MediaSnapshot } from '../src/types/media.ts'

const execFileAsync = promisify(execFile)
const helper = resolve(process.cwd(), 'server/mpris.py')
const python = process.env.ZHANAMI_PYTHON || '/usr/bin/python3'

async function runHelper(args: string[]): Promise<unknown> {
  const { stdout } = await execFileAsync(python, [helper, ...args], {
    timeout: 5000,
    maxBuffer: 64 * 1024,
    encoding: 'utf8',
  })
  return JSON.parse(stdout)
}

export async function getMedia(): Promise<MediaSnapshot | null> {
  return await runHelper(['status']) as MediaSnapshot | null
}

export async function controlMedia(playerId: string, action: MediaAction, seconds?: number): Promise<MediaControlResult> {
  const args = ['control', playerId, action]
  if (action === 'seek' && seconds != null) args.push(String(seconds))
  return await runHelper(args) as MediaControlResult
}
