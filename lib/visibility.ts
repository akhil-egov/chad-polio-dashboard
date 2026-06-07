import { COLORS } from '@/lib/constants'

export type Visibility = ReturnType<typeof getVisibility>

export function getVisibility(mode: 'public' | 'full') {
  const pub = mode === 'public'
  return {
    showMissedCard:   !pub,
    showAlertBar:     !pub,
    showTeamActivity: !pub,
    showStatusBadges: !pub,
    showGapNumbers:   !pub,
    showTeamInHover:  !pub,

    barColor(pct: number): string {
      if (pct >= 70) return COLORS.ON_TRACK
      if (pct >= 40) return COLORS.ACTIVE
      return COLORS.CRITICAL
    },
    bubbleColor(pct: number): string {
      if (pct >= 70) return COLORS.ON_TRACK
      if (pct >= 40) return COLORS.ACTIVE
      return COLORS.CRITICAL
    },
    dotColor(vaccinated: boolean): string {
      if (pub) return COLORS.WHO_BLUE
      return vaccinated ? COLORS.VAX_YES : COLORS.VAX_NO
    },
    dotStroke(vaccinated: boolean): string {
      if (pub) return '#005a94'
      return vaccinated ? '#0f5a2a' : '#334155'
    },
    progressBarColor(pct: number): string {
      if (pub) return COLORS.WHO_BLUE
      if (pct >= 70) return COLORS.ON_TRACK
      if (pct >= 40) return COLORS.ACTIVE
      return COLORS.CRITICAL
    },
    gapTextClass: pub ? 'text-slate-700' : 'text-[#DC2626] font-semibold',
  }
}
