'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import type { DashboardData } from './types'

interface Ctx {
  data: DashboardData | null
  selectedDate: string | null
  setData: (d: DashboardData) => void
  setSelectedDate: (d: string | null) => void
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  return (
    <DashboardContext.Provider value={{ data, selectedDate, setData, setSelectedDate }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside provider')
  return ctx
}
