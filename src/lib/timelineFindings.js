import { hhmm } from './format'

/**
 * Ce que l'optimiseur trouve dans le plan affiche.
 *
 * <b>Pourquoi ce fichier n'est pas le portage du prototype.</b> Le bouton
 * « Optimize » du prototype (l. 7653) ouvre `TNPOptimizer`, qui appelle
 * `Benchmark.run` — et le moteur enregistre derriere est declare
 * `{ name:'Stub Engine (pipeline test)', stub:true }`, avec pour coeur
 * `var solveRate = 0.6 + Math.random()*0.25` (l. 90784-90790). L'audit de
 * l'annexe A3 le releve en propres termes — « le moteur d'optimisation est un
 * stub aleatoire », « les gains monetaires affiches reposent sur un tirage
 * aleatoire » — et demande au §6.4 « le retrait du stub des ecrans de
 * production ». Reproduire ce moteur reviendrait a afficher un score sur 100
 * et des dollars economises tires au hasard.
 *
 * <b>Ce qui est porte, parce que c'est vrai.</b> Le prototype contient, sous le
 * stub, une verification de continuite reelle (`canHostLeg`, l. 90805) : une
 * etape ne peut rejoindre un avion que si la precedente atterrit la ou celle-ci
 * decolle, et qu'aucune ne se chevauche — sinon l'avion se teleporte. C'est
 * cette regle-la, plus les etats que le serveur pose deja sur chaque segment,
 * qui produisent les constats ci-dessous.
 *
 * <b>Aucun chiffre n'est invente.</b> Pas de score sur 100, pas d'economies :
 * une liste de faits, chacun rattache a une etape et a un avion, que le
 * dispatcher peut verifier sur la grille. Rien n'est ecrit nulle part — c'est
 * la seule promesse du prototype que l'on tient sans reserve.
 */

/** Du plus grave au moins grave : l'ordre dans lequel un OCC traite sa journee. */
export const SEVERITY = ['BLOCKING', 'WARNING', 'WATCH']

const META = {
  CONTINUITY: {
    severity: 'BLOCKING',
    label: 'Aircraft continuity broken',
    rule: 'A leg departs where the tail is not',
  },
  OVERLAP: {
    severity: 'BLOCKING',
    label: 'Overlapping legs',
    rule: 'One tail, two legs, same minutes',
  },
  GROUNDED: {
    severity: 'BLOCKING',
    label: 'Leg planned on a grounded tail',
    rule: 'Aircraft AOG or in maintenance',
  },
  MEL_BLOCKING: {
    severity: 'BLOCKING',
    label: 'Dispatch-blocking MEL',
    rule: 'Open MEL item forbids dispatch',
  },
  FTL_BREACH: {
    severity: 'BLOCKING',
    label: 'Crew FTL breach',
    rule: 'ORO.FTL verdict returned BREACH',
  },
  NO_CREW: {
    severity: 'WARNING',
    label: 'No crew assigned',
    rule: 'The leg carries no seat',
  },
  FTL_WARNING: {
    severity: 'WARNING',
    label: 'Crew FTL warning',
    rule: 'ORO.FTL verdict returned WARNING',
  },
  TIGHT: {
    severity: 'WATCH',
    label: 'Turnaround below the minimum',
    rule: 'Ground time under the operator floor',
  },
  DELAY: {
    severity: 'WATCH',
    label: 'Running late',
    rule: 'Departure later than the schedule',
  },
}

const GROUNDED = new Set(['AOG', 'MAINTENANCE'])

function at(segment) {
  return `${hhmm(segment.startsAt)}–${hhmm(segment.endsAt)}Z`
}

/**
 * Les constats du plan affiche.
 *
 * On ne lit que ce que le serveur a deja pose sur chaque segment : rien n'est
 * recalcule ici, et surtout aucun verdict FTL n'est rendu par le navigateur —
 * `ftlStatus` vient du serveur, et la ou il vaut UNKNOWN on dit « personne
 * n'est affecte », pas « c'est illegal ».
 */
export function findTimelineIssues(data) {
  const findings = []
  const add = (type, row, segment, detail) =>
    findings.push({
      id: `${type}-${segment?.legId ?? segment?.startsAt}-${row.registration}`,
      type,
      ...META[type],
      registration: row.registration,
      icaoType: row.icaoType,
      flightNo: segment?.flightNo ?? null,
      legId: segment?.legId ?? null,
      when: segment ? at(segment) : null,
      detail,
    })

  for (const row of data?.rows ?? []) {
    const legs = (row.segments ?? [])
      .filter((segment) => segment.kind !== 'GROUND')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

    legs.forEach((segment, index) => {
      if (GROUNDED.has(row.status)) {
        add('GROUNDED', row, segment,
          `${row.registration} is ${row.status}${row.statusReason ? ` — ${row.statusReason}` : ''}, and still carries ${segment.flightNo}.`)
      }
      if (segment.melBlocking) {
        add('MEL_BLOCKING', row, segment,
          `${segment.melReference} is open on ${row.registration} and blocks dispatch of ${segment.flightNo}.`)
      }
      if (segment.ftlStatus === 'BREACH') {
        add('FTL_BREACH', row, segment,
          `The crew of ${segment.flightNo} is outside ORO.FTL limits.`)
      } else if (segment.ftlStatus === 'WARNING') {
        add('FTL_WARNING', row, segment,
          `The crew of ${segment.flightNo} is inside limits but without margin.`)
      } else if (segment.ftlStatus === 'UNKNOWN') {
        add('NO_CREW', row, segment,
          `${segment.flightNo} has no seat filled, so no FTL verdict can exist for it.`)
      }
      if (segment.delayMinutes > 0) {
        add('DELAY', row, segment,
          `${segment.flightNo} is ${segment.delayMinutes} min behind schedule.`)
      }

      // La continuite : l'etape precedente doit atterrir la ou celle-ci decolle.
      const previous = legs[index - 1]
      if (previous && previous.arrIcao && segment.depIcao && previous.arrIcao !== segment.depIcao) {
        add('CONTINUITY', row, segment,
          `${previous.flightNo} lands at ${previous.arrIcao}, ${segment.flightNo} departs from ${segment.depIcao}. The tail cannot be in both places.`)
      }
      // Le chevauchement : un avion ne vole pas deux etapes a la fois.
      if (previous && previous.endsAt > segment.startsAt) {
        add('OVERLAP', row, segment,
          `${previous.flightNo} is still airborne when ${segment.flightNo} is planned to depart.`)
      }
    })

    for (const segment of row.segments ?? []) {
      if (segment.kind === 'GROUND' && segment.tight) {
        add('TIGHT', row, segment,
          `${segment.minutes} min on the ground at ${segment.depIcao ?? row.baseIcao ?? 'station'}, under the operator minimum of ${data.minimumTurnaroundMinutes} min.`)
      }
    }
  }

  const rank = (finding) => SEVERITY.indexOf(finding.severity)
  findings.sort((a, b) => rank(a) - rank(b) || a.registration.localeCompare(b.registration))
  return findings
}

/** Le compte par gravite, pour l'en-tete du panneau et la pastille du bouton. */
export function countBySeverity(findings) {
  const counts = { BLOCKING: 0, WARNING: 0, WATCH: 0 }
  for (const finding of findings) counts[finding.severity] += 1
  return counts
}
