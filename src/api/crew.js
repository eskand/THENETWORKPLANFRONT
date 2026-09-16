import client from './client'

/**
 * Crew Management (API20).
 *
 * Same contract as api/dispatch.js: one function per endpoint, no state, no
 * derivation — the browser never decides what a figure means.
 */

/** GET /v1/crew/persons — the crew list, counters and document state included. */
export async function fetchCrewList({ role, search, activeOnly = true }) {
  const { data } = await client.get('/crew/persons', {
    params: {
      role: role || undefined,
      search: search || undefined,
      activeOnly,
    },
  })
  return data
}

/** GET /v1/crew/persons/{id} — one crew file: qualifications, absences, duty. */
export async function fetchCrewMember(personId) {
  const { data } = await client.get(`/crew/persons/${personId}`)
  return data
}

/** GET /v1/crew/expiries — everything that lapses inside the horizon. */
export async function fetchCrewExpiries(horizonDays = 90) {
  const { data } = await client.get('/crew/expiries', { params: { horizonDays } })
  return data
}

/** POST /v1/crew/persons */
export async function createCrewMember(command) {
  const { data } = await client.post('/crew/persons', command)
  return data
}

/** PUT /v1/crew/persons/{id} */
export async function updateCrewMember(personId, command) {
  const { data } = await client.put(`/crew/persons/${personId}`, command)
  return data
}

/** POST /v1/crew/persons/{id}/absences */
export async function addCrewAbsence(personId, command) {
  const { data } = await client.post(`/crew/persons/${personId}/absences`, command)
  return data
}

/** POST /v1/crew/persons/{id}/qualifications */
export async function addCrewQualification(personId, command) {
  const { data } = await client.post(`/crew/persons/${personId}/qualifications`, command)
  return data
}

/** GET /v1/crew/ops-qualifications — the flight crew and their approach category. */
export async function fetchOpsQualifications() {
  const { data } = await client.get('/crew/ops-qualifications')
  return data
}

/**
 * PUT /v1/crew/persons/{id}/approach-category
 *
 * Anything above CAT I is refused without an expiry date: the category is a
 * currency, not an attribute, and the rule lives on the server so that a curl
 * command cannot skip it.
 */
export async function setApproachCategory(personId, command) {
  const { data } = await client.put(`/crew/persons/${personId}/approach-category`, command)
  return data
}
