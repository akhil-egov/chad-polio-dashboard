'use client'
import dynamic from 'next/dynamic'
import { KPICards } from '@/components/KPICards'
import { DateFilter } from '@/components/DateFilter'
import { HFTable } from '@/components/HFTable'
import { AlertBar } from '@/components/AlertBar'
import { TeamActivityTable } from '@/components/TeamActivityTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDashboard } from '@/lib/dashboard-context'

const CampaignMap = dynamic(() => import('@/components/CampaignMap').then(m => m.CampaignMap), { ssr: false })

export default function Home() {
  const { isLoading, error, data, loadLocations } = useDashboard()

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

        <Tabs defaultValue="overview" onValueChange={v => { if (v === 'map') loadLocations() }}>
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

          <TabsContent value="map" className="space-y-4">
            <DateFilter />
            <CampaignMap />
            <div className="flex gap-4 text-xs text-gray-500">
              <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />Vaccinated</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />Enumerated only</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-1 align-middle" />Flagged for revisit</span>
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
