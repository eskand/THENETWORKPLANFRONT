import client from './client'

/** GET /v1/crew/scheduling/board?date&role — legs and pool in one call. */
export async function fetchSchedulingBoard({ date, role }) {
  const { data } = await client.get('/crew/scheduling/board', {
    params: { date, role: role || undefined },
  })
  return data
}

/** POST /v1/crew/scheduling/legs/{legId}/assignments */
export async function assignSeat({ legId, personId, seat }) {
  const { data } = await client.post(`/crew/scheduling/legs/${legId}/assignments`, { personId, seat })
  return data
}

/** DELETE /v1/crew/scheduling/assignments/{id} */
export async function unassignSeat(assignmentId) {
  await client.delete(`/crew/scheduling/assignments/${assignmentId}`)
}
