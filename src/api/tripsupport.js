import client from './client'

/**
 * Les services de piste et les permis d'UNE etape — ce que les onglets
 * SERVICES et OVF PERMIT du dossier de vol lisent et ecrivent.
 *
 * <p>L'annexe tient ces deux onglets dans `flight._svcState`, un objet du
 * navigateur : fermer l'onglet du navigateur effacait les demandes. Ici chaque
 * ligne est une ecriture, et le cycle de vie (DRAFT → SENT → ACKNOWLEDGED →
 * CONFIRMED / REFUSED) est celui que le serveur fait respecter.
 */

/** GET /v1/legs/{id}/services */
export async function fetchLegServices(legId) {
  const { data } = await client.get(`/legs/${legId}/services`)
  return data
}

/** POST /v1/legs/{id}/service-requests */
export async function createLegServiceRequest(legId, command) {
  const { data } = await client.post(`/legs/${legId}/service-requests`, command)
  return data
}

/** PATCH /v1/service-requests/{id} */
export async function updateServiceRequest(requestId, command) {
  const { data } = await client.patch(`/service-requests/${requestId}`, command)
  return data
}

/** PATCH /v1/service-requests/{id}/details — type et fournisseur de la ligne. */
export async function updateServiceRequestDetails(requestId, command) {
  const { data } = await client.patch(`/service-requests/${requestId}/details`, command)
  return data
}

/** DELETE /v1/service-requests/{id} — brouillons seulement. */
export async function deleteServiceRequest(requestId) {
  await client.delete(`/service-requests/${requestId}`)
  return requestId
}

/** GET /v1/legs/{id}/permits */
export async function fetchLegPermits(legId) {
  const { data } = await client.get(`/legs/${legId}/permits`)
  return data
}

/** POST /v1/legs/{id}/permit-requests */
export async function createLegPermitRequest(legId, command) {
  const { data } = await client.post(`/legs/${legId}/permit-requests`, command)
  return data
}

/** PATCH /v1/permit-requests/{id} */
export async function updatePermitRequest(requestId, command) {
  const { data } = await client.patch(`/permit-requests/${requestId}`, command)
  return data
}

/** PATCH /v1/permit-requests/{id}/details — pays, nature et destinataire. */
export async function updatePermitRequestDetails(requestId, command) {
  const { data } = await client.patch(`/permit-requests/${requestId}/details`, command)
  return data
}

/** DELETE /v1/permit-requests/{id} — brouillons seulement. */
export async function deletePermitRequest(requestId) {
  await client.delete(`/permit-requests/${requestId}`)
  return requestId
}
