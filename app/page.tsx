'use client'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { KPICards } from '@/components/KPICards'
import { DateFilter } from '@/components/DateFilter'
import { HFTable } from '@/components/HFTable'
import { AlertBar } from '@/components/AlertBar'
import { TeamActivityTable } from '@/components/TeamActivityTable'
import { ActivityFilter } from '@/components/ActivityFilter'
import { MicroplanTable } from '@/components/MicroplanTable'
import { StockTable } from '@/components/StockTable'
import { RefusalsTable } from '@/components/RefusalsTable'
import { SettlementPanel } from '@/components/SettlementPanel'
import { DemographicsPanel } from '@/components/DemographicsPanel'
import { AbsentMissedTab } from '@/components/AbsentMissedTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'

const BubbleMap = dynamic(() => import('@/components/BubbleMap').then(m => m.BubbleMap), { ssr: false })

function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center border rounded overflow-hidden" style={{ borderColor: '#E5E0D8' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] focus-visible:ring-inset ${
            value === opt.value
              ? 'bg-[#006EB6] text-white'
              : 'bg-white text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function HomeContent() {
  const { isLoading, error, data, lang, setLang, mode, setMode, t } = useDashboard()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') ?? 'overview'

  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const vis = getVisibility(mode)
  const isMap = activeTab === 'map'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="flex items-center gap-3">
          <span className="wr-live-dot" />
          <span className="text-[15px] font-semibold tracking-wide text-slate-500">
            {t('Loading data…')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <p className="text-[15px] text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className={`${isMap ? 'h-screen' : 'min-h-screen wr-bg-grid'} flex flex-col`} style={{ background: '#F5F0E8' }}>
      {/* ── Header ── */}
      <header className="flex-none bg-white border-b" style={{ borderColor: '#E5E0D8' }}>
        <div className="max-w-[1380px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-5">

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="wr-live-dot" />
            <span className="text-[13px] font-semibold tracking-wide text-green-600 uppercase hidden sm:inline">
              {t('Live')}
            </span>
          </div>

          {/* Title + metadata */}
          <div className="flex-1 min-w-0">
            <h1 className="font-condensed text-[1.05rem] sm:text-[1.35rem] md:text-[1.75rem] font-bold tracking-[0.04em] text-[#1A1F2E] uppercase leading-tight">
              {t('Chad Polio Campaign — War Room')}
            </h1>
            <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {["N'Djamena", "Enum Jun 3–7", "Vacc Jun 5–7"].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold tracking-wide uppercase text-slate-500">
                    {item}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-slate-300 select-none">/</span>
                  )}
                </span>
              ))}
              {data?._metadata?.run_timestamp && (
                <>
                  <span className="text-slate-300 select-none">/</span>
                  <span className="text-[13px] font-medium" style={{ color: '#006EB6', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(data._metadata.run_timestamp).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Africa/Ndjamena',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: toggles + WHO badge */}
          <div className="shrink-0 flex items-center gap-2">
            <PillToggle
              options={[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]}
              value={lang}
              onChange={setLang}
            />
            <PillToggle
              options={[
                { value: 'public', label: '👁' },
                { value: 'full', label: '⚙' },
              ]}
              value={mode}
              onChange={setMode}
            />
            <div
              className="hidden sm:block text-[13px] font-bold tracking-wide uppercase rounded px-2.5 py-1.5"
              style={{ color: '#006EB6', border: '1px solid rgba(0,110,182,0.3)' }}
            >
              WHO AFRO
            </div>
          </div>
        </div>

        {/* WHO blue accent rule */}
        <div className="h-[3px]" style={{ background: '#006EB6' }} />
      </header>

      {/* ── Main content ── */}
      <main className={isMap
        ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
        : 'flex-1 max-w-[1380px] mx-auto w-full px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5'
      }>
        {!isMap && <AlertBar />}

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className={isMap ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : undefined}
        >
          <div className={isMap
            ? 'overflow-x-auto flex-none border-b'
            : 'overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'
          }>
            <TabsList className="min-w-max">
              <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="map">{t('Map')}</TabsTrigger>
              {vis.showTeamActivity && (
                <TabsTrigger value="team-activity">{t('Team Activity')}</TabsTrigger>
              )}
              <TabsTrigger value="microplan">{t('Microplan')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="absent-missed">{t('Absent & Missed')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="map" className={isMap ? 'flex-1 min-h-0 mt-0 overflow-hidden' : ''}>
            <BubbleMap />
          </TabsContent>

          <TabsContent value="overview" className="space-y-5 md:space-y-6">
            <DateFilter />
            <KPICards />
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Health Facility Coverage')}
              </h2>
              <HFTable />
            </div>
          </TabsContent>

          <TabsContent value="team-activity" className="space-y-4">
            <DateFilter />
            <ActivityFilter />
            <TeamActivityTable />
          </TabsContent>

          <TabsContent value="microplan" className="space-y-5 md:space-y-6">
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Microplan Targets vs Achieved')}
              </h2>
              <MicroplanTable />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Vial Stock Reconciliation')}
              </h2>
              <StockTable />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-5 md:space-y-6">
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Demographics — Vaccinated by Age & Gender')}
              </h2>
              <DemographicsPanel />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Settlement Type Breakdown')}
              </h2>
              <SettlementPanel />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4" style={{ color: '#006EB6' }}>
                {t('Refusals by Facility')}
              </h2>
              <RefusalsTable />
            </div>
          </TabsContent>

          <TabsContent value="absent-missed" className="space-y-5 md:space-y-6">
            <AbsentMissedTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
