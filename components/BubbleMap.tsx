'use client'
import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import type { PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { IconArrowLeft } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { DateFilter } from '@/components/DateFilter'
import type { GpsRow, GpsRefusalRow, GpsZeroDoseRow } from '@/lib/types'
import { LayerPanel } from '@/components/map/LayerPanel'
import { HouseholdCard, RefusalCard, ZeroDoseCard } from '@/components/map/HoverCards'

const ZOOM_THRESHOLD = 14

// ── Coverage thresholds ──────────────────────────────────────────────────────
function coverageInfo(pct: number) {
  if (pct >= 70) return { color: '#2E7D32', label: '≥ 70% — On track' }
  if (pct >= 40) return { color: '#F9A825', label: '≥ 40% — Active' }
  return { color: '#C62828', label: '< 40% — Critical' }
}

// ── Bubble icon factory (cached) ─────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [12.105, 15.07]
const DEFAULT_ZOOM = 12

const _iconCache = new Map<string, L.DivIcon>()
function makeBubbleIcon(abbrev: string, covPct: number, records: number, color: string) {
  const key = `${abbrev}|${covPct.toFixed(1)}|${records}|${color}`
  if (_iconCache.has(key)) return _iconCache.get(key)!
  const r = Math.max(24, Math.min(56, Math.sqrt(records / 10) * 3.2))
  const sz = Math.round(r * 2)
  const fs1 = sz > 56 ? 10 : 9
  const fs2 = sz > 56 ? 13 : 11
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 12px rgba(0,0,0,0.28);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;"><div style="font-size:${fs1}px;font-weight:700;color:rgba(255,255,255,0.92);line-height:1.1;text-align:center;padding:0 3px;white-space:nowrap;">${abbrev}</div><div style="font-size:${fs2}px;font-weight:800;color:#fff;margin-top:1px;letter-spacing:-.3px;">${covPct.toFixed(1)}%</div></div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
  })
  _iconCache.set(key, icon)
  return icon
}

// ── Boundary styles ──────────────────────────────────────────────────────────
const ADM1_STYLE: PathOptions = { color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '6 3' }
const ADM2_STYLE: PathOptions = { color: '#94a3b8', weight: 0.8, fillOpacity: 0.03, fillColor: '#e2e8f0' }
const ADM2_HOVER: PathOptions = { color: '#1e40af', weight: 1.5, fillOpacity: 0.12, fillColor: '#bfdbfe' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onEachADM2(_feature: any, layer: L.Layer) {
  if ('setStyle' in layer) {
    const path = layer as L.Path
    layer.on({
      mouseover() { path.setStyle(ADM2_HOVER); path.bringToFront() },
      mouseout() { path.setStyle(ADM2_STYLE) },
    })
  }
}

// ── Typed dot union ──────────────────────────────────────────────────────────
type AnyDot =
  | { type: 'household'; row: GpsRow }
  | { type: 'refusal'; row: GpsRefusalRow }
  | { type: 'zerodose'; row: GpsZeroDoseRow }

type HoveredDot = { dot: AnyDot; x: number; y: number }

// ── Map sub-components ───────────────────────────────────────────────────────
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: e => onZoom((e.target as L.Map).getZoom()) })
  return null
}

function FlyTo({ target }: { target: { pos: [number, number]; id: number; zoom?: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    const z = target.zoom ?? Math.max(map.getZoom(), ZOOM_THRESHOLD)
    map.flyTo(target.pos, z, { duration: 0.8 })
  }, [target, map])
  return null
}

// Canvas renderer incompatibility with Leaflet Tooltip/Popup — use pixel-distance
// scan instead. Dots ordered household → zerodose → refusal so refusal wins on overlap.
function DotHoverTracker({ dots, zoom, onHover }: {
  dots: AnyDot[]
  zoom: number
  onHover: (dot: HoveredDot | null) => void
}) {
  const map = useMap()
  useMapEvents({
    mousemove(e) {
      if (zoom < ZOOM_THRESHOLD) { onHover(null); return }
      const mp = e.containerPoint
      let nearest: AnyDot | null = null
      let minDist = 14
      for (const dot of dots) {
        const pt = map.latLngToContainerPoint([dot.row.lat, dot.row.lng])
        const d = Math.sqrt((pt.x - mp.x) ** 2 + (pt.y - mp.y) ** 2)
        if (d <= minDist) { minDist = d; nearest = dot }
      }
      if (nearest) {
        const pt = map.latLngToContainerPoint([nearest.row.lat, nearest.row.lng])
        onHover({ dot: nearest, x: pt.x, y: pt.y })
      } else {
        onHover(null)
      }
    },
    mouseout() { onHover(null) },
    dragstart() { onHover(null) },
  })
  return null
}

