'use client'
import { IconFilter, IconSearch, IconX } from '@tabler/icons-react'
import { DIGIT_ORANGE, REFUSAL_LABEL } from '@/lib/constants'

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
  filterCount: number
  // Visibility
  dotColor: (vaccinated: boolean) => string
}

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
  filterCount,
  dotColor,
}: FilterSidebarProps) {
  return (
    <div className="w-[290px] flex-shrink-0 flex flex-col border-r border-gray-200 overflow-hidden">

      {/* Header */}
      <div style={{ background: DIGIT_ORANGE }} className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <IconFilter size={16} color="white" />
          <span className="text-white text-xs font-bold uppercase tracking-widest">Filters</span>
          {filterCount > 0 && (
            <span className="bg-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: DIGIT_ORANGE }}>
              {filterCount}
            </span>
          )}
        </div>
        {filterCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-white/80 text-[10px] hover:text-white underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search facilities..."
            value={facilitySearch}
            onChange={e => setFacilitySearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#009FDB] focus:border-transparent"
          />
        </div>
      </div>

      {/* Active facility chip */}
      {selectedFac && (
        <div className="px-3 py-1.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
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
      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 flex-shrink-0">
        Layers
      </div>

      <div className="border-b border-gray-100 flex-shrink-0">
        <LayerRow
          color={dotColor(false)}
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
                className="text-[10px] text-[#009FDB] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB]"
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
                  color="#C62828"
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
                className="text-[10px] text-[#009FDB] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB]"
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
      </div>

      {/* Call list section */}
      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">
        Call list · worst coverage first
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          {filteredFacilities.map(fac => {
            const sel = selectedFac === fac.name
            return (
              <div
                key={fac.name}
                onClick={() => onSelect(fac.name)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelect(fac.name)}
                className={`flex items-stretch cursor-pointer border-b border-gray-50 h-14 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009FDB] ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex-shrink-0 transition-all" style={{ background: fac.color, width: sel ? '6px' : '4px' }} />
                <div className="flex-1 px-3 py-2 min-w-0 flex flex-col justify-center">
                  <div className={`text-[12px] font-semibold truncate ${sel ? 'text-blue-700' : 'text-gray-800'}`}>{fac.name}</div>
                  <div className="text-[12px] font-semibold mt-0.5" style={{ color: fac.color }}>
                    {fac.covPct.toFixed(1)}% <span className="text-gray-400 font-normal text-[10px]">coverage</span>
                  </div>
                </div>
                <div className="px-3 py-2 text-right flex flex-col justify-center flex-shrink-0">
                  <div className="text-[13px] font-semibold text-gray-800">{fac.records.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">target pop.</div>
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

function LayerRow({ color, label, count, active, onToggle }: {
  color: string; label: string; count?: number; active: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009FDB] ${active ? 'bg-white' : 'bg-gray-50/60'}`}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/50 shadow-sm transition-colors"
        style={{ background: active ? color : '#d1d5db' }}
      />
      <span className={`text-xs font-semibold flex-1 ${active ? 'text-gray-800' : 'text-gray-400'}`}>
        {label}
      </span>
      {count != null && (
        <span className={`text-[10px] ${active ? 'text-gray-400' : 'text-gray-300'}`}>
          {count.toLocaleString()}
        </span>
      )}
      <span className={`text-[10px] font-medium ml-1 ${active ? 'text-gray-500' : 'text-gray-300'}`}>
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
        className="w-3 h-3 rounded border-gray-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#009FDB]"
        style={{ accentColor: color }}
      />
      <span className={`text-[10px] flex-1 transition-colors ${checked ? 'text-gray-700' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-[10px] font-semibold tabular-nums ${checked ? 'text-gray-500' : 'text-gray-300'}`}>
        {count}
      </span>
    </label>
  )
}
