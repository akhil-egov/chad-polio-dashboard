'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { KPICards } from '@/components/KPICards'
import { DateFilter } from '@/components/DateFilter'
import { HFTable } from '@/components/HFTable'
import { AlertBar } from '@/components/AlertBar'
import { TeamActivityTable } from '@/components/TeamActivityTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDashboard } from '@/lib/dashboard-context'

const BubbleMap = dynamic(() => import('@/components/BubbleMap').then(m => m.BubbleMap), { ssr: false })

export default function Home() {
  const { isLoading, error, data, loadLocations } = useDashboard()
  const [activeTab, setActiveTab] = useState('overview')

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading dashboard data…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">Error: {error}</p>
      </main>
    )
  }

  if (activeTab === 'map') {
    return <BubbleMap onBack={() => setActiveTab('overview')} />
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chad Polio Campaign — War Room</h1>
          <p className="text-sm text-gray-500">
            N&apos;Djamena · Enumeration Jun 3–7 · Vaccination Jun 5–7
            {data?.generated_at && (
              <span className="ml-3 text-gray-400">
                · Data as of {new Date(data.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </p>
        </div>

        <AlertBar />

        <Tabs value={activeTab} onValueChange={v => {
          if (v === 'map') loadLocations()
          setActiveTab(v)
        }}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="team-activity">Team Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DateFilter />
            <KPICards />
            <div>
              <h2 className="text-base font-semibold mb-3 text-gray-700">Health Facility Coverage</h2>
              <HFTable />
            </div>
          </TabsContent>

          <TabsContent value="team-activity" className="space-y-4">
            <DateFilter />
            <TeamActivityTable />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
