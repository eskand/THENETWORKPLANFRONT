/**
 * Tout ce que l'OCC Dashboard affiche est derive de la reponse de
 * GET /v1/dispatch/board — le seul endpoint qui existe reellement.
 *
 * Regle tenue partout dans ce fichier : un chiffre affiche est un chiffre que
 * la base a repondu, ou bien il vaut null et l'ecran le dit. Le defaut le plus
 * grave du prototype audite etait de montrer des valeurs credibles qui ne
 * venaient de nulle part ; une tuile honnetement vide vaut mieux qu'une tuile
 * convaincante et fausse.
 */


const flightsOnly = (rows) => rows.filter((row) => row.kind !== 'GROUND')

function toTime(iso) {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : time
}

/** Le creneau de depart retenu : l'estime s'il existe, sinon le programme. */
function departureTime(row) {
  return toTime(row.etd) ?? toTime(row.std)
}

/**
 * La ponctualite n'est plus calculee ici.
 *
 * Le serveur la mesure (DispatchBoardService.onTimePerformance) sur les
 * seules etapes reellement parties, avec la tolerance de l'exploitant, et
 * renvoie le chiffre, la taille de l'echantillon, celui d'hier et la cible.
 * Deux definitions de « a l'heure » dans un meme produit, c'est deux chiffres
 * differents le jour ou quelqu'un les compare.
 */

/** Departs par heure UTC, pour la courbe de la premiere tuile. */
function departuresByHour(rows) {
  const buckets = new Array(24).fill(0)
  flightsOnly(rows).forEach((row) => {
    const time = departureTime(row)
    if (time === null) return
    buckets[new Date(time).getUTCHours()] += 1
  })
  return buckets
}

export function sparklinePoints(values, width = 100, height = 26) {
  if (!values || values.length === 0) return ''
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  return values
    .map((value, index) => {
      const x = (index * step).toFixed(1)
      const y = (height - (value / max) * (height - 2) - 1).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
}

export function deriveOcc(board) {
  const rows = board?.rows ?? []
  const kpi = board?.kpi ?? null
  const flights = flightsOnly(rows)

  const airborne = flights.filter(
    (row) => row.statusTone === 'ENROUTE' && toTime(row.atd) !== null && toTime(row.ata) === null,
  )
  const tailsAirborne = new Set(airborne.map((row) => row.registration)).size

  const aogRows = rows.filter((row) => row.statusTone === 'AOG')
  const maintenanceRows = rows.filter((row) => row.statusTone === 'MAINTENANCE')
  const delayedRows = flights.filter((row) => row.statusTone === 'DELAYED')

  const tails = kpi?.tails ?? null

  // Availability is measured on the whole fleet, not on the tails that flew.
  // Subtracting the grounded aircraft from the tails of the day counted them
  // twice — a grounded tail is not in the day's programme in the first place.
  const fleetSize = kpi?.fleetSize ?? null
  const outOfService = (kpi?.aog ?? aogRows.length) + (kpi?.maintenance ?? maintenanceRows.length)
  const inService = fleetSize === null ? null : Math.max(fleetSize - outOfService, 0)
  const availability =
    fleetSize === null || fleetSize === 0 ? null : Math.round((inService / fleetSize) * 100)

  const crewRows = flights.filter(
    (row) => row.crewAssigned === false || (row.crewFtlStatus && row.crewFtlStatus !== 'OK'),
  )
  const crewCritical = crewRows.filter(
    (row) => row.crewAssigned === false || row.crewFtlStatus === 'BREACH',
  )

  const withCtot = flights.filter((row) => Boolean(row.ctot))

  const upcoming = flights
    .filter((row) => toTime(row.atd) === null && departureTime(row) !== null)
    .map((row) => ({ row, at: departureTime(row) }))
    .sort((a, b) => a.at - b.at)

  const disruptions = [...aogRows, ...delayedRows, ...maintenanceRows]

  // La comparaison « vs yesterday » n'a de sens que si hier a ete une journee
  // d'exploitation. Zero etape hier ne veut pas dire zero vol : cela veut dire
  // que la base n'a rien a comparer. Les puces disparaissent alors, plutot que
  // d'annoncer un « +32 » qui ne mesure que l'absence de programme.
  const flewYesterday = (kpi?.flightsYesterday ?? 0) > 0

  return {
    kpi,
    hasBoard: Boolean(board),
    activeFlights: kpi?.flightsToday ?? flights.length,
    tails,
    fleetSize,
    tailsAirborne,
    inService,
    outOfService,
    availability,
    delayed: kpi?.delayed ?? delayedRows.length,
    delayedFlightNos: delayedRows.map((row) => row.flightNo).filter(Boolean),
    aog: kpi?.aog ?? aogRows.length,
    aogRegistrations: [...new Set(aogRows.map((row) => row.registration).filter(Boolean))],
    maintenance: kpi?.maintenance ?? maintenanceRows.length,
    otp: {
      value: kpi?.otpPercent ?? null,
      sample: kpi?.otpSample ?? 0,
      yesterday: flewYesterday ? (kpi?.otpYesterdayPercent ?? null) : null,
      target: kpi?.otpTargetPercent ?? null,
    },
    flightsYesterday: flewYesterday ? kpi.flightsYesterday : null,
    delayedYesterday: flewYesterday ? (kpi?.delayedYesterday ?? null) : null,
    crewAlerts: crewRows,
    crewCritical,
    withCtot,
    upcoming,
    disruptions,
    departuresByHour: departuresByHour(rows),
    bases: board?.bases ?? [],
  }
}
