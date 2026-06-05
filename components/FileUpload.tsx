'use client'
import { useCallback } from 'react'
import { parseExcel } from '@/lib/excel-parser'
import { useDashboard } from '@/lib/dashboard-context'

export function FileUpload() {
  const { setData } = useDashboard()

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx')) return
    const parsed = await parseExcel(file)
    setData(parsed)
  }, [setData])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-blue-400 rounded-xl p-16 text-center max-w-md w-full"
      >
        <p className="text-xl font-semibold text-gray-700">Drop consolidated report here</p>
        <p className="text-sm text-gray-400 mt-2">Sheets: HF_Summary · User_Activity · Household_Locations · Daily_Summary</p>
        <label className="mt-6 inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          Browse file
          <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </label>
      </div>
    </div>
  )
}
