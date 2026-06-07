'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'
import type { CSSProperties } from 'react'

function stalePillStyle(hours: number): CSSProperties {
  if (hours >= 48) return { background: '#FEE2E2', color: '#BE123C', border: '1px solid #FECACA' }
  if (hours >= 24) return { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' }
  return { background: '#FEF9C3', color: '#854D0E', border: '1px solid #FEF08A' }
}

export function AlertBar() {
  const { data, mode, t } = useDashboard()
  const [dismissed, setDismissed] = useState(false)
  const vis = getVisibility(mode)

  if (!vis.showAlertBar) return null
  if (!data || dismissed || data.inactive_users.length === 0) return null

  const byHF = new Map<string, { users: string[]; maxHours: number }>()
  for (const r of data.inactive_users) {
    if (!byHF.has(r.facility_name)) byHF.set(r.facility_name, { users: [], maxHours: 0 })
    const entry = byHF.get(r.facility_name)!
    entry.users.push(r.user_name)
    entry.maxHours = Math.max(entry.maxHours, Math.floor(r.hours_since_sync))
  }

  const sorted = Array.from(byHF.entries()).sort((a, b) => b[1].maxHours - a[1].maxHours)

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      <IconAlertTriangle className="mt-0.5 shrink-0 text-red-500" size={16} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wide text-red-700 mb-2">
          {t('Silent Teams (>6h no sync)')}
        </p>
        <div className="flex flex-wrap gap-2">
          {sorted.map(([hf, { maxHours }]) => (
            <span
              key={hf}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1 rounded-full"
              style={stalePillStyle(maxHours)}
            >
              {hf} · {maxHours}h
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-red-400 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <IconX size={15} />
      </button>
    </div>
  )
}
