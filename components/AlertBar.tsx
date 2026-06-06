'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

export function AlertBar() {
  const { data, mode, t } = useDashboard()
  const [dismissed, setDismissed] = useState(false)

  if (mode === 'public') return null
  if (!data || dismissed || data.inactive_users.length === 0) return null

  const byHF = new Map<string, { users: string[]; maxHours: number }>()
  for (const r of data.inactive_users) {
    if (!byHF.has(r.facility_name)) byHF.set(r.facility_name, { users: [], maxHours: 0 })
    const entry = byHF.get(r.facility_name)!
    entry.users.push(r.user_name)
    entry.maxHours = Math.max(entry.maxHours, Math.floor(r.hours_since_sync))
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      <IconAlertTriangle className="mt-px shrink-0 text-red-500" size={15} />
      <div className="flex-1 min-w-0 text-sm text-red-800">
        <span className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-red-600 mr-2">
          {t('Silent Teams (>6h no sync)')}
        </span>
        {Array.from(byHF.entries()).map(([hf, { users, maxHours }], i) => (
          <span key={hf}>
            {i > 0 && <span className="text-red-300 mx-1">·</span>}
            <strong className="font-semibold">{hf}</strong>
            {' '}({users.join(', ')}) — {maxHours}{t('h ago')}
          </span>
        ))}
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
        <IconX size={14} />
      </button>
    </div>
  )
}
