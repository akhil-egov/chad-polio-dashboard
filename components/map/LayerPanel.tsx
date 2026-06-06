import type { DashboardData } from '@/lib/types'

const REFUSAL_LABEL: Record<string, string> = {
  NOT_DECISION_MAKER: 'Not the decision maker',
  RELIGIOUS_BELIEFS: 'Religious beliefs',
  VACCINE_SIDE_EFFECTS: 'Concerns about side effects',
  AFRICA_IS_POLIO_FREE: 'Believes Africa is polio-free',
  TOO_MANY_DOSES: 'Too many doses',
  CHILD_WAS_SICK: 'Child was sick',
  CONCERNS_ABOUT_NOPV: 'Concerns about nOPV2',
  CONCERNS_ABOUT_COVID19: 'COVID-19 concerns',
}

interface Props {
  data: DashboardData | null
  isPublic: boolean
  showHouseholds: boolean
  showRefusals: boolean
  showZerodose: boolean
  selectedReasons: Set<string> | null
  selectedZdStatuses: Set<string> | null
  refusalReasonCounts: Record<string, number>
  zeroDoseStatusCounts: { vaccinated: number; not_vaccinated: number }
  onToggleHouseholds: () => void
  onToggleRefusals: () => void
  onToggleZerodose: () => void
  onToggleReason: (reason: string) => void
  onToggleZdStatus: (key: string) => void
  isReasonChecked: (reason: string) => boolean
  isZdStatusChecked: (key: string) => boolean
  onSelectAllReasons: () => void
  onSelectAllZdStatuses: () => void
}

export function LayerPanel({
  data, isPublic,
  showHouseholds, showRefusals, showZerodose,
  selectedReasons, selectedZdStatuses,
  refusalReasonCounts, zeroDoseStatusCounts,
  onToggleHouseholds, onToggleRefusals, onToggleZerodose,
  onToggleReason, onToggleZdStatus,
  isReasonChecked, isZdStatusChecked,
  onSelectAllReasons, onSelectAllZdStatuses,
}: Props) {
  return (
    <div
      className="absolute top-3 left-3 z-[800] bg-white/97 border border-gray-200 rounded-xl shadow-md overflow-hidden"
      style={{ minWidth: 196, maxHeight: 420, overflowY: 'auto' }}
    >
      <LayerRow
        color={isPublic ? '#009FDB' : '#64748b'}
        label="Households"
        count={data?.gps.length}
        active={showHouseholds}
        onToggle={onToggleHouseholds}
      />

      <LayerRow
        color="#C62828"
        label="Refusals"
        count={data?.gps_refusals?.length}
        active={showRefusals}
        onToggle={onToggleRefusals}
      />
      {showRefusals && (
        <div className="bg-red-50/60 border-t border-red-100/60 px-3 py-2 space-y-1">
          {selectedReasons !== null && (
            <button onClick={onSelectAllReasons} className="text-[10px] text-[#009FDB] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB]">
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
                onToggle={() => onToggleReason(reason)}
              />
            ))}
        </div>
      )}

      <LayerRow
        color="#F9A825"
        label="Zero Dose"
        count={data?.gps_zerodose?.length}
        active={showZerodose}
        onToggle={onToggleZerodose}
      />
      {showZerodose && (
        <div className="bg-amber-50/60 border-t border-amber-100/60 px-3 py-2 space-y-1">
          {selectedZdStatuses !== null && (
            <button onClick={onSelectAllZdStatuses} className="text-[10px] text-[#009FDB] hover:underline w-full text-left mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB]">
              Select all
            </button>
          )}
          <SubCheck
            checked={isZdStatusChecked('not_vaccinated')}
            label="Not yet vaccinated"
            count={zeroDoseStatusCounts.not_vaccinated}
            color="#C62828"
            onToggle={() => onToggleZdStatus('not_vaccinated')}
          />
          <SubCheck
            checked={isZdStatusChecked('vaccinated')}
            label="Vaccinated ✓"
            count={zeroDoseStatusCounts.vaccinated}
            color="#16a34a"
            onToggle={() => onToggleZdStatus('vaccinated')}
          />
        </div>
      )}
    </div>
  )
}

function LayerRow({ color, label, count, active, onToggle }: {
  color: string; label: string; count?: number; active: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-100 focus-visible:ring-2 focus-visible:ring-[#009FDB] ${active ? 'bg-white' : 'bg-gray-50/60'}`}
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
