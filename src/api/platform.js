import client from './client'

/** Reports, Simulation, Database and Settings (API70 to API73). */

/** GET /v1/reports — the catalogue, with the last run of each. */
export async function fetchReportCatalogue() {
  const { data } = await client.get('/reports')
  return data
}

/** GET /v1/reports/runs */
export async function fetchReportRuns() {
  const { data } = await client.get('/reports/runs')
  return data
}

/** POST /v1/reports/{code}/run — running a report records an execution. */
export async function runReport({ code, from, to, windowDays }) {
  const { data } = await client.post(`/reports/${code}/run`, null, {
    params: {
      from: from || undefined,
      to: to || undefined,
      windowDays: windowDays || undefined,
    },
  })
  return data
}

/** GET /v1/simulation/board */
export async function fetchSimulationBoard() {
  const { data } = await client.get('/simulation/board')
  return data
}

/** POST /v1/simulation/scenarios/{id}/run */
export async function runScenario(scenarioId, remark) {
  const { data } = await client.post(`/simulation/scenarios/${scenarioId}/run`, { remark })
  return data
}

/** GET /v1/database/reference-sets */
export async function fetchReferenceSets() {
  const { data } = await client.get('/database/reference-sets')
  return data
}

/** GET /v1/settings?category */
export async function fetchSettings(category) {
  const { data } = await client.get('/settings', { params: { category: category || undefined } })
  return data
}

/** PATCH /v1/settings/{id} */
export async function updateSetting(settingId, settingValue) {
  const { data } = await client.patch(`/settings/${settingId}`, { settingValue })
  return data
}

/**
 * GET /v1/settings/form — the whole Settings screen: rubrics, groups, fields.
 *
 * One call rather than one per rubric: the left-hand list needs every count,
 * and the configuration is a few dozen rows, not a page of them.
 */
export async function fetchSettingsForm() {
  const { data } = await client.get('/settings/form')
  return data
}

/** POST /v1/settings/reset — one rubric, or everything when section is omitted. */
export async function resetSettings(section) {
  const { data } = await client.post('/settings/reset', null, { params: { section: section || undefined } })
  return data
}

/** POST /v1/settings/import — restores a configuration file. Unknown keys are ignored. */
export async function importSettings(values) {
  const { data } = await client.post('/settings/import', { values })
  return data
}

/** GET /v1/database/fleet-register — every tail, grouped by family. */
export async function fetchFleetRegister() {
  const { data } = await client.get('/database/fleet-register')
  return data
}

/**
 * GET /v1/database/aircraft-reference — the 308-type reference.
 *
 * Searched on the server rather than filtered in the browser: the reference is
 * the one table that will keep growing, and a lookup field should not have to
 * download it to answer.
 */
export async function fetchAircraftReference(search, limit = 100) {
  const { data } = await client.get('/database/aircraft-reference', {
    params: { search: search || undefined, limit },
  })
  return data
}

/* --- Simulation Center: scenario sandbox ---------------------- */

/** GET /v1/simulation/sandbox/generator — baseline, presets, injectors, recent scenarios. */
export async function fetchScenarioGenerator() {
  const { data } = await client.get('/simulation/sandbox/generator')
  return data
}

/**
 * POST /v1/simulation/sandbox/scenarios — copies the plan and puts things wrong in the copy.
 *
 * The response says what each injector was asked for and what it could place.
 * Passing back a previous scenario's seed reproduces it exactly.
 */
export async function generateScenario(command) {
  const { data } = await client.post('/simulation/sandbox/scenarios', command)
  return data
}

/** DELETE /v1/simulation/sandbox/scenarios/{id} — drops the sandbox, never the plan. */
export async function deleteScenario(scenarioId) {
  await client.delete(`/simulation/sandbox/scenarios/${scenarioId}`)
}
