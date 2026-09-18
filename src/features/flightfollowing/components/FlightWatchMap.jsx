import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { RISK_COLOUR } from './FlightWatchList'

/**
 * La carte de Flight Watch — `#map`.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING js/06 : MAP INIT l. 243-266 (vue
 * [38, 15] au zoom 4, zoom en haut à gauche, fonds Esri / CARTO dark_all /
 * CARTO voyager, libellés Esri à 0.9 sur le satellite seulement), volets
 * l. 285-289, FIR l. 297-341 (fond or, libellé .fir-label au centre),
 * aérodromes l. 346-359 (pastille r4 or sur fond navy + .apt-label), vol suivi
 * l. 1748-1757 (route #F0A500 · 1.6 · .55 · 2,6 ; icône aircraftSVG 26 px
 * colorée par le niveau, tournée au cap ; infobulle « CS — LEVEL »),
 * sélection l. 1236-1239 (flyTo zoom 6), suivi caméra l. 508-511 et 1604-1608
 * (zoom 7 puis panTo sans animation à chaque position), trafic ADS-B fwSetAdsb
 * l. 1703-1740 (icône bleue 11 px, infobulle, fenêtre).
 *
 * Un appareil ne se dessine que s'il a une position reçue : la référence
 * simulait les positions (A-D14). La liste dit « NO SOURCE » pour les autres.
 */

const BASEMAPS = {
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: 'Esri World Imagery' },
  },
  DARK: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd' },
  },
  STREET: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd' },
  },
}

const LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  options: { maxZoom: 19, opacity: 0.9 },
}

/** aircraftSVG — js/06 l. 381-385. */
function aircraftSVG(color) {
  return `<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 3px rgba(0,0,0,.8))">
    <path d="M12 1 L15 9 L23 13 L23 15.5 L15 13.5 L13.3 21 L16.5 23.2 L16.5 24.5 L12 23.3 L7.5 24.5 L7.5 23.2 L10.7 21 L9 13.5 L1 15.5 L1 13 L9 9 Z"
    fill="${color}" stroke="#0A1628" stroke-width="0.6"/></svg>`
}

