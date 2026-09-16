import client from './client'

/** Sales & CRM and the safety modules (API50, API60 to API63). */

/* --- Sales --------------------------------------------------- */

/** GET /v1/sales/board?status */
export async function fetchSalesBoard(status) {
  const { data } = await client.get('/sales/board', { params: { status: status || undefined } })
  return data
}

/** GET /v1/sales/requests/{id} */
export async function fetchSalesRequest(requestId) {
  const { data } = await client.get(`/sales/requests/${requestId}`)
  return data
}

/** PATCH /v1/sales/requests/{id}/feasibility */
export async function assessFeasibility(requestId, command) {
  const { data } = await client.patch(`/sales/requests/${requestId}/feasibility`, command)
  return data
}

/** PATCH /v1/sales/quotes/{id} — send, accept or refuse. */
export async function decideQuote(quoteId, command) {
  const { data } = await client.patch(`/sales/quotes/${quoteId}`, command)
  return data
}

/* --- Safety Manager ------------------------------------------ */

/** GET /v1/safety/board?status&windowDays */
export async function fetchSafetyBoard({ status, windowDays = 365 } = {}) {
  const { data } = await client.get('/safety/board', {
    params: { status: status || undefined, windowDays },
  })
  return data
}

/** PATCH /v1/safety/occurrences/{id}/risk — severity and probability only. */
export async function assessRisk(occurrenceId, command) {
  const { data } = await client.patch(`/safety/occurrences/${occurrenceId}/risk`, command)
  return data
}

/** PATCH /v1/safety/occurrences/{id}/close */
export async function closeOccurrence(occurrenceId, conclusion) {
  const { data } = await client.patch(`/safety/occurrences/${occurrenceId}/close`, { conclusion })
  return data
}

/* --- Safety Reports ------------------------------------------ */

/** GET /v1/safety-reports/summary?windowDays */
export async function fetchSafetyReports(windowDays = 365) {
  const { data } = await client.get('/safety-reports/summary', { params: { windowDays } })
  return data
}

/** PATCH /v1/safety-reports/occurrences/{id}/file */
export async function fileWithAuthority(occurrenceId, command) {
  const { data } = await client.patch(`/safety-reports/occurrences/${occurrenceId}/file`, command)
  return data
}

/* --- Safety Promotion ---------------------------------------- */

/** GET /v1/safety-promotion/board */
export async function fetchPromotionBoard() {
  const { data } = await client.get('/safety-promotion/board')
  return data
}

/* --- ERP ------------------------------------------------------ */

/** GET /v1/erp/board */
export async function fetchErpBoard() {
  const { data } = await client.get('/erp/board')
  return data
}

/** POST /v1/erp/activations */
export async function activateErp(command) {
  const { data } = await client.post('/erp/activations', command)
  return data
}

/** PATCH /v1/erp/activations/{id}/stand-down */
export async function standDownErp(activationId, outcome) {
  const { data } = await client.patch(`/erp/activations/${activationId}/stand-down`, { outcome })
  return data
}

/**
 * GET /v1/safety/overview — the Safety Manager dashboard.
 *
 * Every figure on it is computed when the request is served: counts from the
 * occurrence register, indicators from the modules that own the answer, and
 * the live scan across crew, airworthiness and deferred defects. Nothing on
 * this response is a number somebody wrote down.
 */
export async function fetchSafetyOverview() {
  const { data } = await client.get('/safety/overview')
  return data
}

/** POST /v1/safety/scan — re-runs the live scan on demand. Writes nothing. */
export async function runSafetyScan() {
  const { data } = await client.post('/safety/scan')
  return data
}

/* --- Safety Reports: the reporter's side ---------------------- */

/** GET /v1/safety/reporting/board — types, drafts, my reports, the policy. */
export async function fetchReportingBoard(reporterId) {
  const { data } = await client.get('/safety/reporting/board', { params: { reporterId } })
  return data
}

/** PUT /v1/safety/reporting/drafts — creates or updates a draft. Nothing mandatory. */
export async function saveReportDraft(reporterId, command) {
  const { data } = await client.put('/safety/reporting/drafts', command, { params: { reporterId } })
  return data
}

export async function deleteReportDraft(reporterId, draftId) {
  await client.delete(`/safety/reporting/drafts/${draftId}`, { params: { reporterId } })
}

/** POST /v1/safety/reporting/reports — sends it to the Safety Manager. */
export async function submitSafetyReport(reporterId, command) {
  const { data } = await client.post('/safety/reporting/reports', command, { params: { reporterId } })
  return data
}

/** POST /v1/safety-promotion/campaigns/{id}/acknowledge — « I have read this ». */
export async function acknowledgeCampaign(campaignId, personId) {
  await client.post(`/safety-promotion/campaigns/${campaignId}/acknowledge`, { personId })
}

/* ── Safety: the hazard register, the REX library, queries, notifications ── */

/** GET /v1/safety/hazards — the register with its populated matrix. */
export async function fetchHazardRegister() {
  const { data } = await client.get('/safety/hazards')
  return data
}

/** PATCH /v1/safety/hazards/{id}/review */
export async function recordHazardReview({ hazardId, cycleDays = 90 }) {
  const { data } = await client.patch(`/safety/hazards/${hazardId}/review`, null, {
    params: { cycleDays },
  })
  return data
}

/** GET /v1/safety/rex */
export async function fetchRexLibrary(reader) {
  const { data } = await client.get('/safety/rex', {
    params: reader ? { reader } : undefined,
  })
  return data
}

/** POST /v1/safety/rex/{id}/read */
export async function markRexRead({ rexId, reader }) {
  const { data } = await client.post(`/safety/rex/${rexId}/read`, null, { params: { reader } })
  return data
}

/** GET /v1/safety/queries — what the Safety Manager has asked reporters. */
export async function fetchSafetyQueries({ reporter, openOnly = true } = {}) {
  const { data } = await client.get('/safety/queries', {
    params: { reporter: reporter || undefined, openOnly },
  })
  return data
}

/** POST /v1/safety/occurrences/{id}/query */
export async function askSafetyQuery({ occurrenceId, question, askedBy }) {
  const { data } = await client.post(`/safety/occurrences/${occurrenceId}/query`, {
    question, askedBy,
  })
  return data
}

/** POST /v1/safety/occurrences/{id}/query/answer */
export async function answerSafetyQuery({ occurrenceId, answer }) {
  const { data } = await client.post(`/safety/occurrences/${occurrenceId}/query/answer`, { answer })
  return data
}

/** GET /v1/safety/notifications */
export async function fetchSafetyNotifications() {
  const { data } = await client.get('/safety/notifications')
  return data
}

/** PATCH /v1/safety/notifications/{id}/read */
export async function markNotificationRead(notificationId) {
  const { data } = await client.patch(`/safety/notifications/${notificationId}/read`)
  return data
}

/** PATCH /v1/safety/notifications/read-all */
export async function markAllNotificationsRead() {
  const { data } = await client.patch('/safety/notifications/read-all')
  return data
}
