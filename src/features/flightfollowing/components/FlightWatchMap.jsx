import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * La carte de Flight Watch.
 *
 * Une image satellite nue n'est pas une carte : sans noms de pays, sans
 * aerodromes et sans routes, elle ne repond a aucune question qu'un OCC se
 * pose. Quatre couches sont donc empilees, dans cet ordre :
 *
 *   1. le fond — imagerie Esri, fond sombre ou fond rue ;
 *   2. les libelles — frontieres, pays et villes, en surimpression du
 *      satellite, qui n'en porte aucun ;
 *   3. le reseau de l'exploitant — les aerodromes de refdata.airports avec
 *      leur code OACI, et la route de chaque etape du jour ;
 *   4. les appareils, a leur derniere position connue.
 *
 * Les trois premieres viennent de la base ou du fournisseur de tuiles. La
 * quatrieme ne se dessine que si une position existe : le prototype simulait
 * les appareils sans position, ce qui produisait des symboles en mouvement
 * sans qu'aucun signal n'ait ete recu. Ici, pas de position, pas de symbole —
 * et le pied de carte compte ceux qui manquent.
 */

const BASEMAPS = {
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery',
    maxZoom: 18,
    // L'imagerie satellite ne porte aucun texte. Sans cette couche de
    // reference, on regarde une photo, pas une carte.
    labels:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  DARK: {
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: 'CARTO',
    maxZoom: 19,
    labels: null,
  },
  STREET: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    maxZoom: 19,
    labels: null,
  },
}

const RISK_COLOUR = {
  LOW: '#27ae60',
  MEDIUM: '#e0c22a',
  HIGH: '#e67e22',
  CRITICAL: '#c0392b',
}

