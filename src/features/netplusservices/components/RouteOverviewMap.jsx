import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAirportDetail } from '../../../hooks/useOperations'

/**
 * ROUTE OVERVIEW — la carte de l'onglet Flight Analysis.
 *
 * Les trois fonds sont ceux du prototype, et ceux que FlightWatchMap utilise
 * deja : Esri World Imagery, CARTO dark, OpenStreetMap. AUCUN N'EXIGE DE
 * JETON — ce sont des services de tuiles publics, interroges par URL. Il n'y
 * a donc rien a renouveler ici : si la carte reste grise, c'est que le poste
 * n'a pas d'acces reseau, pas qu'une cle a expire.
 *
 * L'imagerie satellite ne porte aucun texte : la couche de libelles Esri est
 * posee par-dessus, sinon on regarde une photo et non une carte. C'est le
 * meme raisonnement que dans FlightWatchMap.
 *
 * Le trace depart -> destination est une ORTHODROMIE, pas une route : tant que
 * le moteur de routes n'est pas porte (sprint S9), la carte ne pretend pas
 * afficher un plan de vol. Le trait est donc pointille, et la legende le dit.
 */

const BASEMAPS = {
  SATELLITE: {
    label: 'SATELLITE',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery',
    maxZoom: 18,
    labels:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  DARK: {
    label: 'DARK OPS',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: 'CARTO',
    maxZoom: 19,
    labels: null,
  },
  STREET: {
    label: 'STREET',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    maxZoom: 19,
    labels: null,
  },
}

const RAD = Math.PI / 180

/** Interpolation sur le grand cercle — portee telle quelle du prototype. */
function greatCircle(a, b, steps = 96) {
  const [lat1, lon1] = a
  const [lat2, lon2] = b
  const p1 = lat1 * RAD
  const l1 = lon1 * RAD
  const p2 = lat2 * RAD
  const l2 = lon2 * RAD
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2,
      ),
    )
  if (!d) return [a, b]
  const points = []
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2)
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2)
    const z = A * Math.sin(p1) + B * Math.sin(p2)
    points.push([Math.atan2(z, Math.hypot(x, y)) / RAD, Math.atan2(y, x) / RAD])
  }
  return points
}

/** Distance orthodromique en milles nautiques. */
function greatCircleNm(a, b) {
  const p1 = a[0] * RAD
  const p2 = b[0] * RAD
  const dp = (b[0] - a[0]) * RAD
  const dl = (b[1] - a[1]) * RAD
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 3440.065
}