// ── Main component ───────────────────────────────────────────────────────────
export function BubbleMap({ onBack }: { onBack: () => void }) {
  const { data, mode, t } = useDashboard()
  const isPublic = mode === 'public'

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), [])

  const [zoom, setZoom] = useState(12)
  const [selectedFac, setSelectedFac] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ pos: [number, number]; id: number; zoom?: number } | null>(null)
  const [adm1, setAdm1] = useState<GeoJsonObject | null>(null)
  const [adm2, setAdm2] = useState<GeoJsonObject | null>(null)
  const [satOn, setSatOn] = useState(false)
  const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null)

  // Layer toggles
  const [showHouseholds, setShowHouseholds] = useState(true)
  const [showRefusals, setShowRefusals] = useState(false)
  const [showZerodose, setShowZerodose] = useState(false)

  // Sub-filters: null = all selected
  const [selectedReasons, setSelectedReasons] = useState<Set<string> | null>(null)
  const [selectedZdStatuses, setSelectedZdStatuses] = useState<Set<string> | null>(null)

  useEffect(() => {
    fetch('/adm1.geojson').then(r => r.json()).then(setAdm1).catch(() => null)
    fetch('/adm2.geojson').then(r => r.json()).then(setAdm2).catch(() => null)
  }, [])

  // ── Counts for sub-filter labels ────────────────────────────────────────────
  const refusalReasonCounts = useMemo(() => {
    if (!data?.gps_refusals) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const r of data.gps_refusals) {
      const k = r.reason_for_refusal ?? 'UNKNOWN'
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, [data])

  const allReasonKeys = useMemo(() => Object.keys(refusalReasonCounts), [refusalReasonCounts])

  const zeroDoseStatusCounts = useMemo(() => {
    if (!data?.gps_zerodose) return { vaccinated: 0, not_vaccinated: 0 }
    const c = { vaccinated: 0, not_vaccinated: 0 }
    for (const z of data.gps_zerodose) {
      if (z.administration_status === 'ADMINISTRATION_SUCCESS') c.vaccinated++
      else c.not_vaccinated++
    }
    return c
  }, [data])

  // ── Toggle handlers ─────────────────────────────────────────────────────────
  function toggleReasons() { setShowRefusals(v => !v) }
  function toggleZerodose() { setShowZerodose(v => !v) }

  function toggleReason(reason: string) {
    setSelectedReasons(prev => {
      const current = prev ?? new Set(allReasonKeys)
      const next = new Set(current)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next.size === allReasonKeys.length ? null : next
    })
  }

  function isReasonChecked(reason: string) {
    return selectedReasons === null || selectedReasons.has(reason)
  }

  function toggleZdStatus(key: string) {
    setSelectedZdStatuses(prev => {
      const current = prev ?? new Set(['vaccinated', 'not_vaccinated'])
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next.size === 2 ? null : next
    })
  }

  function isZdStatusChecked(key: string) {
    return selectedZdStatuses === null || selectedZdStatuses.has(key)
  }

  // ── Visible dot sets ────────────────────────────────────────────────────────
  const centroids = useMemo(() => {
    if (!data) return new Map<string, [number, number]>()
    const acc = new Map<string, { latSum: number; lngSum: number; n: number }>()
    for (const loc of data.gps) {
      if (!acc.has(loc.facility_name)) acc.set(loc.facility_name, { latSum: 0, lngSum: 0, n: 0 })
      const c = acc.get(loc.facility_name)!
      c.latSum += loc.lat; c.lngSum += loc.lng; c.n++
    }
    const out = new Map<string, [number, number]>()
    for (const [fac, { latSum, lngSum, n }] of acc) out.set(fac, [latSum / n, lngSum / n])
    return out
  }, [data])

  const facilities = useMemo(() => {
    if (!data) return []
    const microplanByFac = new Map(data.microplan.map(r => [r.facility_name, r.microplan_target]))
    return data.enumeration.map(r => {
      const covPct = r.pct_complete
      const { color } = coverageInfo(covPct)
      const target = microplanByFac.get(r.facility_name) ?? r.households_registered
      return {
        name: r.facility_name,
        records: target,
        covPct,
        color: isPublic ? '#009FDB' : color,
        abbrev: r.facility_name.replace(/^CS\s+/i, ''),
      }
    }).sort((a, b) => a.covPct - b.covPct)
  }, [data, isPublic])

  const visibleBubbles = selectedFac ? facilities.filter(f => f.name === selectedFac) : facilities

  const visibleHouseholds = useMemo(() => {
    if (!data || !showHouseholds) return []
    let locs = data.gps
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    return locs
  }, [data, selectedFac, showHouseholds])

  const visibleRefusals = useMemo(() => {
    if (!data || !showRefusals) return []
    let locs = data.gps_refusals ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedReasons !== null) locs = locs.filter(l => selectedReasons.has(l.reason_for_refusal ?? 'UNKNOWN'))
    return locs
  }, [data, selectedFac, showRefusals, selectedReasons])

  const visibleZerodose = useMemo(() => {
    if (!data || !showZerodose) return []
    let locs = data.gps_zerodose ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedZdStatuses !== null) {
      locs = locs.filter(l => {
        const key = l.administration_status === 'ADMINISTRATION_SUCCESS' ? 'vaccinated' : 'not_vaccinated'
        return selectedZdStatuses.has(key)
      })
    }
    return locs
  }, [data, selectedFac, showZerodose, selectedZdStatuses])

  // Combined for hover scanner — ordered so refusal wins on overlap
  const allDots = useMemo<AnyDot[]>(() => [
    ...visibleHouseholds.map(row => ({ type: 'household' as const, row })),
    ...visibleZerodose.map(row => ({ type: 'zerodose' as const, row })),
    ...visibleRefusals.map(row => ({ type: 'refusal' as const, row })),
  ], [visibleHouseholds, visibleZerodose, visibleRefusals])

  const totalVisible = visibleHouseholds.length + visibleRefusals.length + visibleZerodose.length

  function handleSelect(name: string) {
    if (name === selectedFac) { handleClear(); return }
    setSelectedFac(name)
    const pos = centroids.get(name)
    if (pos) setFlyTarget(prev => ({ pos, id: (prev?.id ?? 0) + 1 }))
  }

  function handleClear() {
    setSelectedFac(null)
    setFlyTarget({ pos: DEFAULT_CENTER, id: Date.now(), zoom: DEFAULT_ZOOM })
  }

  const LEGEND_TIERS = isPublic
    ? [{ color: '#009FDB', label: 'Health facility' }]
    : [
        { color: '#2E7D32', label: '≥ 70% — On track' },
        { color: '#F9A825', label: '≥ 40% — Active' },
        { color: '#C62828', label: '< 40% — Critical' },
      ]

  const activeDotLegend = useMemo(() => {
    const items: { color: string; label: string }[] = []
    if (showHouseholds && isPublic) items.push({ color: '#009FDB', label: 'Household' })
    if (showHouseholds && !isPublic) {
      items.push({ color: '#22c55e', label: 'Household — vaccinated' })
      items.push({ color: '#64748b', label: 'Household — not yet' })
    }
    if (showRefusals) items.push({ color: '#C62828', label: `Refusal (${visibleRefusals.length})` })
    if (showZerodose) items.push({ color: '#F9A825', label: `Zero Dose (${visibleZerodose.length})` })
    return items
  }, [showHouseholds, showRefusals, showZerodose, isPublic, visibleRefusals.length, visibleZerodose.length])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>

      {/* ── Header ── */}
      <div className="h-[52px] flex-shrink-0 flex items-center justify-between px-5 border-b border-gray-200 bg-white z-10 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 shrink-0 transition-colors">
            <IconArrowLeft size={16} /> {t('← Back').replace('← ', '')}
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <span className="bg-blue-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shrink-0 tracking-wide">WHO AFRO</span>
          <span className="text-sm font-semibold whitespace-nowrap">Chad Polio SIA · Enumeration Dashboard</span>
          <span className="text-xs text-gray-400 whitespace-nowrap hidden md:block">N&apos;Djamena · Jun 2026</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <DateFilter hideLabel />
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 whitespace-nowrap">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-green-700 mr-1.5" />
            {data?._metadata.run_timestamp
              ? new Date(data._metadata.run_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Africa/Ndjamena' })
              : '—'} · {data?.gps.length.toLocaleString()} records
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-[290px] flex-shrink-0 flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Call list</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Worst coverage first · click to isolate</div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
            {facilities.map(fac => {
              const sel = selectedFac === fac.name
              return (
                <div
                  key={fac.name}
                  onClick={() => handleSelect(fac.name)}
                  className={`flex items-stretch cursor-pointer border-b border-gray-50 h-14 transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex-shrink-0 transition-all" style={{ background: fac.color, width: sel ? '6px' : '4px' }} />
                  <div className="flex-1 px-3 py-2 min-w-0 flex flex-col justify-center">
                    <div className={`text-[12px] font-semibold truncate ${sel ? 'text-blue-700' : 'text-gray-800'}`}>{fac.name}</div>
                    <div className="text-[12px] font-semibold mt-0.5" style={{ color: fac.color }}>
                      {fac.covPct.toFixed(1)}% <span className="text-gray-400 font-normal text-[10px]">coverage</span>
                    </div>
                  </div>
                  <div className="px-3 py-2 text-right flex flex-col justify-center flex-shrink-0">
                    <div className="text-[13px] font-semibold text-gray-800">{fac.records.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">target pop.</div>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedFac && (
            <div className="flex-shrink-0 border-t border-gray-200">
              <button onClick={handleClear} className="w-full h-10 bg-white hover:bg-gray-50 text-sm text-blue-700 font-medium transition-colors">
                ✕ Show all facilities
              </button>
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative min-w-0">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="absolute inset-0" style={{ zIndex: 0 }}>
            <TileLayer
              key={satOn ? 'sat' : 'osm'}
              url={satOn
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution={satOn ? '&copy; Esri' : '&copy; OpenStreetMap contributors'}
            />

            {adm2 && <GeoJSON key="adm2" data={adm2} style={() => ADM2_STYLE} onEachFeature={onEachADM2} />}
            {adm1 && <GeoJSON key="adm1" data={adm1} style={() => ADM1_STYLE} />}

            {zoom < ZOOM_THRESHOLD && visibleBubbles.map(fac => {
              const pos = centroids.get(fac.name)
              if (!pos) return null
              return (
                <Marker key={fac.name} position={pos} icon={makeBubbleIcon(fac.abbrev, fac.covPct, fac.records, fac.color)}
                  eventHandlers={{ click: () => handleSelect(fac.name) }}>
                  <Popup>
                    <div style={{ minWidth: 160, fontFamily: 'system-ui, sans-serif' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#003F72', marginBottom: 6 }}>{fac.name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                        <b style={{ color: '#009FDB' }}>{fac.covPct.toFixed(1)}%</b> coverage
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{fac.records.toLocaleString()} households</div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Household dots — neutralised in public mode */}
            {zoom >= ZOOM_THRESHOLD && visibleHouseholds.map((loc, i) => {
              const vaccinated = (loc.vaccinated_count ?? 0) > 0
              const fill = isPublic ? '#009FDB' : (vaccinated ? '#22c55e' : '#64748b')
              const stroke = isPublic ? '#0077a8' : (vaccinated ? '#16a34a' : '#475569')
              return (
                <CircleMarker key={`h-${i}`} center={[loc.lat, loc.lng]} radius={6}
                  renderer={canvasRenderer}
                  pathOptions={{ color: stroke, fillColor: fill, fillOpacity: 0.8, weight: 1 }}
                />
              )
            })}

            {/* Refusal dots — always #C62828, both modes */}
            {zoom >= ZOOM_THRESHOLD && visibleRefusals.map((loc, i) => (
              <CircleMarker key={`r-${i}`} center={[loc.lat, loc.lng]} radius={7}
                renderer={canvasRenderer}
                pathOptions={{ color: '#8B0000', fillColor: '#C62828', fillOpacity: 0.92, weight: 1.5 }}
              />
            ))}

            {/* Zero-dose dots — always #F9A825, both modes */}
            {zoom >= ZOOM_THRESHOLD && visibleZerodose.map((loc, i) => (
              <CircleMarker key={`z-${i}`} center={[loc.lat, loc.lng]} radius={7}
                renderer={canvasRenderer}
                pathOptions={{ color: '#B37A00', fillColor: '#F9A825', fillOpacity: 0.92, weight: 1.5 }}
              />
            ))}

            <DotHoverTracker dots={allDots} zoom={zoom} onHover={setHoveredDot} />
            <ZoomWatcher onZoom={setZoom} />
            <FlyTo target={flyTarget} />
          </MapContainer>

          {/* ── Hover card ── */}
          {hoveredDot && zoom >= ZOOM_THRESHOLD && (
            <div style={{
              position: 'absolute',
              left: hoveredDot.x,
              top: hoveredDot.y,
              transform: 'translate(-50%, calc(-100% - 12px))',
              zIndex: 900,
              pointerEvents: 'none',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
              fontFamily: 'system-ui, sans-serif',
              minWidth: 160,
              maxWidth: 220,
              whiteSpace: 'nowrap',
            }}>
              {hoveredDot.dot.type === 'household' && <HouseholdCard loc={hoveredDot.dot.row} isPublic={isPublic} />}
              {hoveredDot.dot.type === 'refusal' && <RefusalCard loc={hoveredDot.dot.row} isPublic={isPublic} />}
              {hoveredDot.dot.type === 'zerodose' && <ZeroDoseCard loc={hoveredDot.dot.row} isPublic={isPublic} />}
            </div>
          )}

          {/* ── Layer panel ── */}
          <LayerPanel
            data={data}
            isPublic={isPublic}
            showHouseholds={showHouseholds}
            showRefusals={showRefusals}
            showZerodose={showZerodose}
            selectedReasons={selectedReasons}
            selectedZdStatuses={selectedZdStatuses}
            refusalReasonCounts={refusalReasonCounts}
            zeroDoseStatusCounts={zeroDoseStatusCounts}
            onToggleHouseholds={() => setShowHouseholds(v => !v)}
            onToggleRefusals={toggleReasons}
            onToggleZerodose={toggleZerodose}
            onToggleReason={toggleReason}
            onToggleZdStatus={toggleZdStatus}
            isReasonChecked={isReasonChecked}
            isZdStatusChecked={isZdStatusChecked}
            onSelectAllReasons={() => setSelectedReasons(null)}
            onSelectAllZdStatuses={() => setSelectedZdStatuses(null)}
          />

          {/* Stats bar */}
          <div className="absolute top-3 right-14 z-[800] flex gap-1.5 pointer-events-none">
            <div className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 shadow-sm whitespace-nowrap">
              <b>{totalVisible.toLocaleString()}</b> records visible
            </div>
          </div>

          {/* Satellite toggle */}
          <div className="absolute top-3 right-3 z-[800]">
            <button
              onClick={() => setSatOn(s => !s)}
              className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              {satOn ? '🗺 Street' : '🛰 Satellite'}
            </button>
          </div>

          {/* Zoom hint */}
          {zoom < ZOOM_THRESHOLD && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[800] bg-white/93 border border-gray-200 rounded-full px-4 py-1 text-xs text-gray-500 shadow pointer-events-none whitespace-nowrap">
              Zoom in to see individual records
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-6 left-3 z-[800] bg-white/96 border border-gray-200 rounded-lg px-3 py-2.5 shadow text-xs min-w-[170px]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Coverage status</div>
            {LEGEND_TIERS.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 mb-1 text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
            {zoom >= ZOOM_THRESHOLD && activeDotLegend.length > 0 && (
              <>
                <hr className="my-1.5 border-gray-100" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">GPS dots</div>
                {activeDotLegend.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 mb-1 text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </>
            )}
            <hr className="my-1.5 border-gray-100" />
            <div className="text-[10px] text-gray-400">Bubble size = records collected</div>
          </div>
        </div>
      </div>
    </div>
  )
}