/** Le symbole avion, oriente au cap quand il est connu. */
function aircraftIcon(flight, selected) {
  const colour = RISK_COLOUR[flight.risk?.level] ?? '#27ae60'
  const track = flight.lastPosition?.trackDeg
  const rotation = track === null || track === undefined ? 0 : track
  const stale = flight.tracking === 'STALE'

  return L.divIcon({
    className: 'fwm-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `
      <div class="fwm-mark${selected ? ' is-on' : ''}${stale ? ' is-stale' : ''}"
           style="--fwm-c:${colour};transform:rotate(${rotation}deg)">
        <svg viewBox="0 0 24 24"><path d="M12 2.2l2 7.3 8 4v2l-8-2.2v5l2.6 2v1.6L12 20.6l-4.6 1.3v-1.6l2.6-2v-5l-8 2.2v-2l8-4z"/></svg>
      </div>
      <span class="fwm-tag">${flight.flightNo}</span>`,
  })
}

/** Une pastille d'aerodrome, avec son code OACI. */
function airportIcon(icao, isBase) {
  return L.divIcon({
    className: 'fwm-apt-icon',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    html: `<span class="fwm-apt${isBase ? ' is-base' : ''}"></span>
           <span class="fwm-aptlbl">${icao}</span>`,
  })
}

/** Lat/lon d'une fiche d'aerodrome, quelle que soit la forme de la reponse. */
function coordinatesOf(entry) {
  const airport = entry?.airport ?? entry
  if (!airport || airport.latitude == null || airport.longitude == null) return null
  return { icao: airport.icao, name: airport.name, lat: Number(airport.latitude), lon: Number(airport.longitude) }
}

export default function FlightWatchMap({
  flights,
  airports,
  bases,
  traffic,
  showTraffic,
  basemap,
  layers,
  radarFrame,
  selectedId,
  onSelect,
}) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const labelRef = useRef(null)
  const networkRef = useRef(null)
  const routesRef = useRef(null)
  const airportsRef = useRef(null)
  const trafficRef = useRef(null)
  const firRef = useRef(null)
  const radarRef = useRef(null)
  const irRef = useRef(null)
  const markersRef = useRef(new Map())
  const hasFitted = useRef(false)

  // Une seule instance Leaflet pour la vie du composant : la recreer a chaque
  // rendu perdrait le zoom et le centrage que l'operateur vient de choisir.
  useEffect(() => {
    if (mapRef.current || !hostRef.current) return undefined
    const map = L.map(hostRef.current, {
      center: [34, 12],
      zoom: 4,
      zoomControl: true,
      worldCopyJump: true,
      attributionControl: true,
    })
    mapRef.current = map
    networkRef.current = L.layerGroup().addTo(map)
    // Routes and aerodromes are drawn into the same network group but kept as
    // two layers: the prototype lets an operator turn the airports off while
    // keeping the route lines, and vice versa.
    routesRef.current = L.layerGroup().addTo(map)
    airportsRef.current = L.layerGroup().addTo(map)

    // Leaflet mesure son conteneur au moment ou on le cree. Ici la carte est
    // une case de grille dont la hauteur n'est connue qu'apres la mise en
    // page : sans cela, elle se dessine dans un carre de quelques pixels et
    // n'en sort jamais.
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(hostRef.current)
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      networkRef.current = null
      trafficRef.current = null
      // Les marqueurs appartiennent a la carte qu'on vient de detruire. Sans
      // ce nettoyage, le double montage de React en developpement laissait
      // des marqueurs detaches dans le cache : l'effet suivant les retrouvait,
      // se contentait de les deplacer, et aucun avion n'apparaissait.
      markersRef.current.clear()
      hasFitted.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const config = BASEMAPS[basemap] ?? BASEMAPS.SATELLITE

    if (tileRef.current) map.removeLayer(tileRef.current)
    if (labelRef.current) {
      map.removeLayer(labelRef.current)
      labelRef.current = null
    }

    tileRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      zIndex: 1,
    }).addTo(map)

    if (config.labels) {
      labelRef.current = L.tileLayer(config.labels, {
        maxZoom: config.maxZoom,
        zIndex: 2,
      }).addTo(map)
    }
  }, [basemap])

  /** Le reseau : aerodromes connus, et la route de chaque etape du jour. */
  useEffect(() => {
    const layer = routesRef.current
    const aptLayer = airportsRef.current
    if (!layer || !aptLayer) return
    layer.clearLayers()
    aptLayer.clearLayers()

    const byIcao = new Map()
    ;(airports ?? []).forEach((entry) => {
      const point = coordinatesOf(entry)
      if (point) byIcao.set(point.icao, point)
    })

    // Les routes d'abord, pour qu'elles passent sous les pastilles.
    ;(flights ?? []).forEach((flight) => {
      const from = byIcao.get(flight.depIcao)
      const to = byIcao.get(flight.arrIcao)
      if (!from || !to) return
      L.polyline(
        [
          [from.lat, from.lon],
          [to.lat, to.lon],
        ],
        {
          className: 'fwm-route',
          weight: 1,
          opacity: 0.5,
          dashArray: '5 6',
          interactive: false,
        },
      ).addTo(layer)
    })

    byIcao.forEach((point) => {
      L.marker([point.lat, point.lon], {
        icon: airportIcon(point.icao, (bases ?? []).includes(point.icao)),
        title: `${point.icao} — ${point.name}`,
        zIndexOffset: -400,
      }).addTo(aptLayer)
    })
  }, [airports, flights, bases])

  /**
   * Les couches que l'operateur allume et eteint.
   *
   * Chacune est un groupe deja construit : allumer une couche l'ajoute a la
   * carte, l'eteindre la retire. Rien n'est reconstruit — sinon rallumer les
   * limites FIR redessinerait deux cent quatre-vingt-une frontieres.
   */
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
    toggle(routesRef.current, layers.flights)
    toggle(airportsRef.current, layers.airports)
    toggle(firRef.current, layers.fir)

    // Les etapes suivies suivent la meme couche que leurs routes : une
    // position sans sa route est un point sans contexte.
    markersRef.current.forEach((marker) => {
      if (layers.flights) {
        if (!map.hasLayer(marker)) marker.addTo(map)
      } else if (map.hasLayer(marker)) {
        map.removeLayer(marker)
      }
    })
  }, [layers, flights, airports])

  /**
   * Les limites FIR/UIR : deux cent quatre-vingt-une regions de controle.
   *
   * Chargees une seule fois, a la demande — un demi-megaoctet de geometrie
   * n'a pas a etre telecharge par quelqu'un qui ne regarde que ses avions.
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layers?.fir || firRef.current) return undefined

    let cancelled = false
    fetch('/geo/fir.geojson')
      .then((response) => response.json())
      .then((geo) => {
        if (cancelled || !mapRef.current) return
        firRef.current = L.geoJSON(geo, {
          style: () => ({
            color: '#F0A500',
            weight: 1,
            opacity: 0.5,
            fillColor: '#F0A500',
            fillOpacity: 0.02,
          }),
          onEachFeature: (feature, layer) => {
            const icao = feature?.properties?.icao ?? '????'
            layer.bindPopup(`<b>${icao}</b> FIR/UIR`)
            layer.on('mouseover', () =>
              layer.setStyle({ fillOpacity: 0.12, weight: 1.6, opacity: 0.9 }))
            layer.on('mouseout', () =>
              layer.setStyle({ fillOpacity: 0.02, weight: 1, opacity: 0.5 }))
          },
        })
        firRef.current.addTo(mapRef.current)
      })
      .catch(() => {
        // The boundaries are context, not a position. Losing them must not
        // take the aircraft off the screen with them.
      })

    return () => {
      cancelled = true
    }
  }, [layers?.fir])

  /**
   * Le radar de precipitations et l'imagerie infrarouge, en direct.
   *
   * Les tuiles viennent de RainViewer, comme dans le prototype. L'horodatage
   * de la trame est affiche a cote du bouton : une image radar sans son heure
   * est une image dont on ne sait pas si elle date de cinq minutes ou d'une
   * heure.
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (radarRef.current) {
      map.removeLayer(radarRef.current)
      radarRef.current = null
    }
    if (layers?.radar && radarFrame?.radar) {
      radarRef.current = L.tileLayer(radarFrame.radar, { opacity: 0.7, zIndex: 500 })
      radarRef.current.addTo(map)
    }

    if (irRef.current) {
      map.removeLayer(irRef.current)
      irRef.current = null
    }
    if (layers?.ir && radarFrame?.infrared) {
      irRef.current = L.tileLayer(radarFrame.infrared, { opacity: 0.55, zIndex: 490 })
      irRef.current.addTo(map)
    }
  }, [layers?.radar, layers?.ir, radarFrame])

  /** Les libelles et frontieres, par-dessus l'imagerie. */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !labelRef.current) return
    if (layers?.labels === false && map.hasLayer(labelRef.current)) {
      map.removeLayer(labelRef.current)
    } else if (layers?.labels !== false && !map.hasLayer(labelRef.current)) {
      labelRef.current.addTo(map)
    }
  }, [layers?.labels, basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const seen = new Set()
    ;(flights ?? []).forEach((flight) => {
      const position = flight.lastPosition
      if (!position || position.latitude == null || position.longitude == null) return

      seen.add(flight.legId)
      const latLng = [Number(position.latitude), Number(position.longitude)]
      const icon = aircraftIcon(flight, flight.legId === selectedId)
      const existing = markersRef.current.get(flight.legId)

      if (existing) {
        existing.setLatLng(latLng)
        existing.setIcon(icon)
      } else {
        const marker = L.marker(latLng, { icon, title: flight.flightNo, zIndexOffset: 500 })
        marker.on('click', () => onSelect?.(flight.legId))
        // A new position arriving while the flight layer is off must not put
        // the layer back on behind the operator.
        if (layers?.flights !== false) marker.addTo(map)
        markersRef.current.set(flight.legId, marker)
      }
    })

    // Au premier chargement, la vue se cale sur le reseau : les aerodromes
    // desservis et les appareils suivis. Un centrage fixe laissait les seuls
    // vols suivis hors de l'ecran, ce qui se lisait comme une carte vide
    // alors que la donnee etait la.
    // On attend que le reseau soit charge avant de cadrer : cadrer sur les
    // deux seuls appareils suivis donnait une vue serree qui cachait le reste
    // des aerodromes desservis.
    if (!hasFitted.current && (airports ?? []).length > 0) {
      const points = [...markersRef.current.values()].map((marker) => marker.getLatLng())
      ;(airports ?? []).forEach((entry) => {
        const point = coordinatesOf(entry)
        if (point) points.push(L.latLng(point.lat, point.lon))
      })
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 6 })
        hasFitted.current = true
      }
    }

    // Un vol qui n'est plus suivi disparait de la carte : laisser son symbole
    // reviendrait a afficher une position que plus rien ne confirme.
    markersRef.current.forEach((marker, legId) => {
      if (!seen.has(legId)) {
        map.removeLayer(marker)
        markersRef.current.delete(legId)
      }
    })
  }, [flights, airports, selectedId, onSelect, layers?.flights])


  /**
   * Le trafic tiers : des appareils reellement entendus, dessines plus
   * discrets et d'une autre couleur que nos etapes.
   *
   * Ils ne sont pas cliquables et ne portent pas d'etiquette : ce sont des
   * voisins, pas des vols dont on repond. Les confondre visuellement avec la
   * flotte est exactement ce qui rendait la carte du prototype convaincante
   * et fausse.
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!trafficRef.current) trafficRef.current = L.layerGroup().addTo(map)
    const layer = trafficRef.current
    layer.clearLayers()
    if (!showTraffic) return

    ;(traffic ?? []).forEach((vector) => {
      if (vector.latitude == null || vector.longitude == null) return
      const rotation = vector.trackDeg == null ? 0 : vector.trackDeg
      const icon = L.divIcon({
        className: 'fwm-traffic-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div class="fwm-traffic" style="transform:rotate(${rotation}deg)">
                 <svg viewBox="0 0 24 24"><path d="M12 2.2l2 7.3 8 4v2l-8-2.2v5l2.6 2v1.6L12 20.6l-4.6 1.3v-1.6l2.6-2v-5l-8 2.2v-2l8-4z"/></svg>
               </div>`,
      })
      const marker = L.marker([vector.latitude, vector.longitude], {
        icon,
        interactive: true,
        zIndexOffset: -200,
      })
      const level = vector.altitudeFt == null ? '—' : `FL${Math.round(vector.altitudeFt / 100)}`
      const speed = vector.groundSpeedKt == null ? '—' : `${vector.groundSpeedKt} kt`
      marker.bindTooltip(
        `${vector.callsign ?? vector.modeSHex} · ${level} · ${speed} · traffic`,
        { direction: 'top', className: 'fwm-tip' },
      )
      marker.addTo(layer)
    })
  }, [traffic, showTraffic])

  return <div className="fwm" ref={hostRef} />
}
