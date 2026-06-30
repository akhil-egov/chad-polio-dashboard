import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { DashboardData } from '@/lib/types'

export function useMapNavigation(data: DashboardData | null) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedFac, setSelectedFac] = useState<string | null>(null)
  const [facilitySearch, setFacilitySearch] = useState('')

  useEffect(() => {
    const facilityId = searchParams.get('facility')
    if (!facilityId || !data) return
    const match = data.enumeration.find(r => r.facility_id === facilityId)
    if (match) setSelectedFac(match.facility_name)
  }, [data, searchParams])

  function handleSelect(name: string) {
    const isDeselect = name === selectedFac
    const next = isDeselect ? null : name
    setSelectedFac(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      const match = data?.enumeration.find(r => r.facility_name === name)
      if (match) params.set('facility', match.facility_id)
      else params.delete('facility')
    } else {
      params.delete('facility')
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleClear() {
    setSelectedFac(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('facility')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return { selectedFac, facilitySearch, setFacilitySearch, handleSelect, handleClear }
}

export type MapNavigation = ReturnType<typeof useMapNavigation>
