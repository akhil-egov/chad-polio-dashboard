'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useDashboard } from '@/lib/dashboard-context'

export function CampaignMap() {
  const { data, selectedDate } = useDashboard()
  if (!data) return <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Upload data to view map</div>

  const locs = selectedDate ? data.householdLocations.filter(l => l.date === selectedDate) : data.householdLocations

  return (
    <MapContainer center={[12.1048, 15.0445]} zoom={12} className="h-96 w-full rounded-lg z-0" style={{ zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {locs.map((loc, i) => (
        <CircleMarker key={i} center={[loc.latitude, loc.longitude]} radius={5}
          pathOptions={{ color: loc.status === 'vaccinated' ? '#16a34a' : '#dc2626', fillColor: loc.status === 'vaccinated' ? '#22c55e' : '#ef4444', fillOpacity: 0.7, weight: 1 }}>
          <Popup>
            <strong>{loc.health_facility}</strong><br />
            User: {loc.user_name}<br />
            Status: {loc.status}<br />
            Date: {loc.date}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
