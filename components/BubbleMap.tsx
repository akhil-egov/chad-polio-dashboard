'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import type { PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { IconFilter } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useMapState } from '@/lib/use-map-state'
import type { AnyDot } from '@/lib/use-map-state'
import { HouseholdCard, RefusalCard, ZeroDoseCard, ClosedHouseholdCard } from '@/components/map/HoverCards'
import { FilterSidebar } from '@/components/map/FilterSidebar'
import type { FacilityItem } from '@/components/map/FilterSidebar'
import { getVisibility } from '@/lib/visibility'
import { COLORS, REFUSAL_COLOR } from '@/lib/constants'

const ZOOM_THRESHOLD = 14

// ── Bubble icon factory (cached) ─────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [12.105, 15.07]
const DEFAULT_ZOOM = 12

const _iconCache = new Map<string, L.DivIcon>()
function makeBubbleIcon(abbrev: string, covPct: number, records: number, color: string) {
  const key = `${abbrev}|${covPct.toFixed(1)}|${records}|${color}`
  if (_iconCache.has(key)) return _iconCache.get(key)!
  const r = Math.max(24, Math.min(56, Math.sqrt(records / 10) * 3.2))
  const sz = Math.round(r * 2)
  const fs1 = 10
  const fs2 = sz > 56 ? 13 : 11
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 12px rgba(0,0,0,0.28);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;"><div style="font-size:${fs1}px;font-weight:700;color:rgba(255,255,255,0.92);line-height:1.2;text-align:center;padding:0 4px;white-space:normal;word-break:break-word;max-width:${sz - 10}px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${abbrev}</div><div style="font-size:${fs2}px;font-weight:800;color:#fff;margin-top:1px;letter-spacing:-.3px;">${covPct.toFixed(1)}%</div></div>`,
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
export function BubbleMap({ onBack }: { onBack?: () => void }) {
  const { data, mode, t } = useDashboard()
  const vis = getVisibility(mode)

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), [])

  const [zoom, setZoom] = useState(12)
  const [flyTarget, setFlyTarget] = useState<{ pos: [number, number]; id: number; zoom?: number } | null>(null)
  const [adm1, setAdm1] = useState<GeoJsonObject | null>(null)
  const [adm2, setAdm2] = useState<GeoJsonObject | null>(null)
  const [satOn, setSatOn] = useState(false)
  const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const {
    selectedFac,
    handleSelect: selectFac,
    handleClear: clearFac,
    showHouseholds,
    toggleHouseholds,
    showRefusals,
    setShowRefusals,
    toggleRefusals,
    showZerodose,
    setShowZerodose,
    toggleZerodose,
    showClosedHousehold,
    setShowClosedHousehold,
    toggleClosedHousehold,
    visibleClosedHousehold,
    selectedReasons,
    toggleReason,
    isReasonChecked,
    selectAllReasons,
    selectedZdStatuses,
    toggleZdStatus,
    isZdStatusChecked,
    selectAllZdStatuses,
    visibleHouseholds,
    visibleRefusals,
    visibleZerodose,
    allDots,
    refusalReasonCounts,
    zeroDoseStatusCounts,
    totalVisible,
    facilitySearch,
    setFacilitySearch,
    filterCount,
    selectedSettlement,
    setSelectedSettlement,
  } = useMapState(data)

  useEffect(() => {
    fetch('/adm1.geojson').then(r => r.json()).then(setAdm1).catch(() => null)
    fetch('/adm2.geojson').then(r => r.json()).then(setAdm2).catch(() => null)
  }, [])

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

  const facilities = useMemo((): FacilityItem[] => {
    if (!data) return []
    return data.enumeration.map(r => {
      const covPct = r.pct_complete
      return {
        name: r.facility_name,
        records: r.eligible_children,
        covPct,
        color: vis.bubbleColor(covPct),
        abbrev: r.facility_name.replace(/^CS\s+/i, ''),
      }
    }).sort((a, b) => a.covPct - b.covPct)
  }, [data, mode])

  const filteredFacilities = useMemo((): FacilityItem[] => {
    if (!facilitySearch) return facilities
    const q = facilitySearch.toLowerCase()
    return facilities.filter(f => f.name.toLowerCase().includes(q))
  }, [facilities, facilitySearch])

  const visibleBubbles = facilities

  function handleSelect(name: string) {
    if (name === selectedFac) { handleClear(); return }
    selectFac(name)
    const pos = centroids.get(name)
    if (pos) setFlyTarget(prev => ({ pos, id: (prev?.id ?? 0) + 1 }))
  }

  function handleClear() {
    clearFac()
    setFlyTarget({ pos: DEFAULT_CENTER, id: Date.now(), zoom: DEFAULT_ZOOM })
  }

  function handleClearAll() {
    handleClear()
    setShowRefusals(false)
    setShowZerodose(false)
    setShowClosedHousehold(false)
    setSelectedSettlement(null)
  }

  const LEGEND_TIERS = vis.showStatusBadges
    ? [
        { color: COLORS.ON_TRACK, label: '≥ 70% — On track' },
        { color: COLORS.ACTIVE,   label: '≥ 40% — Active' },
        { color: COLORS.CRITICAL, label: '< 40% — Critical' },
      ]
    : [{ color: COLORS.WHO_BLUE, label: 'Health facility' }]

  const activeDotLegend = useMemo(() => {
    const items: { color: string; label: string }[] = []
    if (showHouseholds && !vis.showStatusBadges) items.push({ color: COLORS.WHO_BLUE, label: 'Household' })
    if (showHouseholds && vis.showStatusBadges) {
      items.push({ color: COLORS.VAX_YES, label: 'Household — vaccinated' })
      items.push({ color: COLORS.VAX_NO,  label: 'Household — not yet' })
    }
    if (showRefusals) items.push({ color: '#C62828', label: `Refusal (${visibleRefusals.length})` })
    if (showZerodose) items.push({ color: '#F9A825', label: `Zero Dose (${visibleZerodose.length})` })
    if (showClosedHousehold) items.push({ color: '#7C3AED', label: `Closed (${visibleClosedHousehold.length})` })
    return items
  }, [showHouseholds, showRefusals, showZerodose, mode, visibleRefusals.length, visibleZerodose.length])

  return (
    <div className="flex flex-col w-full h-full bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>

      {/* ── Map body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Filter panel — outside Leaflet so scroll events are never stolen ── */}
        {panelOpen && (
          <div className="w-[220px] flex-shrink-0 h-full border-r border-gray-200 overflow-hidden shadow-sm">
            <FilterSidebar
            facilities={facilities}
            filteredFacilities={filteredFacilities}
            selectedFac={selectedFac}
            onSelect={handleSelect}
            onClearFacility={handleClear}
            onClearAll={handleClearAll}
            onClose={() => setPanelOpen(false)}
            facilitySearch={facilitySearch}
            setFacilitySearch={setFacilitySearch}
            showHouseholds={showHouseholds}
            toggleHouseholds={toggleHouseholds}
            showRefusals={showRefusals}
            toggleRefusals={toggleRefusals}
            showZerodose={showZerodose}
            toggleZerodose={toggleZerodose}
            showClosedHousehold={showClosedHousehold}
            toggleClosedHousehold={toggleClosedHousehold}
            refusalReasonCounts={refusalReasonCounts}
            selectedReasons={selectedReasons}
            isReasonChecked={isReasonChecked}
            toggleReason={toggleReason}
            selectAllReasons={selectAllReasons}
            zeroDoseStatusCounts={zeroDoseStatusCounts}
            selectedZdStatuses={selectedZdStatuses}
            isZdStatusChecked={isZdStatusChecked}
            toggleZdStatus={toggleZdStatus}
            selectAllZdStatuses={selectAllZdStatuses}
            householdsTotal={data?.gps.length}
            refusalsTotal={data?.gps_refusals?.length}
            zerodoseTotal={data?.gps_zerodose?.length}
            closedHouseholdTotal={data?.gps_closed_household?.length}
            filterCount={filterCount}
            dotColor={vis.dotColor}
            selectedSettlement={selectedSettlement}
            onFilterSettlement={setSelectedSettlement}
            />
          </div>
        )}

        {/* ── Map area ── */}
        <div ref={mapContainerRef} className="flex-1 relative overflow-hidden">

        {/* ── Filters pill + active filter chip when panel is closed ── */}
        {!panelOpen && (
          <div className="absolute top-3 left-3 z-[850] flex flex-col gap-1.5 items-start">
            <button
              onClick={() => setPanelOpen(true)}
              className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6]"
            >
              <IconFilter size={13} className="text-gray-500" />
              Filters
              {filterCount > 0 && (
                <span className="bg-[#006EB6] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">{filterCount}</span>
              )}
            </button>

            {filterCount > 0 && (
              <div className="bg-white/95 border border-gray-200 shadow-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5 max-w-[200px]">
                <span className="font-medium text-gray-700 truncate">
                  {selectedFac && filterCount === 1 ? selectedFac : `${filterCount} filters active`}
                </span>
                <button
                  onClick={() => selectedFac && filterCount === 1 ? handleClear() : handleClearAll()}
                  className="text-gray-400 hover:text-gray-700 transition-colors focus-visible:outline-none flex-shrink-0"
                  aria-label="Clear filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

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
                <Marker
                  key={fac.name}
                  position={pos}
                  icon={makeBubbleIcon(fac.abbrev, fac.covPct, fac.records, fac.color)}
                  opacity={selectedFac && fac.name !== selectedFac ? 0.3 : 1}
                  eventHandlers={{ click: () => handleSelect(fac.name) }}
                >
                  <Popup>
                    <div style={{ minWidth: 160, fontFamily: 'system-ui, sans-serif' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#003F72', marginBottom: 6 }}>{fac.name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                        <b style={{ color: '#006EB6' }}>{fac.covPct.toFixed(1)}%</b> coverage
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{fac.records.toLocaleString()} eligible children</div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Household dots — neutralised in public mode */}
            {zoom >= ZOOM_THRESHOLD && visibleHouseholds.map((loc, i) => {
              const vaccinated = (loc.vaccinated_count ?? 0) > 0
              return (
                <CircleMarker key={`h-${i}`} center={[loc.lat, loc.lng]} radius={6}
                  renderer={canvasRenderer}
                  pathOptions={{ color: vis.dotStroke(vaccinated), fillColor: vis.dotColor(vaccinated), fillOpacity: 0.8, weight: 1 }}
                />
              )
            })}

            {/* Refusal dots — color per reason, both modes */}
            {zoom >= ZOOM_THRESHOLD && visibleRefusals.map((loc, i) => {
              const fillColor = REFUSAL_COLOR[loc.reason_for_refusal ?? 'UNKNOWN'] ?? COLORS.REFUSAL
              return (
                <CircleMarker key={`r-${i}`} center={[loc.lat, loc.lng]} radius={7}
                  renderer={canvasRenderer}
                  pathOptions={{ color: fillColor, fillColor, fillOpacity: 0.92, weight: 1.5 }}
                />
              )
            })}

            {/* Zero-dose dots — always #F9A825, both modes */}
            {zoom >= ZOOM_THRESHOLD && visibleZerodose.map((loc, i) => (
              <CircleMarker key={`z-${i}`} center={[loc.lat, loc.lng]} radius={7}
                renderer={canvasRenderer}
                pathOptions={{ color: '#B37A00', fillColor: '#F9A825', fillOpacity: 0.92, weight: 1.5 }}
              />
            ))}

            {/* Closed household dots — purple, both modes */}
            {zoom >= ZOOM_THRESHOLD && visibleClosedHousehold.map((loc, i) => (
              <CircleMarker key={`ch-${i}`} center={[loc.lat, loc.lng]} radius={7}
                renderer={canvasRenderer}
                pathOptions={{ color: '#5B21B6', fillColor: '#7C3AED', fillOpacity: 0.85, weight: 1.5 }}
              />
            ))}

            <DotHoverTracker dots={allDots} zoom={zoom} onHover={setHoveredDot} />
            <ZoomWatcher onZoom={setZoom} />
            <FlyTo target={flyTarget} />
          </MapContainer>

          {/* ── Hover card ── */}
          {hoveredDot && zoom >= ZOOM_THRESHOLD && (() => {
            const mapWidth = mapContainerRef.current?.offsetWidth ?? window.innerWidth
            const x = hoveredDot.x
            const y = hoveredDot.y
            let transform = 'translate(-50%, calc(-100% - 12px))'
            if (x > mapWidth - 160) {
              transform = 'translate(-100%, calc(-100% - 12px))'
            } else if (y < 120) {
              transform = 'translate(-50%, 12px)'
            } else if (x < 235) {
              transform = 'translate(12px, -50%)'
            }
            return (
              <div style={{
                position: 'absolute',
                left: x,
                top: y,
                transform,
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
                {hoveredDot.dot.type === 'household' && <HouseholdCard loc={hoveredDot.dot.row} showTeam={vis.showTeamInHover} />}
                {hoveredDot.dot.type === 'refusal' && <RefusalCard loc={hoveredDot.dot.row} showTeam={vis.showTeamInHover} />}
                {hoveredDot.dot.type === 'zerodose' && <ZeroDoseCard loc={hoveredDot.dot.row} showTeam={vis.showTeamInHover} />}
                {hoveredDot.dot.type === 'closed_household' && <ClosedHouseholdCard loc={hoveredDot.dot.row} showTeam={vis.showTeamInHover} />}
              </div>
            )
          })()}

          {/*
           * Map overlay z-index hierarchy (React divs only — do not touch leaflet-pane classes):
           *   Coverage legend:      z-[800]  — bottom-left, always below panel
           *   Stats bar + sat btn:  z-[810]  — top-right
           *   Hover card:           z-[900]  — topmost, floats over everything
           */}

          {/* Records count pill — top-right, always visible */}
          <div className="absolute top-3 right-3 z-[800] pointer-events-none">
            <div className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 shadow-sm whitespace-nowrap">
              <b>{totalVisible.toLocaleString()}</b> records visible
            </div>
          </div>

          {/* Satellite toggle — bottom-right, above zoom controls */}
          <div className="absolute bottom-16 right-3 z-[800]">
            <button
              onClick={() => setSatOn(s => !s)}
              className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]"
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
          <div className="absolute bottom-6 left-3 z-[800] bg-white/96 border border-gray-200 rounded-lg px-3 py-2.5 shadow text-[13px] min-w-[180px]">
            <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Coverage status</div>
            {LEGEND_TIERS.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 mb-1 text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
            {zoom >= ZOOM_THRESHOLD && activeDotLegend.length > 0 && (
              <>
                <hr className="my-1.5 border-gray-100" />
                <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">GPS dots</div>
                {activeDotLegend.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 mb-1 text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </>
            )}
            <hr className="my-1.5 border-gray-100" />
            <div className="text-[12px] text-gray-400">Bubble size = eligible children (0–59m)</div>
          </div>
        </div>
        </div>
    </div>
  )
}
