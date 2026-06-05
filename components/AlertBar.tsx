'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

function parseSync(s: string): Date {
  // "YYYY-MM-DD HH:MM:SS" — not ISO, needs space→T replacement
  return new Date(s.replace(' ', 'T'))
}

export function AlertBar() {
  const { data } = useDashboard()
  const [dismissed, setDismissed] = useState(false)

  if (!data || dismissed) return null

  // "now" = latest timestamp in the dataset
  const allTimes = data.userActivity.map(r => parseSync(r.last_sync_time).getTime())
  const nowMs = Math.max(...allTimes)

  // Per user: most recent sync
  const latestByUser = new Map<string, number>()
  for (const r of data.userActivity) {
    const t = parseSync(r.last_sync_time).getTime()
    const key = `${r.health_facility}||${r.user_name}`
    if (!latestByUser.has(key) || t > latestByUser.get(key)!) {
      latestByUser.set(key, t)
    }
  }

  // Silent = > 6 hours behind "now"
  const SIX_HOURS = 6 * 60 * 60 * 1000
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

  // Group by HF
  const byHF = new Map<string, Silent[]>()
  for (const s of silent) {
    if (!byHF.has(s.hf)) byHF.set(s.hf, [])
    byHF.get(s.hf)!.push(s)
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
      <IconAlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} />
      <div className="flex-1">
        <span className="font-semibold">Silent teams (&gt;6h no sync): </span>
        {Array.from(byHF.entries()).map(([hf, members], i) => {
          const maxHours = Math.max(...members.map(m => m.hoursAgo))
          const names = members.map(m => m.user).join(', ')
          return (
            <span key={hf}>
              {i > 0 && ' · '}
              <strong>{hf}</strong> ({names}) — {maxHours}h ago
            </span>
          )
        })}
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-red-400 hover:text-red-600">
        <IconX size={16} />
      </button>
    </div>
  )
}
