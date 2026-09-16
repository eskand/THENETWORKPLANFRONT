import client from './client'

/** GET /v1/dispatch/board — the whole screen in one call. */
export async function fetchDispatchBoard({ date, tab, fleet, base }) {
  const { data } = await client.get('/dispatch/board', {
    params: {
      date,
      tab,
      fleet: fleet || undefined,
      base: base || undefined,
    },
  })
  return data
}

/** GET /v1/legs/{id}/readiness — what is missing before this leg can go. */
export async function fetchLegReadiness(legId) {
  const { data } = await client.get(`/legs/${legId}/readiness`)
  return data
}

/** GET /v1/aircraft/{id}/airworthiness — status and open MEL of a tail. */
export async function fetchAirworthiness(aircraftId) {
  const { data } = await client.get(`/aircraft/${aircraftId}/airworthiness`)
  return data
}

/** GET /v1/alerts — the open alert wall. */
export async function fetchOpenAlerts() {
  const { data } = await client.get('/alerts')
  return data
}

/**
 * POST /v1/alerts/{id}/acknowledge — prendre l'alerte en compte.
 *
 * Une vraie ecriture : la ligne sort du mur d'alertes parce que
 * `acked_at` est renseigne en base, pas parce que le navigateur l'a
 * cachee. Fermer l'onglet ne la fait pas revenir.
 */
export async function acknowledgeAlert(alertId) {
  const { data } = await client.post(`/alerts/${alertId}/acknowledge`)
  return data
}
