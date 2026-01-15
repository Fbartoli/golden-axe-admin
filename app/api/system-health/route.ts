import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import os from 'os'

export const dynamic = 'force-dynamic'

interface SystemHealth {
  cpu: {
    usage: number
    cores: number
    model: string
    loadAvg: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  disk: {
    total: number
    used: number
    free: number
    usagePercent: number
    mount: string
  }
  uptime: number
  platform: string
  hostname: string
}

function getCpuUsage(): number {
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times]
    }
    totalIdle += cpu.times.idle
  }

  return Math.round((1 - totalIdle / totalTick) * 100)
}

function getDiskUsage(): { total: number; used: number; free: number; usagePercent: number; mount: string } {
  try {
    // Try to get disk usage using df command
    const output = execSync('df -B1 / 2>/dev/null | tail -1').toString().trim()
    const parts = output.split(/\s+/)
    if (parts.length >= 4) {
      const total = parseInt(parts[1]) || 0
      const used = parseInt(parts[2]) || 0
      const free = parseInt(parts[3]) || 0
      const mount = parts[5] || '/'
      return {
        total,
        used,
        free,
        usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
        mount,
      }
    }
  } catch (e) {
    // Fallback if df command fails
  }
  return { total: 0, used: 0, free: 0, usagePercent: 0, mount: '/' }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function GET() {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const disk = getDiskUsage()

  const health: SystemHealth = {
    cpu: {
      usage: getCpuUsage(),
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      loadAvg: os.loadavg(),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    disk: disk,
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
  }

  // Add formatted versions for display
  const formatted = {
    ...health,
    memory: {
      ...health.memory,
      totalFormatted: formatBytes(health.memory.total),
      usedFormatted: formatBytes(health.memory.used),
      freeFormatted: formatBytes(health.memory.free),
    },
    disk: {
      ...health.disk,
      totalFormatted: formatBytes(health.disk.total),
      usedFormatted: formatBytes(health.disk.used),
      freeFormatted: formatBytes(health.disk.free),
    },
    uptimeFormatted: formatUptime(health.uptime),
  }

  return NextResponse.json(formatted)
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(' ') || '< 1m'
}
