import client from './client'

/**
 * Maintenance (API30 to API33).
 *
 * Four modules, one file: CAMO, CAMO Admin, Tech Log and MEL are separate
 * services on the server, but the browser only needs one axios instance and
 * one function per endpoint.
 */

/* --- CAMO ---------------------------------------------------- */

/** GET /v1/camo/fleet — one row per registration, counters and findings. */
export async function fetchCamoFleet() {
  const { data } = await client.get('/camo/fleet')
  return data
}

/** GET /v1/camo/due-list — everything overdue, plus what falls in the horizon. */
export async function fetchDueList(horizonDays = 90) {
  const { data } = await client.get('/camo/due-list', { params: { horizonDays } })
  return data
}

/** GET /v1/camo/aircraft/{id} — the CAMO file of one tail. */
export async function fetchAircraftCamo(aircraftId) {
  const { data } = await client.get(`/camo/aircraft/${aircraftId}`)
  return data
}

/**
 * GET /v1/camo/life-limited-parts — every part still fitted, shortest life first.
 *
 * Fleet-wide on purpose: the question the tab answers is which part comes off
 * next and on which aircraft, and that cannot be asked one registration at a
 * time. The remaining share is computed on the server from the published limit
 * and the cycles consumed, so the gauge and any report show the same figure.
 */
export async function fetchLifeLimitedParts() {
  const { data } = await client.get('/camo/life-limited-parts')
  return data
}

/** GET /v1/camo/work-orders — orders still running, nearest target first. */
export async function fetchWorkOrders() {
  const { data } = await client.get('/camo/work-orders')
  return data
}

/** PATCH /v1/camo/tasks/{id}/complete */
export async function completeTask(taskId, command) {
  const { data } = await client.patch(`/camo/tasks/${taskId}/complete`, command)
  return data
}

/* --- CAMO Admin ---------------------------------------------- */

/** GET /v1/camo-admin/programme */
export async function fetchProgramme(icaoType) {
  const { data } = await client.get('/camo-admin/programme', {
    params: { icaoType: icaoType || undefined },
  })
  return data
}

/** GET /v1/camo-admin/directives */
export async function fetchDirectives(outstandingOnly = false) {
  const { data } = await client.get('/camo-admin/directives', { params: { outstandingOnly } })
  return data
}

/** PATCH /v1/camo-admin/directive-applications/{id} */
export async function complyDirective(applicationId, command) {
  const { data } = await client.patch(`/camo-admin/directive-applications/${applicationId}`, command)
  return data
}

/* --- Tech Log ------------------------------------------------ */

/** GET /v1/tech-log/pages */
export async function fetchTechLogPages({ aircraftId, from, to } = {}) {
  const { data } = await client.get('/tech-log/pages', {
    params: {
      aircraftId: aircraftId || undefined,
      from: from || undefined,
      to: to || undefined,
    },
  })
  return data
}

/** POST /v1/tech-log/pages/{id}/sign — this is what moves TSN and CSN. */
export async function signTechLogPage(entryId) {
  const { data } = await client.post(`/tech-log/pages/${entryId}/sign`)
  return data
}

/** GET /v1/tech-log/board — the defect picture with its figures. */
export async function fetchTechLogBoard() {
  const { data } = await client.get('/tech-log/board')
  return data
}

/** GET /v1/tech-log/defects */
export async function fetchDefects({ aircraftId, openOnly = true } = {}) {
  const { data } = await client.get('/tech-log/defects', {
    params: { aircraftId: aircraftId || undefined, openOnly },
  })
  return data
}

/** PATCH /v1/tech-log/defects/{id}/resolve */
export async function resolveDefect(defectId, command) {
  const { data } = await client.patch(`/tech-log/defects/${defectId}/resolve`, command)
  return data
}

/* --- MEL ----------------------------------------------------- */

/** GET /v1/mel/items — the deferrals in force. */
export async function fetchMelItems() {
  const { data } = await client.get('/mel/items')
  return data
}

/** GET /v1/mel/library */
export async function fetchMelLibrary({ icaoType, ataChapter } = {}) {
  const { data } = await client.get('/mel/library', {
    params: { icaoType: icaoType || undefined, ataChapter: ataChapter || undefined },
  })
  return data
}

/** PATCH /v1/mel/items/{id}/close */
export async function closeMelItem(itemId, correctiveAction) {
  const { data } = await client.patch(`/mel/items/${itemId}/close`, { correctiveAction })
  return data
}

/* ── CAMO Administration ──────────────────────────────────────────────────
   The back office of the airworthiness record. The board carries the
   dashboard figures AND the alerts, in one call: the alerts are derived from
   the same rows as the figures, and two calls could describe two moments. */

/** GET /v1/camo-admin/board */
export async function fetchCamoAdminBoard() {
  const { data } = await client.get('/camo-admin/board')
  return data
}

/** GET /v1/camo-admin/components — one register, four screens. */
export async function fetchCamoComponents(category) {
  const { data } = await client.get('/camo-admin/components', {
    params: category ? { category } : undefined,
  })
  return data
}

/** GET /v1/camo-admin/documents */
export async function fetchCamoDocuments(category) {
  const { data } = await client.get('/camo-admin/documents', {
    params: category ? { category } : undefined,
  })
  return data
}

/** GET /v1/camo-admin/users */
export async function fetchCamoUsers() {
  const { data } = await client.get('/camo-admin/users')
  return data
}

/** GET /v1/camo-admin/audit */
export async function fetchCamoAuditTrail(limit = 200) {
  const { data } = await client.get('/camo-admin/audit', { params: { limit } })
  return data
}
