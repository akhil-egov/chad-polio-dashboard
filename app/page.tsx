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

const BubbleMap = dynamic(() => import('@/components/BubbleMap').then(m => m.BubbleMap), { ssr: false })

export default function Home() {
  const { isLoading, error, data } = useDashboard()
  const [activeTab, setActiveTab] = useState('overview')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="wr-live-dot" />
          <span className="font-condensed text-base tracking-[0.15em] uppercase text-slate-400">
            Loading data…
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
        <div className="max-w-[1380px] mx-auto px-6 py-4 flex items-start gap-5">
          {/* Live indicator */}
          <div className="flex items-center gap-2 mt-[5px] shrink-0">
            <span className="wr-live-dot" />
            <span className="font-condensed text-[10px] font-bold tracking-[0.28em] text-green-600 uppercase">
              Live
            </span>
          </div>

          {/* Title + metadata */}
          <div className="min-w-0">
            <h1 className="font-condensed text-[1.75rem] font-bold tracking-[0.04em] text-[#003F72] uppercase leading-none">
              Chad Polio Campaign &mdash; War Room
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {["N'Djamena", "Enum Jun 3–7", "Vacc Jun 5–7"].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
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
                    {new Date(data._metadata.run_timestamp).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* WHO logo placeholder — right-aligned */}
          <div className="ml-auto shrink-0 flex items-center gap-2 self-center">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#009FDB] border border-[#009FDB]/30 rounded px-2 py-1">
              WHO AFRO
            </div>
          </div>
        </div>

        {/* WHO blue accent rule */}
        <div className="h-[3px] bg-[#009FDB]" />
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-[1380px] mx-auto w-full px-6 py-5 space-y-5">
        <AlertBar />

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v)}
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="team-activity">Team Activity</TabsTrigger>
            <TabsTrigger value="microplan">Microplan</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DateFilter />
            <KPICards />
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Health Facility Coverage
              </h2>
              <HFTable />
            </div>
          </TabsContent>

          <TabsContent value="team-activity" className="space-y-4">
            <DateFilter />
            <TeamActivityTable />
          </TabsContent>

          <TabsContent value="microplan" className="space-y-6">
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Microplan Targets vs Achieved
              </h2>
              <MicroplanTable />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Vial Stock Reconciliation
              </h2>
              <StockTable />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Demographics — Vaccinated by Age &amp; Gender
              </h2>
              <DemographicsPanel />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Settlement Type Breakdown
              </h2>
              <SettlementPanel />
            </div>
            <div>
              <h2 className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
                Refusals by Facility
              </h2>
              <RefusalsTable />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
