import { useEffect, useState } from 'react'

/**
 * Les franchissements FIR d'un vol — référence NETPLUS_FLIGHT_FOLLOWING js/06
 * fwFirIndex l. 966-990 (index des zones : boîte englobante + anneaux),
 * fwDansAnneau l. 993-1000 (lancer de rayon, trous retranchés), fwFirAt
 * l. 1001-1017, fwFirCrossings l. 1023-1038 (120 échantillons le long de la
 * route, une frontière connue à moins d'un pour cent de la route).
 *
 * Le fond FIR est celui de la cible (`/geo/fir.geojson`, 285 zones), lu une
 * seule fois et seulement quand un vol est ouvert.
 */

let firIndexCache = null
let firIndexPromise = null

export function buildFirIndex(geo) {
  const index = []
  ;(geo?.features ?? []).forEach((feature) => {
    const icao = feature?.properties?.icao ?? feature?.properties?.ICAO ?? null
    if (!icao || !feature.geometry) return
    let polys = []
    if (feature.geometry.type === 'Polygon') polys = [feature.geometry.coordinates]
    else if (feature.geometry.type === 'MultiPolygon') polys = feature.geometry.coordinates
    else return
    let mnx = 180
    let mny = 90
    let mxx = -180
    let mxy = -90
    polys.forEach((p) => {
      ;(p[0] || []).forEach((c) => {
        if (c[0] < mnx) mnx = c[0]
        if (c[0] > mxx) mxx = c[0]
        if (c[1] < mny) mny = c[1]
        if (c[1] > mxy) mxy = c[1]
      })
    })
    index.push({ icao, bb: [mnx, mny, mxx, mxy], polys })
  })
  return index
}

/* Lancer de rayon sur un anneau ; les anneaux intérieurs (trous) sont retranchés. */
function inRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi) inside = !inside
  }
  return inside
}

export function firAt(index, lat, lon) {
  for (const zone of index) {
    if (lon < zone.bb[0] || lon > zone.bb[2] || lat < zone.bb[1] || lat > zone.bb[3]) continue
    for (const rings of zone.polys) {
      if (!rings || !rings.length) continue
      if (!inRing(lon, lat, rings[0])) continue
      let hole = false
      for (let r = 1; r < rings.length; r++) {
        if (inRing(lon, lat, rings[r])) {
          hole = true
          break
        }
      }
      if (!hole) return zone.icao
    }
  }
  return null
}

/**
 * La suite des FIR traversées, avec la fraction de route où chaque frontière
 * est franchie — `waypoints` = [[lat, lon], …], au moins deux.
 */
export function firCrossings(index, waypoints) {
  if (!index || !waypoints || waypoints.length < 2) return []
  const N = 120
  const out = []
  let prev = null
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const seg = t * (waypoints.length - 1)
    const a = Math.floor(seg)
    const b = Math.min(waypoints.length - 1, a + 1)
    const u = seg - a
    const lat = waypoints[a][0] + (waypoints[b][0] - waypoints[a][0]) * u
    const lon = waypoints[a][1] + (waypoints[b][1] - waypoints[a][1]) * u
    const fir = firAt(index, lat, lon)
    if (fir !== prev) {
      out.push({ icao: fir, at: t })
      prev = fir
    }
  }
  return out
}

/** L'index FIR, chargé à la demande et gardé pour la session. */
export function useFirIndex(enabled) {
  const [index, setIndex] = useState(firIndexCache)

  useEffect(() => {
    if (!enabled || firIndexCache) return undefined
    let cancelled = false
    if (!firIndexPromise) {
      firIndexPromise = fetch('/geo/fir.geojson')
        .then((response) => response.json())
        .then((geo) => {
          firIndexCache = buildFirIndex(geo)
          return firIndexCache
        })
        .catch(() => {
          // Les limites sont un contexte : sans elles le bloc n'est pas rendu,
          // et une prochaine ouverture réessaie.
          firIndexPromise = null
          return null
        })
    }
    firIndexPromise.then((result) => {
      if (!cancelled && result) setIndex(result)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return index
}