/** __adsbIcon — js/06 l. 1706-1711 (own = 18 px vert, tiers = 11 px bleu). */
function adsbIcon(color, track, own) {
  const size = own ? 18 : 11
  return L.divIcon({
    className: 'adsb-ac',
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(${track || 0}deg);transform-origin:center;filter:drop-shadow(0 0 2px #000)">${aircraftSVG(color)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Lat/lon d'une fiche d'aérodrome, quelle que soit la forme de la réponse. */
function coordinatesOf(entry) {
  const airport = entry?.airport ?? entry
  if (!airport || airport.latitude == null || airport.longitude == null) return null
  return { icao: airport.icao, name: airport.name, lat: Number(airport.latitude), lon: Number(airport.longitude) }
}

function rotate(marker, heading) {
  const el = marker.getElement()
  const svg = el && el.querySelector('svg')
  if (svg) svg.style.transform = `rotate(${heading == null ? 0 : heading}deg)`
}

export default function FlightWatchMap({
  flights,
  airports,
  traffic,
  showTraffic,
  basemap,
  layers,
  radarFrame,
  selectedId,
  onSelect,
  following = false,
}) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const baseRef = useRef(null)
  const labelsRef = useRef(null)
  const flightGroupRef = useRef(null)
  const routesRef = useRef(null)
  const aptGroupRef = useRef(null)
  const firGroupRef = useRef(null)
  const adsbGroupRef = useRef(null)
  const radarRef = useRef(null)
  const irRef = useRef(null)
  const markersRef = useRef(new Map())
  const flownRef = useRef(null)

  // Une seule instance Leaflet pour la vie du composant : la recréer à chaque
  // rendu perdrait le zoom et le centrage que l'opérateur vient de choisir.
  useEffect(() => {
    if (mapRef.current || !hostRef.current) return undefined
    const map = L.map(hostRef.current, { zoomControl: true, worldCopyJump: true, minZoom: 2, maxZoom: 14 }).setView(
      [38, 15],
      4,
    )
    map.zoomControl.setPosition('topleft')
    mapRef.current = map

    /* Volets, pour l'ordre d'empilement — js/06 l. 285-289. */
    map.createPane('firPane').style.zIndex = 350
    map.createPane('routePane').style.zIndex = 420
    map.createPane('aptPane').style.zIndex = 440
    map.createPane('acPane').style.zIndex = 460

    labelsRef.current = L.tileLayer(LABELS.url, LABELS.options)
    routesRef.current = L.layerGroup()
    flightGroupRef.current = L.layerGroup([routesRef.current]).addTo(map)
    aptGroupRef.current = L.layerGroup().addTo(map)
    firGroupRef.current = L.layerGroup()
    adsbGroupRef.current = L.layerGroup().addTo(map)

    /* Ce que l'hôte peut atteindre — js/06 l. 1795. */
    window.__fwMap = map

    // Leaflet mesure son conteneur à la création ; la case de grille n'a sa
    // hauteur qu'après la mise en page.
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(hostRef.current)
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      observer.disconnect()
      map.remove()
      if (window.__fwMap === map) delete window.__fwMap
      mapRef.current = null
      baseRef.current = null
      labelsRef.current = null
      flightGroupRef.current = null
      routesRef.current = null
      aptGroupRef.current = null
      firGroupRef.current = null
      adsbGroupRef.current = null
      markersRef.current.clear()
      flownRef.current = null
    }
  }, [])

  /* Le fond, et les libellés Esri sur le satellite seulement — js/06 l. 271-283. */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const config = BASEMAPS[basemap] ?? BASEMAPS.SATELLITE
    if (baseRef.current) map.removeLayer(baseRef.current)
    baseRef.current = L.tileLayer(config.url, config.options).addTo(map)

    const labels = labelsRef.current
    const wantLabels = layers?.labels !== false && (BASEMAPS[basemap] ?? BASEMAPS.SATELLITE) === BASEMAPS.SATELLITE
    if (wantLabels) {
      if (!map.hasLayer(labels)) labels.addTo(map)
    } else if (map.hasLayer(labels)) {
      map.removeLayer(labels)
    }
  }, [basemap, layers?.labels])

  /* Les aérodromes : pastille et libellé — js/06 l. 346-359. */
  useEffect(() => {
    const group = aptGroupRef.current
    if (!group) return
    group.clearLayers()
    ;(airports ?? []).forEach((entry) => {
      const point = coordinatesOf(entry)
      if (!point) return
      const dot = L.circleMarker([point.lat, point.lon], {
        pane: 'aptPane',
        radius: 4,
        color: '#F0A500',
        weight: 1.5,
        fillColor: '#0A1628',
        fillOpacity: 1,
      }).bindPopup(`<b>${point.icao}</b> — ${point.name ?? ''}`)
      const label = L.marker([point.lat, point.lon], {
        pane: 'aptPane',
        icon: L.divIcon({ className: 'apt-label', html: point.icao, iconSize: [50, 12], iconAnchor: [-6, 4] }),
        interactive: false,
      })
      group.addLayer(dot)
      group.addLayer(label)
    })
  }, [airports])

  /* Les vols suivis : route et marqueur — js/06 l. 1748-1757. */
  useEffect(() => {
    const map = mapRef.current
    const routes = routesRef.current
    const group = flightGroupRef.current
    if (!map || !routes || !group) return

    const byIcao = new Map()
    ;(airports ?? []).forEach((entry) => {
      const point = coordinatesOf(entry)
      if (point) byIcao.set(point.icao, point)
    })

    routes.clearLayers()
    const seen = new Set()
    ;(flights ?? []).forEach((flight) => {
      const from = byIcao.get(flight.depIcao)
      const to = byIcao.get(flight.arrIcao)
      if (from && to) {
        L.polyline(
          [
            [from.lat, from.lon],
            [to.lat, to.lon],
          ],
          { pane: 'routePane', color: '#F0A500', weight: 1.6, opacity: 0.55, dashArray: '2,6' },
        ).addTo(routes)
      }

      const position = flight.lastPosition
      if (!position || position.latitude == null || position.longitude == null) return
      seen.add(flight.legId)
      const latLng = [Number(position.latitude), Number(position.longitude)]
      const colour = RISK_COLOUR[flight.risk?.level] ?? RISK_COLOUR.LOW
      const icon = L.divIcon({ className: '', html: aircraftSVG(colour), iconSize: [26, 26], iconAnchor: [13, 13] })
      const tooltip = `${flight.flightNo} — ${flight.risk?.level ?? 'LOW'}`
      let marker = markersRef.current.get(flight.legId)
      if (marker) {
        marker.setLatLng(latLng)
        marker.setIcon(icon)
        marker.setTooltipContent(tooltip)
      } else {
        marker = L.marker(latLng, { pane: 'acPane', icon, riseOnHover: true })
        marker.on('click', () => onSelect?.(flight.legId))
        marker.bindTooltip(tooltip, { permanent: false, direction: 'top', className: 'apt-label' })
        group.addLayer(marker)
        markersRef.current.set(flight.legId, marker)
      }
      rotate(marker, position.trackDeg)
    })

    // Un vol qui n'est plus suivi disparaît : laisser son symbole reviendrait
    // à afficher une position que plus rien ne confirme.
    markersRef.current.forEach((marker, legId) => {
      if (!seen.has(legId)) {
        group.removeLayer(marker)
        markersRef.current.delete(legId)
      }
    })
  }, [flights, airports, onSelect])

  /* Choisir un vol centre la carte sur lui — selectFlight js/06 l. 1236-1239. */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId || flownRef.current === selectedId) return
    flownRef.current = selectedId
    const flight = (flights ?? []).find((entry) => entry.legId === selectedId)
    if (!flight) return
    let target = null
    const position = flight.lastPosition
    if (position && position.latitude != null && position.longitude != null) {
      target = [Number(position.latitude), Number(position.longitude)]
    } else {
      const from = (airports ?? []).map(coordinatesOf).find((point) => point && point.icao === flight.depIcao)
      if (from) target = [from.lat, from.lon]
    }
    if (target) map.flyTo(target, 6, { duration: 0.8 })
  }, [selectedId, flights, airports])

  /* « FOLLOW THIS FLIGHT ON MAP » : zoom 7 à l'allumage (js/06 l. 1607), puis la
     carte se recentre sur chaque position reçue, sans animation (l. 508-511). */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !following) return
    map.setZoom(7)
  }, [following])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !following || !selectedId) return
    const flight = (flights ?? []).find((entry) => entry.legId === selectedId)
    const position = flight?.lastPosition
    if (!position || position.latitude == null || position.longitude == null) return
    map.panTo([Number(position.latitude), Number(position.longitude)], { animate: false })
  }, [following, selectedId, flights])

  /* Les calques que l'opérateur allume et éteint — LAYER TOGGLES js/06 l. 1612-1625. */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layers) return
    const toggle = (group, on) => {
      if (!group) return
      if (on) {
        if (!map.hasLayer(group)) group.addTo(map)
      } else if (map.hasLayer(group)) {
        map.removeLayer(group)
      }
    }
    toggle(flightGroupRef.current, layers.flights !== false)
    toggle(aptGroupRef.current, layers.airports !== false)
    toggle(firGroupRef.current, layers.fir === true)
    toggle(adsbGroupRef.current, layers.adsb !== false)
  }, [layers])

  /* Les limites FIR/UIR, chargées à la demande — js/06 l. 297-341. */
  useEffect(() => {
    const group = firGroupRef.current
    if (!group || !layers?.fir || group.getLayers().length > 0) return undefined
    let cancelled = false
    fetch('/geo/fir.geojson')
      .then((response) => response.json())
      .then((geo) => {
        if (cancelled || !firGroupRef.current) return
        L.geoJSON(geo, {
          pane: 'firPane',
          style: () => ({ color: '#F0A500', weight: 1, opacity: 0.5, fillColor: '#F0A500', fillOpacity: 0.02 }),
          onEachFeature: (feature, layer) => {
            const icao = feature?.properties?.icao ?? '????'
            layer.bindPopup(`<b>${icao}</b> FIR/UIR`)
            layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.12, weight: 1.6, opacity: 0.9 }))
            layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.02, weight: 1, opacity: 0.5 }))
            group.addLayer(layer)
            try {
              const center = layer.getBounds().getCenter()
              group.addLayer(
                L.marker(center, {
                  pane: 'firPane',
                  icon: L.divIcon({ className: 'fir-label', html: icao, iconSize: [90, 14] }),
                  interactive: false,
                }),
              )
            } catch {
              /* skip label if bounds unavailable */
            }
          },
        })
      })
      .catch(() => {
        // Les limites sont un contexte, pas une position : les perdre ne
        // doit pas retirer les appareils de l'écran.
      })
    return () => {
      cancelled = true
    }
  }, [layers?.fir])

  /* Radar de précipitations et infrarouge RainViewer — js/06 l. 1637-1667. */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (radarRef.current) {
      map.removeLayer(radarRef.current)
      radarRef.current = null
    }
    if (layers?.radar && radarFrame?.radar) {
      radarRef.current = L.tileLayer(radarFrame.radar, { opacity: 0.7, zIndex: 500 }).addTo(map)
    }
    if (irRef.current) {
      map.removeLayer(irRef.current)
      irRef.current = null
    }
    if (layers?.ir && radarFrame?.infrared) {
      irRef.current = L.tileLayer(radarFrame.infrared, { opacity: 0.55, zIndex: 490 }).addTo(map)
    }
  }, [layers?.radar, layers?.ir, radarFrame])

  /* Le trafic ADS-B des autres exploitants — fwSetAdsb js/06 l. 1712-1735. */
  useEffect(() => {
    const group = adsbGroupRef.current
    if (!group) return
    group.clearLayers()
    if (!showTraffic) return
    ;(traffic ?? []).forEach((vector) => {
      if (vector.latitude == null || vector.longitude == null) return
      const colour = '#4DA3FF'
      const callsign = (vector.callsign || vector.modeSHex || '').toString().trim()
      const marker = L.marker([vector.latitude, vector.longitude], {
        pane: 'acPane',
        icon: adsbIcon(colour, vector.trackDeg || 0, false),
        interactive: true,
      })
      const feet = vector.altitudeFt != null ? ` · ${Math.round(vector.altitudeFt / 100) * 100}ft` : ''
      marker.bindTooltip(`${callsign || '?'}${feet}`, { direction: 'top', className: 'apt-label' })
      const popup =
        '<div style="min-width:170px;font:12px system-ui;color:#dce9f7;line-height:1.5;padding:2px">' +
        `<div style="font-weight:800;font-size:13px;margin-bottom:2px">${callsign || '?'} <span style='color:#79b8ff'>TRAFFIC</span></div>` +
        `<div>ICAO24: ${vector.modeSHex || '—'}</div>` +
        (vector.altitudeFt != null ? `<div>Altitude: ${Math.round(vector.altitudeFt)} ft</div>` : '') +
        (vector.groundSpeedKt != null ? `<div>Ground speed: ${Math.round(vector.groundSpeedKt)} kt</div>` : '') +
        (vector.trackDeg != null ? `<div>Track: ${Math.round(vector.trackDeg)}°</div>` : '') +
        `<div>Position: ${Number(vector.latitude).toFixed(3)}, ${Number(vector.longitude).toFixed(3)}</div>` +
        '</div>'
      marker.bindPopup(popup)
      group.addLayer(marker)
    })
  }, [traffic, showTraffic])

  return <div id="map" ref={hostRef} />
}
