/**
 * Les onze codes de vacation, et rien de plus.
 *
 * La liste est celle de la contrainte `ck_roster_code` (V9, etendue par V29)
 * et de l'enum `RosterCode` : FLT, SBY, POS, TRG, OFF, LVE, SICK, OFFICE, RES,
 * DH, SIM. Le « Dead Head » que le prototype annoncait sans pouvoir le poser
 * existe maintenant, et le simulateur ne se cache plus derriere TRG.
 *
 * Un code inconnu n'est pas masque : il s'affiche tel quel, en gris, parce
 * qu'un code non reconnu sur une grille d'equipage est une anomalie a voir.
 */

export const ROSTER_CODES = {
  FLT: { label: 'Flight', colour: 'var(--c-FLT)' },
  POS: { label: 'Positioning', colour: 'var(--c-POS)' },
  SBY: { label: 'Standby', colour: 'var(--c-SBY)' },
  RES: { label: 'Reserved (draft)', colour: 'var(--c-RES)' },
  TRG: { label: 'Training', colour: 'var(--c-TRG)' },
  LVE: { label: 'Leave', colour: 'var(--c-LVE)' },
  SICK: { label: 'Sick', colour: 'var(--c-SICK)' },
  OFF: { label: 'Off', colour: 'var(--c-OFF)' },
  /**
   * OFFICE n'est plus propose ni annonce : le prototype ne connait pas ce
   * type, et aucune cellule ne le porte. Il reste decrit ici parce que la
   * contrainte ck_roster_code l'accepte toujours — une cellule qui arriverait
   * d'un import doit se dessiner avec son nom et sa couleur, pas tomber dans
   * le gris des codes inconnus.
   */
  OFFICE: { label: 'Office / ground', colour: 'var(--c-OFFICE)' },
  DH: { label: 'Dead head', colour: 'var(--c-DH)' },
  SIM: { label: 'Simulator', colour: 'var(--c-SIM)' },
}

/** L'ordre de la legende : le travail d'abord, l'absence ensuite. */
export const LEGEND_ORDER = ['FLT', 'POS', 'DH', 'SBY', 'RES', 'TRG', 'SIM', 'OFF', 'LVE', 'SICK']

export function codeColour(code) {
  return ROSTER_CODES[code]?.colour ?? 'var(--text-faint)'
}

export function codeLabel(code) {
  return ROSTER_CODES[code]?.label ?? code
}

/**
 * Les rangs, dans l'ordre du prototype : commandants, copilotes, chef de
 * cabine, cabine, puis tout role que le serveur renverrait et que cette liste
 * ne connait pas — jamais ecarte, juste place a la fin.
 */
const RANK_ORDER = ['CAPTAIN', 'FIRST_OFFICER', 'PURSER', 'CABIN']

const RANK_LABEL = {
  CAPTAIN: 'Captains (CPT)',
  FIRST_OFFICER: 'First officers (FO)',
  PURSER: 'Purser',
  CABIN: 'Cabin crew',
}

export function groupByRank(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = row.mainRole ?? 'OTHER'
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const ia = RANK_ORDER.indexOf(a[0])
      const ib = RANK_ORDER.indexOf(b[0])
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
    .map(([role, list]) => ({
      role,
      label: RANK_LABEL[role] ?? role.replaceAll('_', ' '),
      rows: list.sort((a, b) => a.fullName.localeCompare(b.fullName)),
    }))
}

/** « Ben Arbia Y. » -> « BA ». Deux lettres, jamais une de plus. */
export function initials(fullName) {
  const parts = String(fullName ?? '')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Le rang en trois lettres — « CAP », « FO » — comme sur la ligne du
 * prototype. Un rang inconnu garde son nom entier plutot que d'etre tronque a
 * l'aveugle : « PILOTE STAGIAIRE » vaut mieux que « PIL ».
 */
const SHORT_ROLE = {
  CAPTAIN: 'CAP',
  FIRST_OFFICER: 'FO',
  PURSER: 'PUR',
  CABIN: 'CC',
}

export function shortRole(role) {
  if (!role) return ''
  return SHORT_ROLE[role] ?? String(role).replaceAll('_', ' ')
}

/**
 * L'encre a poser sur la couleur d'un code.
 *
 * Trois codes ont un fond clair — l'or de la reserve, le gris du repos, l'or du
 * standby. Du blanc dessus ne se lit pas : le prototype ecrivait « R » en
 * sombre sur son bandeau dore pour cette raison. Le reste est assez fonce pour
 * porter du blanc.
 */
const LIGHT_CODES = new Set(['OFF', 'RES', 'SBY'])

export function codeInk(code) {
  return LIGHT_CODES.has(code) ? '#1a2036' : '#ffffff'
}

/** Vrai quand le fond du code est clair : ce qu'on dessine dessus doit foncer. */
export function isLightCode(code) {
  return LIGHT_CODES.has(code)
}
