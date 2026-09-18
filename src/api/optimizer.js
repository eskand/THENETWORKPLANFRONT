import client from './client'

/**
 * Le Timeline Optimizer — `TNPOptimizer` de l'annexe (l. 95582), cote serveur.
 *
 * <p>L'analyse n'ecrit rien : elle lit le plan et rend une proposition. Les
 * instructions « applicables » passent ensuite par les routes ordinaires de
 * l'etape (changement d'appareil, re-horodatage, annulation), une par une.
 */

/** GET /v1/timeline/optimize/setup — modules lus, perimetres, couts par defaut. */
export async function fetchOptimizerSetup() {
  const { data } = await client.get('/timeline/optimize/setup')
  return data
}

/** POST /v1/timeline/optimize — « Analyse & propose optimizations ». */
export async function runOptimization(command) {
  const { data } = await client.post('/timeline/optimize', command)
  return data
}

/* Les trois gestes que la proposition peut appliquer d'elle-meme. */

/** PATCH /v1/legs/{id}/aircraft — SWAP AIRCRAFT. */
export async function changeLegAircraft(legId, registration, reason) {
  const { data } = await client.patch(`/legs/${legId}/aircraft`, { registration, reason })
  return data
}

/** PATCH /v1/legs/{id}/schedule — RE-TIME. */
export async function moveLeg(legId, std, sta, reason) {
  const { data } = await client.patch(`/legs/${legId}/schedule`, { std, sta, reason })
  return data
}

/** PATCH /v1/legs/{id}/cancel — CANCEL (ferry). */
export async function cancelLeg(legId, reason) {
  const { data } = await client.patch(`/legs/${legId}/cancel`, { reason })
  return data
}
