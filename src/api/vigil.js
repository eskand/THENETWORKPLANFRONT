import client from './client'

/**
 * VIGIL — l'intelligence operationnelle continue, cote serveur.
 *
 * <p>L'annexe la faisait tourner dans un Web Worker du navigateur, faute de
 * serveur, et le disait : « The moment NetPlus gains a server,
 * VIGIL.core.scan() […] are the two entry points to move server-side. »
 * C'est fait : le balayage lit la base, les alertes y survivent au
 * rechargement, et deux postes voient les memes.
 */

/** GET /v1/vigil/panel — balaye le programme du jour et rend le panneau. */
export async function fetchVigilPanel() {
  const { data } = await client.get('/vigil/panel')
  return data
}

/** POST /v1/vigil/alerts/{id}/status — Acknowledge · In progress · Resolve · Dismiss. */
export async function setVigilAlertStatus(alertId, status) {
  const { data } = await client.post(`/vigil/alerts/${alertId}/status`, { status })
  return data
}

/** POST /v1/vigil/ask — « Ask VIGIL ». */
export async function askVigil(question) {
  const { data } = await client.post('/vigil/ask', { question })
  return data
}
