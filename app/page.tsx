'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { KPICards } from '@/components/KPICards'
import { DateFilter } from '@/components/DateFilter'
import { HFTable } from '@/components/HFTable'
import { AlertBar } from '@/components/AlertBar'
import { TeamActivityTable } from '@/components/TeamActivityTable'
import { MicroplanTable } from '@/components/MicroplanTable'
import { StockTable } from '@/components/StockTable'
import { RefusalsTable } from '@/components/RefusalsTable'
import { SettlementPanel } from '@/components/SettlementPanel'
import { DemographicsPanel } from '@/components/DemographicsPanel'
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
    <div className="flex items-center border border-slate-200 rounded overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 font-condensed text-[10px] font-bold tracking-wide uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB] focus-visible:ring-inset ${
            value === opt.value
              ? 'bg-[#009FDB] text-white'
              : 'bg-white text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function Home() {
  const { isLoading, error, data, lang, setLang, mode, setMode, t } = useDashboard()
  const [activeTab, setActiveTab] = useState('overview')
  const vis = getVisibility(mode)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="wr-live-dot" />
          <span className="font-condensed text-sm tracking-[0.15em] uppercase text-slate-500">
            {t('Loading data…')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="font-data text-sm text-red-600">Error: {error}</p>
      </div>
    )
  }

  if (activeTab === 'map') {
    return <BubbleMap onBack={() => setActiveTab('overview')} />
  }

  return (
    <div className="min-h-screen bg-[#f0f5fa] wr-bg-grid flex flex-col">
      {/* ── Header ── */}
      <header className="flex-none bg-white border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-5">

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="wr-live-dot" />
            <span className="font-condensed text-[10px] font-bold tracking-[0.28em] text-green-600 uppercase hidden sm:inline">
              {t('Live')}
            </span>
          </div>

          {/* Title + metadata — grows to fill space */}
          <div className="flex-1 min-w-0">
            <h1 className="font-condensed text-[1.05rem] sm:text-[1.35rem] md:text-[1.75rem] font-bold tracking-[0.04em] text-[#003F72] uppercase leading-tight">
              {t('Chad Polio Campaign — War Room')}
            </h1>
            {/* Metadata row — hidden on mobile to save space */}
            <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {["N'Djamena", "Enum Jun 3–7", "Vacc Jun 5–7"].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                    {item}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-slate-200 text-xs select-none">/</span>
                  )}
                </span>
              ))}
              {data?._metadata?.run_timestamp && (
                <>
                  <span className="text-slate-200 text-xs select-none">/</span>
                  <span className="font-data text-[10px] text-[#009FDB]/70 tracking-wide">
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
            <div className="hidden sm:block text-[10px] font-bold tracking-[0.2em] uppercase text-[#009FDB] border border-[#009FDB]/30 rounded px-2 py-1">
              WHO AFRO
            </div>
          </div>
        </div>

        {/* WHO blue accent rule */}
        <div className="h-[3px] bg-[#009FDB]" />
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-[1380px] mx-auto w-full px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <AlertBar />

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v)}>
          {/* Tabs scroll horizontally on small screens */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="min-w-max">
              <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="map">{t('Map')}</TabsTrigger>
              {vis.showTeamActivity && (
                <TabsTrigger value="team-activity">{t('Team Activity')}</TabsTrigger>
              )}
              <TabsTrigger value="microplan">{t('Microplan')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('Analytics')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5 md:space-y-6">
            <DateFilter />
            <KPICards />
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Health Facility Coverage')}
              </h2>
              <HFTable />
            </div>
          </TabsContent>

          <TabsContent value="team-activity" className="space-y-4">
            <DateFilter />
            <TeamActivityTable />
          </TabsContent>

          <TabsContent value="microplan" className="space-y-5 md:space-y-6">
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Microplan Targets vs Achieved')}
              </h2>
              <MicroplanTable />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Vial Stock Reconciliation')}
              </h2>
              <StockTable />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-5 md:space-y-6">
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Demographics — Vaccinated by Age & Gender')}
              </h2>
              <DemographicsPanel />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Settlement Type Breakdown')}
              </h2>
              <SettlementPanel />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-3 md:mb-4">
                {t('Refusals by Facility')}
              </h2>
              <RefusalsTable />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
