'use client'
import { getVisibility } from '@/lib/visibility'

interface Props {
  pct: number
  mode: 'public' | 'full'
  height?: string
}

export function CoverageBar({ pct, mode, height = 'h-2' }: Props) {
  const vis = getVisibility(mode)
  return (
    <div className={`w-full bg-slate-200 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${height} rounded-full transition-all`}
        style={{ width: `${Math.min(100, pct)}%`, background: vis.progressBarColor(pct) }}
      />
    </div>
  )
}