function endpointIcon(code, colour) {
  return L.divIcon({
    className: 'nps-endpoint',
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;white-space:nowrap">
      <span style="width:11px;height:11px;border-radius:50%;background:${colour};border:2px solid #06121d;display:inline-block"></span>
      <span style="font:700 11px/1 ui-monospace,monospace;color:${colour};text-shadow:0 0 4px #06121d,0 0 3px #06121d">${code}</span>
    </div>`,
  })
}

export default function RouteOverviewMap({ dep, dest, onDistance }) {
  const [base, setBase] = useState('SATELLITE')
  const [layersOpen, setLayersOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showRoute, setShowRoute] = useState(true)

  const holderRef = useRef(null)
  const mapRef = useRef(null)
  const baseRef = useRef(null)
  const labelRef = useRef(null)
  const routeRef = useRef(null)

  const depDetail = useAirportDetail(dep && dep.length === 4 ? dep : '')
  const destDetail = useAirportDetail(dest && dest.length === 4 ? dest : '')

  const depLL = useMemo(() => toLatLon(depDetail.data), [depDetail.data])
  const destLL = useMemo(() => toLatLon(destDetail.data), [destDetail.data])

  // Creation de la carte, une seule fois.
  useEffect(() => {
    if (mapRef.current || !holderRef.current) return undefined
    const map = L.map(holderRef.current, {
      center: [25, 15],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    })
    mapRef.current = map
    routeRef.current = L.layerGroup().addTo(map)
    // Le conteneur est cree avant que la mise en page flex ne soit stabilisee :
    // sans ce recalcul, Leaflet ne charge qu'une bande de tuiles.
    const timers = [60, 250, 600].map((ms) => setTimeout(() => map.invalidateSize(), ms))
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => map.invalidateSize())
        : null
    if (observer) observer.observe(holderRef.current)
    return () => {
      timers.forEach(clearTimeout)
      if (observer) observer.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Fond + libelles.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = BASEMAPS[base]
    if (baseRef.current) baseRef.current.remove()
    baseRef.current = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
    }).addTo(map)
    if (labelRef.current) {
      labelRef.current.remove()
      labelRef.current = null
    }
    if (spec.labels && showLabels) {
      labelRef.current = L.tileLayer(spec.labels, { maxZoom: spec.maxZoom, opacity: 0.9 }).addTo(map)
    }
  }, [base, showLabels])

  // Trace et extremites.
  useEffect(() => {
    const map = mapRef.current
    const group = routeRef.current
    if (!map || !group) return
    group.clearLayers()
    if (depLL) L.marker(depLL, { icon: endpointIcon(dep, '#38d9f0') }).addTo(group)
    if (destLL) L.marker(destLL, { icon: endpointIcon(dest, '#ff4d5e') }).addTo(group)
    if (depLL && destLL && showRoute) {
      L.polyline(greatCircle(depLL, destLL), {
        color: '#38d9f0',
        weight: 2,
        opacity: 0.9,
        dashArray: '6 6',
      }).addTo(group)
      map.fitBounds(L.latLngBounds([depLL, destLL]).pad(0.35), { maxZoom: 6 })
    } else if (depLL || destLL) {
      map.setView(depLL ?? destLL, 4)
    }
  }, [dep, dest, depLL, destLL, showRoute])

  // La distance remonte au mini briefing : elle est mesuree, pas estimee.
  useEffect(() => {
    if (!onDistance) return
    onDistance(depLL && destLL ? Math.round(greatCircleNm(depLL, destLL)) : null)
  }, [depLL, destLL, onDistance])

  const ready = Boolean(depLL && destLL)

  return (
    <>
      <div className="nps__panel-head">
        <span className="nps__panel-title nps__panel-title--plain">Route overview</span>
        <span className="nps__pill">
          {ready ? 'Great circle · not a filed route' : 'Enter departure and destination'}
        </span>
      </div>

      <div className="nps__map-wrap">
        <div className="nps__map" ref={holderRef} />

        <div className="nps__basemap">
          {Object.entries(BASEMAPS).map(([key, spec]) => (
            <button
              key={key}
              type="button"
              className={base === key ? 'is-on' : undefined}
              onClick={() => setBase(key)}
            >
              {spec.label}
            </button>
          ))}
        </div>

        <div className="nps__layers">
          <button
            type="button"
            className={layersOpen ? 'nps__layers-btn is-open' : 'nps__layers-btn'}
            onClick={() => setLayersOpen((open) => !open)}
          >
            ▦ LAYERS
          </button>
          {layersOpen ? (
            <div className="nps__layers-panel">
              <div className="nps__layers-head">MAP LAYERS</div>
              <div className="nps__layers-item">
                <span>🗺 Labels / borders</span>
                <button
                  type="button"
                  aria-label="Labels"
                  className={showLabels ? 'nps__switch is-on' : 'nps__switch'}
                  onClick={() => setShowLabels((on) => !on)}
                />
              </div>
              <div className="nps__layers-item">
                <span>✈ Route line</span>
                <button
                  type="button"
                  aria-label="Route"
                  className={showRoute ? 'nps__switch is-on' : 'nps__switch'}
                  onClick={() => setShowRoute((on) => !on)}
                />
              </div>
            </div>
          ) : null}
        </div>

        {!ready ? (
          <div className="nps__map-empty">
            <div style={{ fontSize: 30, opacity: 0.35 }}>🗺</div>
            <div>Enter departure and destination</div>
          </div>
        ) : null}
      </div>
    </>
  )
}

function toLatLon(detail) {
  const airport = detail?.airport
  if (!airport) return null
  const lat = Number(airport.latitude)
  const lon = Number(airport.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
}
