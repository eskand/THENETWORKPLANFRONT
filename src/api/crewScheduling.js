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

/**
 * PATCH /v1/crew/scheduling/assignments/{id}/check-times
 *
 * Les heures reelles de prise et de fin de service. Elles sont la source du
 * calcul FDP — l'annexe le repete a chaque ligne de son onglet CREW : le temps
 * de service court de la prise a la fin de service, jamais du bloc ni du STD.
 */
export async function recordCheckTimes(assignmentId, { checkInAt, checkOutAt }) {
  const { data } = await client.patch(
    `/crew/scheduling/assignments/${assignmentId}/check-times`,
    { checkInAt, checkOutAt },
  )
  return data
}
