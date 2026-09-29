import { readFile, statfs } from 'node:fs/promises'
import { cpus } from 'node:os'
import type { SystemMetrics } from '../src/types/system.ts'

type CpuSample = { idle: number; total: number }

let previousCpu: CpuSample | null = null

function cpuSample(): CpuSample {
  const cores = cpus()
  return cores.reduce((sample, core) => {
    const { user, nice, sys, idle, irq } = core.times
    sample.idle += idle
    sample.total += user + nice + sys + idle + irq
    return sample
  }, { idle: 0, total: 0 })
}

async function cpuUsagePercent(): Promise<number> {
  let current = cpuSample()
  if (!previousCpu) {
    previousCpu = current
    await new Promise((resolve) => setTimeout(resolve, 250))
    current = cpuSample()
  }

  const total = current.total - previousCpu.total
  const idle = current.idle - previousCpu.idle
  previousCpu = current
  return total > 0 ? Math.round(Math.max(0, Math.min(100, (1 - idle / total) * 100))) : 0
}

function meminfoValue(contents: string, key: string): number {
  const match = contents.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB$`, 'm'))
  if (!match) throw new Error(`Missing ${key} in /proc/meminfo`)
  return Number(match[1]) * 1024
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const [cpuPercent, memoryInfo, diskInfo] = await Promise.all([
    cpuUsagePercent(),
    readFile('/proc/meminfo', 'utf8'),
    statfs('/'),
  ])

  const memoryTotal = meminfoValue(memoryInfo, 'MemTotal')
  const memoryAvailable = meminfoValue(memoryInfo, 'MemAvailable')
  const memoryUsed = Math.max(0, memoryTotal - memoryAvailable)
  const diskTotal = diskInfo.blocks * diskInfo.bsize
  const diskFree = diskInfo.bfree * diskInfo.bsize
  const diskAvailable = diskInfo.bavail * diskInfo.bsize
  const diskUsed = Math.max(0, diskTotal - diskFree)
  const diskUsable = diskUsed + diskAvailable

  return {
    cpu: {
      model: cpus()[0]?.model?.trim() || 'Unknown CPU',
      usagePercent: cpuPercent,
    },
    memory: {
      totalBytes: memoryTotal,
      usedBytes: memoryUsed,
      usagePercent: memoryTotal > 0 ? Math.round(memoryUsed / memoryTotal * 100) : 0,
    },
    disk: {
      path: '/',
      totalBytes: diskTotal,
      usedBytes: diskUsed,
      usagePercent: diskUsable > 0 ? Math.ceil(diskUsed / diskUsable * 100) : 0,
    },
  }
}
