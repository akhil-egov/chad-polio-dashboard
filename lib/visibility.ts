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
    dotColor(_vaccinated: boolean): string {
      return COLORS.WHO_BLUE
    },
    dotStroke(_vaccinated: boolean): string {
      return '#005a94'
    },
    progressBarColor(pct: number): string {
      if (pct >= 70) return COLORS.ON_TRACK
      if (pct >= 40) return COLORS.ACTIVE
      return COLORS.CRITICAL
    },
    gapTextClass: pub ? 'text-slate-700' : 'text-[#DC2626] font-semibold',
  }
}
