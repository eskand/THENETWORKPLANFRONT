import client from './client'

/** GET /v1/roster/versions — every period, newest first. */
export async function fetchRosterVersions() {
  const { data } = await client.get('/roster/versions')
  return data
}

/** GET /v1/roster/grid?versionId — the grid; without an id, today's published one. */
export async function fetchRosterGrid(versionId) {
  const { data } = await client.get('/roster/grid', {
    params: { versionId: versionId || undefined },
  })
  return data
}

/** POST /v1/roster/versions/{id}/publish */
export async function publishRoster(versionId) {
  const { data } = await client.post(`/roster/versions/${versionId}/publish`)
  return data
}

/** PUT /v1/roster/versions/{id}/entries — writes one cell of a draft. */
export async function saveRosterEntry(versionId, command) {
  const { data } = await client.put(`/roster/versions/${versionId}/entries`, command)
  return data
}

/** DELETE /v1/roster/entries/{id} — clears one cell of a draft. */
export async function deleteRosterEntry(entryId) {
  await client.delete(`/roster/entries/${entryId}`)
  return entryId
}

/** POST /v1/roster/versions — opens a new period, always as a draft. */
export async function createRosterVersion(command) {
  const { data } = await client.post('/roster/versions', command)
  return data
}

/** GET /v1/roster/month?month=YYYY-MM — one calendar month, all versions merged. */
export async function fetchRosterMonth(month) {
  const { data } = await client.get('/roster/month', { params: { month: month || undefined } })
  return data
}
