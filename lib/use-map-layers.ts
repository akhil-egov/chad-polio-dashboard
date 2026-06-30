import { useState } from 'react'

export function useMapLayers() {
  const [showFacilities, setShowFacilities] = useState(true)
  const [showHouseholds, setShowHouseholds] = useState(true)
  const [showRefusals, setShowRefusals] = useState(false)
  const [showZerodose, setShowZerodose] = useState(false)
  const [showClosedHousehold, setShowClosedHousehold] = useState(false)

  return {
    showFacilities,
    setShowFacilities,
    toggleFacilities: () => setShowFacilities(v => !v),
    showHouseholds,
    setShowHouseholds,
    toggleHouseholds: () => setShowHouseholds(v => !v),
    showRefusals,
    setShowRefusals,
    toggleRefusals: () => setShowRefusals(v => !v),
    showZerodose,
    setShowZerodose,
    toggleZerodose: () => setShowZerodose(v => !v),
    showClosedHousehold,
    setShowClosedHousehold,
    toggleClosedHousehold: () => setShowClosedHousehold(v => !v),
  }
}

export type MapLayers = ReturnType<typeof useMapLayers>
