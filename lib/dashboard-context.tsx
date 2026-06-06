'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { DashboardData } from './types'

interface Ctx {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  selectedDate: string | null
  setSelectedDate: (d: string | null) => void
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`)
        return r.json()
      })
      .then((d: DashboardData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, selectedDate, setSelectedDate }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside provider')
  return ctx
}
