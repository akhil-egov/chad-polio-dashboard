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
      if (pub) return '#009FDB'
      if (pct >= 70) return '#2E7D32'
      if (pct >= 40) return '#F9A825'
      return '#C62828'
    },
    bubbleColor(pct: number): string {
      if (pub) return '#009FDB'
      if (pct >= 70) return '#2E7D32'
      if (pct >= 40) return '#F9A825'
      return '#C62828'
    },
    dotColor(vaccinated: boolean): string {
      return pub ? '#009FDB' : (vaccinated ? '#22c55e' : '#64748b')
    },
    dotStroke(vaccinated: boolean): string {
      return pub ? '#0077a8' : (vaccinated ? '#16a34a' : '#475569')
    },
    progressBarColor(pct: number): string {
      if (pub) return '#009FDB'
      if (pct >= 70) return '#2E7D32'
      if (pct >= 40) return '#F9A825'
      return '#C62828'
    },
    gapTextClass: pub ? 'text-slate-700' : 'text-red-600 font-semibold',
  }
}
