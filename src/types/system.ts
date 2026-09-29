export type SystemMetrics = {
  cpu: { model: string; usagePercent: number }
  memory: { totalBytes: number; usedBytes: number; usagePercent: number }
  disk: { path: string; totalBytes: number; usedBytes: number; usagePercent: number }
}
