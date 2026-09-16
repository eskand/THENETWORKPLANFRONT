import client from './client'

/** Operations (API40 to API43): timeline, following, trip support, airports. */

/**
 * GET /v1/timeline — rotations, ground time and the six header tiles.
 *
 * Les trois selecteurs partent au serveur. Filtrer dans le navigateur aurait
 * ete moins de code et faux : les tuiles comptent la flotte entiere pendant
 * que les lignes sont reduites, et un ecran qui cache des lignes qu'il a deja
 * telechargees ment sur ce qu'il sait.
 */
export async function fetchTimeline({
  from,
  days = 1,
  includeIdle = true,
  fleet,
  base,
  status,
} = {}) {
  const { data } = await client.get('/timeline', {
    params: {
      from: from || undefined,
      days,
      includeIdle,
      fleet: fleet || undefined,
      base: base || undefined,
      status: status || undefined,
    },
  })
  return data
}

/** GET /v1/flight-following/board?date */
export async function fetchFollowingBoard(date) {
  const { data } = await client.get('/flight-following/board', {
    params: { date: date || undefined },
  })
  return data
}

/** GET /v1/flight-following/legs/{id}/track */
export async function fetchTrack(legId) {
  const { data } = await client.get(`/flight-following/legs/${legId}/track`)
  return data
}

/** GET /v1/netplus-services/board?date */
export async function fetchTripSupportBoard(date) {
  const { data } = await client.get('/netplus-services/board', {
    params: { date: date || undefined },
  })
  return data
}

/** GET /v1/netplus-services/suppliers?station */
export async function fetchSuppliers(station) {
  const { data } = await client.get('/netplus-services/suppliers', {
    params: { station: station || undefined },
  })
  return data
}

/** POST /v1/legs/{id}/service-requests — the write path DOM2 already owned. */
export async function createServiceRequest(legId, command) {
  const { data } = await client.post(`/legs/${legId}/service-requests`, command)
  return data
}

/** GET /v1/airports?search&country&usedOnly */
export async function fetchAirports({ search, country, usedOnly = false } = {}) {
  const { data } = await client.get('/airports', {
    params: { search: search || undefined, country: country || undefined, usedOnly },
  })
  return data
}

/** GET /v1/airports/{icao} */
export async function fetchAirportDetail(icao) {
  const { data } = await client.get(`/airports/${icao}`)
  return data
}

/**
 * GET /v1/flight-following/traffic — le trafic vivant dans la boite.
 *
 * Des appareils d'autres exploitants, lus chez le fournisseur ADS-B et
 * jamais stockes. Ils repondent a « qu'est-ce qui vole autour de nous »,
 * pas a « ou sont nos avions » — la carte les distingue par la couleur.
 */
export async function fetchLiveTraffic(limit = 1200) {
  const { data } = await client.get('/flight-following/traffic', { params: { limit } })
  return data
}

/** GET /v1/legs/{id} — one leg, everything the flight label shows. */
export async function fetchLeg(legId) {
  const { data } = await client.get(`/legs/${legId}`)
  return data
}

/** POST /v1/legs/{id}/mvt — marks the movement message as sent. */
export async function sendMvt(legId) {
  const { data } = await client.post(`/legs/${legId}/mvt`)
  return data
}
