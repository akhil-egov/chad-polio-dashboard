'use client'
import dynamic from 'next/dynamic'
import { FileUpload } from '@/components/FileUpload'
import { KPICards } from '@/components/KPICards'
import { DateFilter } from '@/components/DateFilter'
import { HFTable } from '@/components/HFTable'
import { AlertBar } from '@/components/AlertBar'
import { useDashboard } from '@/lib/dashboard-context'

const CampaignMap = dynamic(() => import('@/components/CampaignMap').then(m => m.CampaignMap), { ssr: false })

export default function Home() {
  const { data } = useDashboard()

  if (!data) return <FileUpload />

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chad Polio Campaign — War Room</h1>
          <p className="text-sm text-gray-500">N&apos;Djamena · Enumeration Jun 3–7 · Vaccination Jun 5–7</p>
        </div>
        <AlertBar />
        <DateFilter />
        <KPICards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-semibold mb-3 text-gray-700">Health Facility Coverage</h2>
            <HFTable />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-3 text-gray-700">Household Locations</h2>
            <CampaignMap />
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />Vaccinated</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />Enumerated only</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
