'use client'
import { useState, useMemo } from 'react'
import { IconFilter, IconSearch, IconX, IconChevronDown, IconChevronUp, IconAlertTriangle } from '@tabler/icons-react'
import { DIGIT_ORANGE, REFUSAL_LABEL, REFUSAL_COLOR } from '@/lib/constants'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'

export interface FacilityItem {
  name: string
  records: number
  covPct: number
  color: string
  abbrev: string
}

interface FilterSidebarProps {
  // Facility list
  facilities: FacilityItem[]
  filteredFacilities: FacilityItem[]
  // Facility selection
  selectedFac: string | null
  onSelect: (name: string) => void
  onClearFacility: () => void
  onClearAll: () => void
  // Search
  facilitySearch: string
  setFacilitySearch: (v: string) => void
  // Layer toggles
  showHouseholds: boolean
  toggleHouseholds: () => void
  showRefusals: boolean
  toggleRefusals: () => void
  showZerodose: boolean
  toggleZerodose: () => void
  showClosedHousehold: boolean
  toggleClosedHousehold: () => void
  // Refusal sub-filters
  refusalReasonCounts: Record<string, number>
  selectedReasons: Set<string> | null
  isReasonChecked: (reason: string) => boolean
  toggleReason: (reason: string) => void
  selectAllReasons: () => void
  // Zero-dose sub-filters
  zeroDoseStatusCounts: { vaccinated: number; not_vaccinated: number }
  selectedZdStatuses: Set<string> | null
  isZdStatusChecked: (key: string) => boolean
  toggleZdStatus: (key: string) => void
  selectAllZdStatuses: () => void
  // Counts for display
  householdsTotal: number | undefined
  refusalsTotal: number | undefined
  zerodoseTotal: number | undefined
  closedHouseholdTotal: number | undefined
  filterCount: number
  onClose: () => void
  // Visibility
  dotColor: (vaccinated: boolean) => string
  // Settlement filter
  selectedSettlement: string | null
  onFilterSettlement: (type: string | null) => void
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 64, H = 22
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - 2 - ((v - min) / range) * (H - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const last = pts[pts.length - 1].split(',')
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#006EB6" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="#006EB6" />
    </svg>
  )
}

// ── CampaignSummary ──────────────────────────────────────────────────────────

const SETTLEMENT_ORDER = ['URBAN', 'RURAL', 'SLUMS']
const SETTLEMENT_LABEL: Record<string, string> = {
  URBAN: 'Urban', RURAL: 'Rural', SLUMS: 'Slums',
}

