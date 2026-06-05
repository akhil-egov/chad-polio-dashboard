'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useDashboard } from '@/lib/dashboard-context'

type DotStatus = 'vaccinated' | 'revisit' | 'enumerated'

function dotColors(status: DotStatus) {
  if (status === 'vaccinated') return { color: '#16a34a', fillColor: '#22c55e' }
  if (status === 'revisit')    return { color: '#d97706', fillColor: '#f59e0b' }
  return                              { color: '#dc2626', fillColor: '#ef4444' }
}

export function CampaignMap() {
  const { locations, locationsLoading, selectedDate } = useDashboard()

  if (locationsLoading) return (
    <div className="h-[420px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
      Loading map data…
    </div>
  )

  const locs = selectedDate
    ? locations.filter(l => l.date === selectedDate)
    : locations

  return (
    <MapContainer center={[12.1048, 15.0445]} zoom={12} className="h-[420px] w-full rounded-lg z-0" style={{ zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {locs.map((loc, i) => {
        const status = (loc.status as DotStatus) ?? 'enumerated'
        const { color, fillColor } = dotColors(status)
        return (
          <CircleMarker key={i} center={[loc.latitude, loc.longitude]} radius={5}
            pathOptions={{ color, fillColor, fillOpacity: 0.7, weight: 1 }}>
            <Popup>
              <strong>{loc.health_facility}</strong><br />
              User: {loc.user_name}<br />
              Status: {loc.status}<br />
              Date: {loc.date}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
