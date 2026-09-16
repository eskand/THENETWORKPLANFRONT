import client from './client'

/** GET /v1/training/compliance — the whole matrix in one call. */
export async function fetchTrainingCompliance() {
  const { data } = await client.get('/training/compliance')
  return data
}

/** GET /v1/training/sessions?from&to — the training calendar. */
export async function fetchTrainingSessions({ from, to } = {}) {
  const { data } = await client.get('/training/sessions', {
    params: { from: from || undefined, to: to || undefined },
  })
  return data
}

/** GET /v1/training/courses — the catalogue. */
export async function fetchTrainingCourses() {
  const { data } = await client.get('/training/courses')
  return data
}

/** GET /v1/training/persons/{id} — one training file. */
export async function fetchPersonTraining(personId) {
  const { data } = await client.get(`/training/persons/${personId}`)
  return data
}

/** POST /v1/training/sessions/{id}/enrolments */
export async function enrolOnSession(sessionId, personId) {
  const { data } = await client.post(`/training/sessions/${sessionId}/enrolments`, { personId })
  return data
}