function CampaignSummary({
  selectedSettlement,
  onFilterSettlement,
  toggleRefusals,
  showRefusals,
}: {
  selectedSettlement: string | null
  onFilterSettlement: (type: string | null) => void
  toggleRefusals: () => void
  showRefusals: boolean
}) {
  const { data, mode } = useDashboard()
  const [expanded, setExpanded] = useState(true)
  const vis = getVisibility(mode)

  const overallCovPct = useMemo(() => {
    if (!data?.enumeration?.length) return 0
    const totalVax = data.enumeration.reduce((s, r) => s + r.vaccinated_children, 0)
    const totalElig = data.enumeration.reduce((s, r) => s + r.eligible_children, 0)
    return totalElig > 0 ? (totalVax / totalElig) * 100 : 0
  }, [data])

  const sparklineValues = useMemo(() => {
    if (!data?.coverage?.length) return []
    const byDate = new Map<string, number>()
    for (const r of data.coverage) {
      if (!r.date) continue
      byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.cumulative_vaccinated)
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [data])

  const silentTeamsCount = useMemo(() => data?.inactive_users?.length ?? 0, [data])

  const topRefusal = useMemo(() => {
    if (!data?.refusals?.length) return null
    return [...data.refusals].sort((a, b) => b.count - a.count)[0]
  }, [data])

  const settlementRows = useMemo(() => {
    if (!data?.settlement?.length) return []
    return [...data.settlement]
      .filter(r => r.settlement_type !== 'HARD_TO_REACH' && (r.pct_complete > 0 || r.eligible_children > 0))
      .sort((a, b) => SETTLEMENT_ORDER.indexOf(a.settlement_type) - SETTLEMENT_ORDER.indexOf(b.settlement_type))
      .map(r => ({ ...r, label: SETTLEMENT_LABEL[r.settlement_type] ?? r.settlement_type }))
  }, [data])

  const covColor = vis.progressBarColor(overallCovPct)
  const alertCount = mode === 'full' ? silentTeamsCount : 0

  return (
    <div className="border-b border-gray-200 flex-shrink-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-3 py-1.5 flex items-center justify-between bg-gray-50/80 hover:bg-gray-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]"
      >
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Summary</span>
        <div className="flex items-center gap-1.5">
          {!expanded && (
            <span className="text-[13px] font-bold" style={{ color: covColor }}>
              {overallCovPct.toFixed(1)}%
            </span>
          )}
          {!expanded && alertCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {alertCount}
            </span>
          )}
          {expanded
            ? <IconChevronUp size={12} className="text-gray-400" />
            : <IconChevronDown size={12} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {/* Coverage + sparkline */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[22px] font-bold leading-none" style={{ color: covColor }}>
              {overallCovPct.toFixed(1)}<span className="text-[12px] ml-0.5 font-semibold">%</span>
            </div>
            <Sparkline values={sparklineValues} />
          </div>

          {/* Alerts — full mode only */}
          {mode === 'full' && (silentTeamsCount > 0 || topRefusal) && (
            <div className="space-y-1 pt-1.5 border-t border-gray-100">
              {silentTeamsCount > 0 && (
                <div className="flex items-center gap-1.5 text-[12px] text-amber-700">
                  <IconAlertTriangle size={11} className="flex-shrink-0" />
                  <span>{silentTeamsCount} silent team{silentTeamsCount !== 1 ? 's' : ''} &gt;6h</span>
                </div>
              )}
              {topRefusal && (
                <button
                  onClick={() => { if (!showRefusals) toggleRefusals() }}
                  className="w-full flex items-center justify-between text-[12px] text-red-700 hover:text-red-900 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] rounded"
                >
                  <span className="truncate">{REFUSAL_LABEL[topRefusal.reason_code] ?? topRefusal.reason_label}</span>
                  <span className="font-semibold tabular-nums ml-2 flex-shrink-0">{topRefusal.count}</span>
                </button>
              )}
            </div>
          )}

          {/* Settlement filter */}
          {settlementRows.length > 0 && (
            <div className="space-y-0.5 pt-1.5 border-t border-gray-100">
              {settlementRows.map(r => {
                const active = selectedSettlement === r.settlement_type
                return (
                  <button
                    key={r.settlement_type}
                    onClick={() => onFilterSettlement(active ? null : r.settlement_type)}
                    className={`w-full flex items-center gap-2 text-[12px] rounded px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`flex-1 text-left ${active ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                      {r.label}
                    </span>
                    <span className={`tabular-nums w-8 text-right text-[11px] ${active ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                      {r.pct_complete.toFixed(0)}%
                    </span>
                    <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, r.pct_complete)}%`, background: vis.progressBarColor(r.pct_complete) }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── FilterSidebar ────────────────────────────────────────────────────────────

export function FilterSidebar({
  filteredFacilities,
  selectedFac,
  onSelect,
  onClearFacility,
  onClearAll,
  facilitySearch,
  setFacilitySearch,
  showHouseholds,
  toggleHouseholds,
  showRefusals,
  toggleRefusals,
  showZerodose,
  toggleZerodose,
  showClosedHousehold,
  toggleClosedHousehold,
  refusalReasonCounts,
  selectedReasons,
  isReasonChecked,
  toggleReason,
  selectAllReasons,
  zeroDoseStatusCounts,
  selectedZdStatuses,
  isZdStatusChecked,
  toggleZdStatus,
  selectAllZdStatuses,
  householdsTotal,
  refusalsTotal,
  zerodoseTotal,
  closedHouseholdTotal,
  filterCount,
  onClose,
  dotColor,
  selectedSettlement,
  onFilterSettlement,
}: FilterSidebarProps) {
  const [sortHighToLow, setSortHighToLow] = useState(true)
  const [layersExpanded, setLayersExpanded] = useState(true)

  return (
    <div className="w-[220px] h-full flex flex-col bg-white overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <IconFilter size={14} className="text-slate-500" />
          <span className="text-slate-700 text-[13px] font-bold uppercase tracking-widest">Filters</span>
          {filterCount > 0 && (
            <span className="bg-[#006EB6] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
              {filterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-slate-400 text-[12px] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6]"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-slate-400 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] rounded"
          >
            <IconX size={14} />
          </button>
        </div>
      </div>

      {/* Campaign summary */}
      <CampaignSummary
        selectedSettlement={selectedSettlement}
        onFilterSettlement={onFilterSettlement}
        toggleRefusals={toggleRefusals}
        showRefusals={showRefusals}
      />

      {/* Search input */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search facilities..."
            value={facilitySearch}
            onChange={e => setFacilitySearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#006EB6] focus:border-transparent"
          />
        </div>
      </div>

      {/* Active facility chip */}
      {selectedFac && (
        <div className="px-3 py-1.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full border"
              style={{ background: '#FFF3E0', borderColor: DIGIT_ORANGE, color: DIGIT_ORANGE }}
            >
              {selectedFac}
              <button onClick={onClearFacility} className="ml-0.5 hover:opacity-70 focus-visible:outline-none">
                <IconX size={10} />
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Layers section */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setLayersExpanded(v => !v)}
          className="w-full px-3 py-1.5 flex items-center justify-between bg-gray-50/80 hover:bg-gray-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]"
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Layers</span>
          <div className="flex items-center gap-1.5">
            {!layersExpanded && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full transition-colors" style={{ background: showHouseholds ? '#006EB6' : '#d1d5db' }} />
                <span className="w-2 h-2 rounded-full transition-colors" style={{ background: showRefusals ? '#C62828' : '#d1d5db' }} />
                <span className="w-2 h-2 rounded-full transition-colors" style={{ background: showZerodose ? '#F9A825' : '#d1d5db' }} />
                <span className="w-2 h-2 rounded-full transition-colors" style={{ background: showClosedHousehold ? '#7C3AED' : '#d1d5db' }} />
              </div>
            )}
            {layersExpanded
              ? <IconChevronUp size={12} className="text-gray-400" />
              : <IconChevronDown size={12} className="text-gray-400" />}
          </div>
        </button>

        {layersExpanded && (
          <>
            <LayerRow
              color="#006EB6"
              label="Households"
              count={householdsTotal}
              active={showHouseholds}
              onToggle={toggleHouseholds}
            />

            <LayerRow
              color="#C62828"
              label="Refusals"
              count={refusalsTotal}
              active={showRefusals}
              onToggle={toggleRefusals}
            />
            {showRefusals && (
              <div className="bg-red-50/60 border-t border-red-100/60 px-3 py-2 space-y-1">
                {selectedReasons !== null && (
                  <button
                    onClick={selectAllReasons}
                    className="text-[12px] text-[#006EB6] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6]"
                  >
                    Select all
                  </button>
                )}
                {Object.entries(refusalReasonCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <SubCheck
                      key={reason}
                      checked={isReasonChecked(reason)}
                      label={REFUSAL_LABEL[reason] ?? reason}
                      count={count}
                      color={REFUSAL_COLOR[reason] ?? '#BE123C'}
                      onToggle={() => toggleReason(reason)}
                    />
                  ))}
              </div>
            )}

            <LayerRow
              color="#F9A825"
              label="Zero Dose"
              count={zerodoseTotal}
              active={showZerodose}
              onToggle={toggleZerodose}
            />
            {showZerodose && (
              <div className="bg-amber-50/60 border-t border-amber-100/60 px-3 py-2 space-y-1">
                {selectedZdStatuses !== null && (
                  <button
                    onClick={selectAllZdStatuses}
                    className="text-[12px] text-[#006EB6] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6]"
                  >
                    Select all
                  </button>
                )}
                <SubCheck
                  checked={isZdStatusChecked('not_vaccinated')}
                  label="Not yet vaccinated"
                  count={zeroDoseStatusCounts.not_vaccinated}
                  color="#C62828"
                  onToggle={() => toggleZdStatus('not_vaccinated')}
                />
                <SubCheck
                  checked={isZdStatusChecked('vaccinated')}
                  label="Vaccinated ✓"
                  count={zeroDoseStatusCounts.vaccinated}
                  color="#16a34a"
                  onToggle={() => toggleZdStatus('vaccinated')}
                />
              </div>
            )}

            <LayerRow
              color="#7C3AED"
              label="Closed Households"
              count={closedHouseholdTotal}
              active={showClosedHousehold}
              onToggle={toggleClosedHousehold}
            />
          </>
        )}
      </div>

      {/* Health Facilities section */}
      <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Health Facilities</span>
        <button
          onClick={() => setSortHighToLow(v => !v)}
          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] rounded px-1"
          title={sortHighToLow ? 'Sorted high → low' : 'Sorted low → high'}
        >
          % {sortHighToLow ? '↓' : '↑'}
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          {[...filteredFacilities].sort((a, b) => sortHighToLow ? b.covPct - a.covPct : a.covPct - b.covPct).map(fac => {
            const sel = selectedFac === fac.name
            return (
              <div
                key={fac.name}
                onClick={() => onSelect(fac.name)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelect(fac.name)}
                className={`flex items-stretch cursor-pointer border-b border-gray-50 min-h-14 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6] ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex-shrink-0 transition-all" style={{ background: fac.color, width: sel ? '6px' : '4px' }} />
                <div className="flex-1 px-3 py-2 min-w-0 flex flex-col justify-center">
                  <div className={`text-[13px] font-semibold truncate ${sel ? 'text-blue-700' : 'text-gray-800'}`}>{fac.name}</div>
                  <div className="text-[13px] font-semibold mt-0.5" style={{ color: fac.color }}>
                    {fac.covPct.toFixed(1)}% <span className="text-gray-400 font-normal text-[12px]">coverage</span>
                  </div>
                </div>
                <div className="px-3 py-2 text-right flex flex-col justify-center flex-shrink-0">
                  <div className="text-[13px] font-semibold text-gray-800">{fac.records.toLocaleString('en-US')}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">eligible 0–59m</div>
                </div>
              </div>
            )
          })}
          {filteredFacilities.length === 0 && (
            <div className="px-4 py-6 text-xs text-slate-500 text-center">No facilities match</div>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LayerRow({ color, label, count, active, onToggle }: {
  color: string; label: string; count?: number; active: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6] ${active ? 'bg-white' : 'bg-gray-50/60'}`}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/50 shadow-sm transition-colors"
        style={{ background: active ? color : '#d1d5db' }}
      />
      <span className={`text-[13px] font-semibold flex-1 ${active ? 'text-gray-800' : 'text-gray-400'}`}>
        {label}
      </span>
      {count != null && (
        <span className={`text-[12px] ${active ? 'text-gray-400' : 'text-gray-300'}`}>
          {count.toLocaleString('en-US')}
        </span>
      )}
      <span className={`text-[12px] font-medium ml-1 ${active ? 'text-gray-500' : 'text-gray-300'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

function SubCheck({ checked, label, count, color, onToggle }: {
  checked: boolean; label: string; count: number; color: string; onToggle: () => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-3 h-3 rounded border-gray-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#006EB6]"
        style={{ accentColor: color }}
      />
      <span className={`text-[12px] flex-1 transition-colors ${checked ? 'text-gray-700' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-[12px] font-semibold tabular-nums ${checked ? 'text-gray-500' : 'text-gray-300'}`}>
        {count}
      </span>
    </label>
  )
}
