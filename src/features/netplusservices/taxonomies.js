/**
 * Les deux taxonomies de l'ecran, reprises du prototype sans retouche.
 *
 * Le type de vol est celui de l'Item 8 du plan de vol OACI ; le type
 * d'operation est la nature du transport. Dans le prototype, le formulaire de
 * lancement de Sales lit ces memes listes (`NPS_FLIGHT_TYPES` /
 * `NPS_OPERATIONS`, exposees sur `window`) : modifier l'une changeait l'autre.
 *
 * Elles vivent ici en attendant le portage du moteur permis/ASA (S10), apres
 * quoi elles devront venir du serveur : un type de vol qui decide d'un permis
 * est une donnee de reference, pas une constante de front.
 */

export const FLIGHT_TYPES = [
  ['S', 'Scheduled'],
  ['N', 'Non-scheduled (charter)'],
  ['G', 'Private / non-commercial'],
  ['M', 'Medevac / humanitarian'],
  ['X', 'State flight'],
]

export const OPERATIONS = [
  ['PAX', 'Passenger'],
  ['CARGO', 'Cargo'],
  ['FERRY', 'Ferry / positioning'],
  ['TRAINING', 'Training'],
  ['MAINT', 'Maintenance'],
]
