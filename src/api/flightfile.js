import client from './client'

/**
 * Les trois onglets du dossier de vol qui ont leur propre magasin : PAX, FUEL
 * et TRIP FOLDER.
 *
 * <p>L'annexe les tient dans le navigateur — un CSV de tarifs sous
 * `localStorage`, une liste de passagers dans `flight._pax`, cinq pastilles de
 * documents ecrites en dur. Ici chacun est une lecture et des ecritures, et ce
 * que l'onglet affiche est ce que la base contient.
 */

/* ───────────────────────────────── passagers ────────────────────────────── */

/** GET /v1/legs/{id}/passengers — les compteurs et le manifeste. */
export async function fetchLegPassengers(legId) {
  const { data } = await client.get(`/legs/${legId}/passengers`)
  return data
}

/** POST /v1/legs/{id}/passengers */
export async function addLegPassenger(legId, command) {
  const { data } = await client.post(`/legs/${legId}/passengers`, command)
  return data
}

/** PUT /v1/passengers/{id} */
export async function saveLegPassenger(passengerId, command) {
  const { data } = await client.put(`/passengers/${passengerId}`, command)
  return data
}

/** DELETE /v1/passengers/{id} */
export async function deleteLegPassenger(passengerId) {
  await client.delete(`/passengers/${passengerId}`)
  return passengerId
}

/** POST /v1/legs/{id}/passengers/import — le fichier est lu par le serveur. */
export async function importLegPassengers(legId, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post(`/legs/${legId}/passengers/import`, form)
  return data
}

/* ─────────────────────────────── dossier de vol ─────────────────────────── */

/** GET /v1/legs/{id}/trip-folder */
export async function fetchTripFolder(legId) {
  const { data } = await client.get(`/legs/${legId}/trip-folder`)
  return data
}

/** PUT /v1/legs/{id}/trip-folder/remark */
export async function saveTripRemark(legId, remark) {
  const { data } = await client.put(`/legs/${legId}/trip-folder/remark`, { remark })
  return data
}

/** POST /v1/legs/{id}/documents — multipart, une piece par nature. */
export async function uploadLegDocument(legId, kind, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post(`/legs/${legId}/documents?kind=${kind}`, form)
  return data
}

/** DELETE /v1/documents/{id} */
export async function deleteLegDocument(documentId) {
  await client.delete(`/documents/${documentId}`)
  return documentId
}

/** L'adresse de telechargement d'un document, pour un lien ordinaire. */
export function documentHref(documentId) {
  return `${client.defaults.baseURL}/documents/${documentId}`
}

/* ───────────────────────────────── carburant ────────────────────────────── */

/** GET /v1/legs/{id}/fuel */
export async function fetchLegFuel(legId) {
  const { data } = await client.get(`/legs/${legId}/fuel`)
  return data
}

/* ───────────────────────── le menu ⋮ de l'en-tete ───────────────────────── */

/**
 * GET /v1/legs/{id}/events — « OCC Dispatch — event timeline ».
 *
 * <p>L'annexe reconstitue une frise a partir d'un cycle de dispatch invente,
 * avec des statuts tires au sort quand rien ne s'est passe. Ici la frise est le
 * journal `ops.leg_events` : une etape sans evenement rend une liste vide, et
 * c'est la verite.
 */
export async function fetchLegEvents(legId) {
  const { data } = await client.get(`/legs/${legId}/events`)
  return data
}

/** GET /v1/legs/{id}/note — la consigne d'exploitation de l'etape. */
export async function fetchFlightNote(legId) {
  const { data } = await client.get(`/legs/${legId}/note`)
  return data
}

/** PUT /v1/legs/{id}/note — une note vide efface la note. */
export async function saveFlightNote(legId, note) {
  const { data } = await client.put(`/legs/${legId}/note`, { note })
  return data
}

/**
 * GET /v1/legs/{id}/lvp — le bandeau de faible visibilite de l'onglet FLIGHT.
 *
 * <p>`severity: 'GREEN'` veut dire : pas de bandeau. L'annexe fait pareil
 * (flightBannerHtml, l. 74778) — un bandeau permanent apprend a ne plus lire
 * le bandeau.
 */
export async function fetchLegLvp(legId) {
  const { data } = await client.get(`/legs/${legId}/lvp`)
  return data
}

/**
 * GET /v1/weather/lvp?stations=… — le meme verdict, sur des aerodromes.
 *
 * <p>Le dossier de vol s'ouvre aussi sur un appareil immobilise, qui n'a pas
 * d'etape. L'annexe en fait un vol fictif dont le depart et l'arrivee sont
 * l'escale ou il se trouve ; nous interrogeons cette escale directement.
 */
export async function fetchStationLvp(stations) {
  const { data } = await client.get('/weather/lvp', { params: { stations: stations.join(',') } })
  return data
}

/* ──────────────────────────── frise OCC Dispatch ────────────────────────── */

/**
 * GET /v1/legs/{id}/occ-timeline — les dix etapes du cycle de dispatch.
 *
 * <p>Les statuts viennent du serveur, pas de l'horloge du poste : c'est la
 * difference avec `computeOccTimeline()` de l'annexe, qui declarait
 * « Refueling · Completed » des que l'heure etait passee, meme si personne
 * n'avait avitaille.
 */
export async function fetchOccTimeline(legId) {
  const { data } = await client.get(`/legs/${legId}/occ-timeline`)
  return data
}

/** POST /v1/legs/{id}/release — le bouton « Confirm release » de la frise. */
export async function signRelease(legId, command) {
  const { data } = await client.post(`/legs/${legId}/release`, command ?? {})
  return data
}

/** PATCH /v1/legs/{id}/slot — le bouton « Set CTOT / Slot ref ». */
export async function setLegSlot(legId, command) {
  const { data } = await client.patch(`/legs/${legId}/slot`, command)
  return data
}
