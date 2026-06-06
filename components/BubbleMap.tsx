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

const ZOOM_THRESHOLD = 14

const REFUSAL_LABEL: Record<string, string> = {
  NOT_DECISION_MAKER: 'Not the decision maker',
  RELIGIOUS_BELIEFS: 'Religious beliefs',
  VACCINE_SIDE_EFFECTS: 'Concerns about side effects',
  AFRICA_IS_POLIO_FREE: 'Believes Africa is polio-free',
  TOO_MANY_DOSES: 'Too many doses',
  CHILD_WAS_SICK: 'Child was sick',
  CONCERNS_ABOUT_NOPV: 'Concerns about nOPV2',
  CONCERNS_ABOUT_COVID19: 'COVID-19 concerns',
}

// ── Coverage thresholds ──────────────────────────────────────────────────────
function coverageInfo(pct: number) {
  if (pct >= 60) return { color: '#2E7D32', label: '≥ 60% — On track' }
  if (pct >= 40) return { color: '#F9A825', label: '≥ 40% — Active' }
  if (pct >= 20) return { color: '#E65100', label: '≥ 20% — Low' }
  return { color: '#C62828', label: '< 20% — Critical' }
}

// ── Bubble icon factory (cached) ─────────────────────────────────────────────
const _iconCache = new Map<string, L.DivIcon>()
function makeBubbleIcon(abbrev: string, covPct: number, records: number, color: string) {
  const key = `${abbrev}|${covPct.toFixed(1)}|${records}|${color}`
  if (_iconCache.has(key)) return _iconCache.get(key)!
  const r = Math.max(26, Math.min(62, Math.sqrt(records) * 3.4))
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

function FlyTo({ target }: { target: { pos: [number, number]; id: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo(target.pos, Math.max(map.getZoom(), ZOOM_THRESHOLD), { duration: 0.8 })
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
  const [flyTarget, setFlyTarget] = useState<{ pos: [number, number]; id: number } | null>(null)
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
    return data.enumeration.map(r => {
      const covPct = r.pct_complete
      const { color } = coverageInfo(covPct)
      return {
        name: r.facility_name,
        records: r.households_registered,
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
    setSelectedFac(name)
    const pos = centroids.get(name)
    if (pos) setFlyTarget(prev => ({ pos, id: (prev?.id ?? 0) + 1 }))
  }

  function handleClear() {
    setSelectedFac(null)
    setFlyTarget(null)
  }

  const LEGEND_TIERS = isPublic
    ? [{ color: '#009FDB', label: 'Health facility' }]
    : [
        { color: '#2E7D32', label: '≥ 60% — On track' },
        { color: '#F9A825', label: '≥ 40% — Active' },
        { color: '#E65100', label: '≥ 20% — Low' },
        { color: '#C62828', label: '< 20% — Critical' },
      ]

  const activeDotLegend = useMemo(() => {
    const items: { color: string; label: string }[] = []
    if (showHouseholds) items.push({ color: isPublic ? '#009FDB' : '#ef4444', label: 'Household' })
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
                    <div className="text-[10px] text-gray-400 mt-0.5">records</div>
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
          <MapContainer center={[12.105, 15.07]} zoom={12} className="absolute inset-0" style={{ zIndex: 0 }}>
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
              const fill = isPublic ? '#009FDB' : (loc.vaccinated ? '#22c55e' : '#ef4444')
              const stroke = isPublic ? '#0077a8' : (loc.vaccinated ? '#16a34a' : '#dc2626')
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
          <div className="absolute top-3 left-3 z-[800] bg-white/97 border border-gray-200 rounded-xl shadow-md overflow-hidden" style={{ minWidth: 196, maxHeight: 420, overflowY: 'auto' }}>

            {/* Households row */}
            <LayerRow
              color={isPublic ? '#009FDB' : '#ef4444'}
              label="Households"
              count={data?.gps.length}
              active={showHouseholds}
              onToggle={() => setShowHouseholds(v => !v)}
            />

            {/* Refusals row + reason sub-filters */}
            <LayerRow
              color="#C62828"
              label="Refusals"
              count={data?.gps_refusals?.length}
              active={showRefusals}
              onToggle={toggleReasons}
            />
            {showRefusals && (
              <div className="bg-red-50/60 border-t border-red-100/60 px-3 py-2 space-y-1">
                {Object.entries(refusalReasonCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <SubCheck
                      key={reason}
                      checked={isReasonChecked(reason)}
                      label={REFUSAL_LABEL[reason] ?? reason}
                      count={count}
                      color="#C62828"
                      onToggle={() => toggleReason(reason)}
                    />
                  ))}
              </div>
            )}

            {/* Zero Dose row + status sub-filters */}
            <LayerRow
              color="#F9A825"
              label="Zero Dose"
              count={data?.gps_zerodose?.length}
              active={showZerodose}
              onToggle={toggleZerodose}
            />
            {showZerodose && (
              <div className="bg-amber-50/60 border-t border-amber-100/60 px-3 py-2 space-y-1">
                <SubCheck
                  checked={isZdStatusChecked('not_vaccinated')}
                  label="Not yet vaccinated"
                  count={zeroDoseStatusCounts.not_vaccinated}
                  color="#C62828"
                  onToggle={() => toggleZdStatus('not_vaccinated')}
                />
                <SubCheck
                  checked={isZdStatusChecked('vaccinated')}
                  label="Vaccinated ✓"
                  count={zeroDoseStatusCounts.vaccinated}
                  color="#16a34a"
                  onToggle={() => toggleZdStatus('vaccinated')}
                />
              </div>
            )}
          </div>

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

// ── Layer panel sub-components ───────────────────────────────────────────────

function LayerRow({ color, label, count, active, onToggle }: {
  color: string; label: string; count?: number; active: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-100 focus-visible:ring-2 focus-visible:ring-[#009FDB] ${active ? 'bg-white' : 'bg-gray-50/60'}`}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/50 shadow-sm transition-colors"
        style={{ background: active ? color : '#d1d5db' }} />
      <span className={`text-xs font-semibold flex-1 ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
      {count != null && (
        <span className={`text-[10px] ${active ? 'text-gray-400' : 'text-gray-300'}`}>{count.toLocaleString()}</span>
      )}
      <span className={`text-[10px] font-medium ml-1 ${active ? 'text-gray-500' : 'text-gray-300'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

function SubCheck({ checked, label, count, color, onToggle }: {
  checked: boolean; label: string; count: number; color: string; onToggle: () => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-3 h-3 rounded border-gray-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#009FDB]"
        style={{ accentColor: color }}
      />
      <span className={`text-[10px] flex-1 transition-colors ${checked ? 'text-gray-700' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-[10px] font-semibold tabular-nums ${checked ? 'text-gray-500' : 'text-gray-300'}`}>
        {count}
      </span>
    </label>
  )
}

// ── Hover card sub-components ────────────────────────────────────────────────

function HouseholdCard({ loc, isPublic }: { loc: GpsRow; isPublic: boolean }) {
  const hasVaccData = loc.vaccinated_count != null
  const vaccinated = loc.vaccinated_count ?? 0
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {!isPublic && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {loc.member_count != null && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: hasVaccData ? 5 : 0 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {hasVaccData && (
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: vaccinated > 0 ? '#16a34a' : '#C62828',
          borderTop: '1px solid #f1f5f9', paddingTop: 5,
        }}>
          {vaccinated > 0 ? `✓ ${vaccinated} children vaccinated` : '✗ None vaccinated'}
        </div>
      )}
    </>
  )
}

function RefusalCard({ loc, isPublic }: { loc: GpsRefusalRow; isPublic: boolean }) {
  const reasonLabel = loc.reason_for_refusal
    ? (REFUSAL_LABEL[loc.reason_for_refusal] ?? loc.reason_for_refusal)
    : null
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {!isPublic && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {loc.member_count != null && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: reasonLabel ? 5 : 0 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {reasonLabel && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#C62828',
          borderTop: '1px solid #fee2e2', paddingTop: 5, marginTop: loc.member_count != null ? 0 : 4,
          whiteSpace: 'normal', lineHeight: 1.35,
        }}>
          {reasonLabel}
        </div>
      )}
    </>
  )
}

function ZeroDoseCard({ loc, isPublic }: { loc: GpsZeroDoseRow; isPublic: boolean }) {
  const vaccinated = loc.administration_status === 'ADMINISTRATION_SUCCESS'
  const ageLabel = loc.age_months != null ? `${Math.round(loc.age_months)} months` : null
  const genderLabel = loc.gender
    ? loc.gender.charAt(0).toUpperCase() + loc.gender.slice(1).toLowerCase()
    : null
  const ageLine = [ageLabel, genderLabel].filter(Boolean).join(' · ')
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {!isPublic && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {ageLine && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>{ageLine}</div>
      )}
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: vaccinated ? '#16a34a' : '#C62828',
        borderTop: '1px solid #f1f5f9', paddingTop: 5,
      }}>
        {vaccinated ? '✓ Vaccinated' : '✗ Not yet vaccinated'}
      </div>
    </>
  )
}
