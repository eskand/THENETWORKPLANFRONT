/**
 * statusLabel() de l'annexe (TNP_DEMO_FINAL_v226_114.html l. 12588-12589) et
 * la classe que sa feuille colore (l. 1487-1492), par ton de statut de la ligne.
 *
 * <p>Un seul domicile pour les deux lecteurs — la pastille de l'en-tête du
 * dossier et la ligne « Status » de la fiche Flight Data — parce que l'annexe
 * n'a qu'une fonction pour les deux.
 */
export const STATUS_PILL = {
  SCHEDULED: ['scheduled', 'Scheduled'],
  ENROUTE: ['enroute', 'In flight'],
  DELAYED: ['delayed', 'Delayed'],
  AOG: ['aog', 'AOG'],
  MAINTENANCE: ['maint', 'Maintenance'],
  CANCELLED: ['cancelled', 'Cancelled'],
}

/** Le libellé de statut d'une ligne ; le statut brut, en casse phrase, sinon. */
export function statusLabel(row) {
  const known = STATUS_PILL[row.statusTone]
  if (known) return known[1]
  const raw = String(row.status ?? '')
  return raw ? raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, ' ') : ''
}

/** La classe de la pastille pour une ligne. */
export function statusPillClass(row) {
  return (STATUS_PILL[row.statusTone] ?? [String(row.status ?? '').toLowerCase()])[0]
}
