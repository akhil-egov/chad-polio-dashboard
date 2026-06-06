'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

function parseSync(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

export function AlertBar() {
  const { data } = useDashboard()
  const [dismissed, setDismissed] = useState(false)

  if (!data || dismissed) return null

  const nowMs = Date.now()
  const SIX_HOURS = 6 * 60 * 60 * 1000

  const latestByUser = new Map<string, number>()
  for (const r of data.userActivity) {
    const t = parseSync(r.last_sync_time).getTime()
    const key = `${r.health_facility}||${r.user_name}`
    if (!latestByUser.has(key) || t > latestByUser.get(key)!) {
      latestByUser.set(key, t)
    }
  }

  type Silent = { hf: string; user: string; hoursAgo: number }
  const silent: Silent[] = []
  for (const [key, t] of latestByUser) {
    const hoursAgo = (nowMs - t) / (1000 * 60 * 60)
    if (hoursAgo > 6) {
      const [hf, user] = key.split('||')
      silent.push({ hf, user, hoursAgo: Math.floor(hoursAgo) })
    }
  }

  if (silent.length === 0) return null

  const byHF = new Map<string, Silent[]>()
  for (const s of silent) {
    if (!byHF.has(s.hf)) byHF.set(s.hf, [])
    byHF.get(s.hf)!.push(s)
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      <IconAlertTriangle className="mt-px shrink-0 text-red-500" size={15} />
      <div className="flex-1 min-w-0 text-sm text-red-800">
        <span className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-red-600 mr-2">
          Silent Teams (&gt;6h no sync)
        </span>
        {Array.from(byHF.entries()).map(([hf, members], i) => {
          const maxHours = Math.max(...members.map(m => m.hoursAgo))
          const names = members.map(m => m.user).join(', ')
          return (
            <span key={hf}>
              {i > 0 && <span className="text-red-300 mx-1">·</span>}
              <strong className="font-semibold">{hf}</strong>
              {' '}({names}) — {maxHours}h ago
            </span>
          )
        })}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
      >
        <IconX size={14} />
      </button>
    </div>
  )
}
