'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDashboard } from '@/lib/dashboard-context'

function dotColors(vaccinated: boolean) {
  if (vaccinated) return { color: '#16a34a', fillColor: '#22c55e' }
  return { color: '#dc2626', fillColor: '#ef4444' }
}

const ADM1_STYLE: PathOptions = { color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '6 3' }
const ADM2_STYLE: PathOptions = { color: '#94a3b8', weight: 0.8, fillOpacity: 0.04, fillColor: '#e2e8f0' }
const ADM2_HOVER: PathOptions = { color: '#1e40af', weight: 1.5, fillOpacity: 0.12, fillColor: '#bfdbfe' }

function onEachADM2(feature: GeoJSON.Feature, layer: Layer) {
  const name = feature.properties?.District ?? feature.properties?.RegName ?? ''
  const region = feature.properties?.RegName ?? ''
  if ('setStyle' in layer) {
    const path = layer as L.Path
    layer.on({
      mouseover() {
        path.setStyle(ADM2_HOVER)
        path.bringToFront()
      },
      mouseout() {
        path.setStyle(ADM2_STYLE)
      },
    })
  }
  if (name) {
    (layer as L.Layer & { bindTooltip: (s: string, o?: object) => void }).bindTooltip(
      `<strong>${name}</strong>${region && name !== region ? `<br/><span style="color:#64748b">${region}</span>` : ''}`,
      { sticky: true, className: 'leaflet-boundary-tooltip' }
    )
  }
}

export function CampaignMap() {
  const { data } = useDashboard()
  const [adm1, setAdm1] = useState<GeoJsonObject | null>(null)
  const [adm2, setAdm2] = useState<GeoJsonObject | null>(null)

  useEffect(() => {
    fetch('/adm1.geojson').then(r => r.json()).then(setAdm1).catch(() => null)
    fetch('/adm2.geojson').then(r => r.json()).then(setAdm2).catch(() => null)
  }, [])

  if (!data) return (
    <div className="h-[520px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
      Loading map data…
    </div>
  )

  const locs = data.gps

  return (
    <MapContainer center={[12.1048, 15.0445]} zoom={12} className="h-[520px] w-full rounded-lg z-0" style={{ zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

      {adm2 && (
        <GeoJSON key="adm2" data={adm2} style={() => ADM2_STYLE} onEachFeature={onEachADM2} />
      )}
      {adm1 && (
        <GeoJSON key="adm1" data={adm1} style={() => ADM1_STYLE} />
      )}

      {locs.map((loc, i) => {
        const { color, fillColor } = dotColors(loc.vaccinated)
        return (
          <CircleMarker key={i} center={[loc.lat, loc.lng]} radius={5}
            pathOptions={{ color, fillColor, fillOpacity: 0.7, weight: 1 }}>
            <Popup>
              <strong>{loc.facility_name}</strong><br />
              Type: {loc.record_type}<br />
              Vaccinated: {loc.vaccinated ? 'Yes' : 'No'}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
