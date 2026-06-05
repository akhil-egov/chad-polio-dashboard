'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import type { DashboardData, HouseholdLocationRow } from './types'

type SummaryData = Omit<DashboardData, 'householdLocations'>

interface Ctx {
  data: SummaryData | null
  isLoading: boolean
  error: string | null
  locations: HouseholdLocationRow[]
  locationsLoading: boolean
  loadLocations: () => void
  selectedDate: string | null
  setSelectedDate: (d: string | null) => void
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<HouseholdLocationRow[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const locationsFetched = useRef(false)

  useEffect(() => {
    fetch('/data-summary.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`)
        return r.json()
      })
      .then((d: SummaryData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  function loadLocations() {
    if (locationsFetched.current) return
    locationsFetched.current = true
    setLocationsLoading(true)
    fetch('/data-locations.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load locations (${r.status})`)
        return r.json()
      })
      .then((d: HouseholdLocationRow[]) => setLocations(d))
      .catch(() => { locationsFetched.current = false })
      .finally(() => setLocationsLoading(false))
  }

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, locations, locationsLoading, loadLocations, selectedDate, setSelectedDate }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside provider')
  return ctx
}
