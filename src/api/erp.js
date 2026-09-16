import client from './client'

/**
 * The crisis console.
 *
 * Every command returns the whole console rather than the row it changed, so
 * the caller replaces its state outright. Under pressure the screen must not
 * be able to show a ticked box next to a figure that has not caught up.
 */

/** GET /v1/erp/console */
export async function fetchErpConsole() {
  const { data } = await client.get('/erp/console')
  return data
}

/** GET /v1/erp/console/catalogue — the events and the questionnaire. */
export async function fetchErpCatalogue() {
  const { data } = await client.get('/erp/console/catalogue')
  return data
}

/** GET /v1/erp/console/reference — the plan itself. */
export async function fetchErpReference() {
  const { data } = await client.get('/erp/console/reference')
  return data
}

/** POST /v1/erp/console/assess — what level a situation is, and why. */
export async function assessSituation(command) {
  const { data } = await client.post('/erp/console/assess', command)
  return data
}

/** GET /v1/erp/console/checklists */
export async function fetchErpChecklists() {
  const { data } = await client.get('/erp/console/checklists')
  return data
}

/** GET /v1/erp/console/templates — tokens already filled from the live event. */
export async function fetchErpTemplates() {
  const { data } = await client.get('/erp/console/templates')
  return data
}

/** POST /v1/erp/console/checks */
export async function setErpCheck(command) {
  const { data } = await client.post('/erp/console/checks', command)
  return data
}

/** POST /v1/erp/console/notifications */
export async function recordErpNotification(command) {
  const { data } = await client.post('/erp/console/notifications', command)
  return data
}

/** PATCH /v1/erp/console/level */
export async function changeErpLevel(command) {
  const { data } = await client.patch('/erp/console/level', command)
  return data
}

/** POST /v1/erp/console/sitreps */
export async function postErpSitrep(command) {
  const { data } = await client.post('/erp/console/sitreps', command)
  return data
}

/** PATCH /v1/erp/console/subject */
export async function updateErpSubject(command) {
  const { data } = await client.patch('/erp/console/subject', command)
  return data
}

/** POST /v1/erp/console/log */
export async function addErpLogEntry(command) {
  const { data } = await client.post('/erp/console/log', command)
  return data
}

/** POST /v1/erp/activations */
export async function activateErp(command) {
  const { data } = await client.post('/erp/activations', command)
  return data
}

/** PATCH /v1/erp/activations/{id}/stand-down */
export async function standDownErp(activationId, command) {
  const { data } = await client.patch(`/erp/activations/${activationId}/stand-down`, command)
  return data
}
