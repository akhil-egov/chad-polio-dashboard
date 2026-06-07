export const DIGIT_ORANGE = '#F47738'

// ── Semantic colour system ─────────────────────────────────────────────────
// One source of truth. Same hex = same meaning on map, sidebar, table, badge.
export const COLORS = {
  // Coverage / performance tiers (full mode only)
  ON_TRACK:   '#15803D',  // forest green  ≥ 70%
  ACTIVE:     '#D97706',  // warm amber     ≥ 40%
  CRITICAL:   '#DC2626',  // clear red      < 40%

  // Data categories — both modes
  HOUSEHOLDS:  '#475569', // slate          neutral
  REFUSAL:     '#BE123C', // crimson        parent layer colour
  ZERODOSE:    '#B45309', // deep amber     parent layer colour

  // Teams / operational
  TEAMS:       '#1D4ED8', // royal blue

  // Household dot sub-states (zoom ≥ 14)
  VAX_YES:     '#15803D', // vaccinated household
  VAX_NO:      '#475569', // not yet vaccinated household

  // Zero-dose sub-statuses
  ZD_VACCINATED:     '#15803D',
  ZD_NOT_VACCINATED: '#B45309',

  // UI chrome
  WHO_BLUE:     '#006EB6',
  PAGE_BG:      '#F5F0E8',
  CARD_BG:      '#FFFFFF',
  TEXT_PRIMARY:  '#1A1F2E',
  TEXT_SECONDARY: '#64748B',
  BORDER:       '#E5E0D8',
}

// ── KPI card accent colours ────────────────────────────────────────────────
export const KPI_ACCENT = {
  enumerated: '#475569',  // slate — count, not performance
  vaccinated: '#15803D',  // green — good outcome
  missed:     '#C2410C',  // burnt orange — needs revisit
  teams:      '#1D4ED8',  // royal blue — operational
}

// ── Refusal sub-reason colours ─────────────────────────────────────────────
// 8 distinct colours for map dots and sidebar checkboxes.
// Always shown in both public and full mode (categorical, not performance).
export const REFUSAL_COLOR: Record<string, string> = {
  RELIGIOUS_BELIEFS:     '#BE123C', // crimson
  VACCINE_SIDE_EFFECTS:  '#7C3AED', // violet
  NOT_DECISION_MAKER:    '#0369A1', // ocean blue
  AFRICA_IS_POLIO_FREE:  '#B45309', // burnt amber
  TOO_MANY_DOSES:        '#0F766E', // teal
  CHILD_WAS_SICK:        '#C2410C', // terracotta
  CONCERNS_ABOUT_NOPV:   '#4D7C0F', // olive
  CONCERNS_ABOUT_COVID19: '#BE185D', // rose
  UNKNOWN:               '#64748B', // slate fallback
}

// ── Refusal reason labels ─────────────────────────────────────────────────
export const REFUSAL_LABEL: Record<string, string> = {
  NOT_DECISION_MAKER:    'Not the decision maker',
  RELIGIOUS_BELIEFS:     'Religious beliefs',
  VACCINE_SIDE_EFFECTS:  'Concerns about side effects',
  AFRICA_IS_POLIO_FREE:  'Believes Africa is polio-free',
  TOO_MANY_DOSES:        'Too many doses',
  CHILD_WAS_SICK:        'Child was sick',
  CONCERNS_ABOUT_NOPV:   'Concerns about nOPV2',
  CONCERNS_ABOUT_COVID19: 'COVID-19 concerns',
}
