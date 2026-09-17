/**
 * Le vocabulaire des onglets SERVICES et OVF PERMIT, tel que l'annexe l'ecrit.
 *
 * <b>Les libelles sont ceux de l'annexe</b> (prototype l. 12644 pour les types
 * de service, l. 12665 pour les fournisseurs, l. 12741 pour les statuts,
 * l. 12750 pour les pays) : ce sont ceux qu'un agent d'exploitation lit dans les
 * listes deroulantes, et les traduire les rendrait introuvables.
 *
 * <b>Les valeurs stockees sont celles du serveur.</b> L'annexe tient ses lignes
 * dans un objet du navigateur et peut se permettre d'y ecrire « Ground
 * Handling » ; ici chaque ligne est une demande en base, dont le type appartient
 * a {@code tripsupport.service_requests.service_type} et le cycle de vie a
 * {@code RequestStatus}. La table ci-dessous est donc le seul endroit ou les
 * deux se rencontrent.
 */

/* ───────────────────────── les types de service ─────────────────────────── */

/**
 * SERVICE_TYPES_BASE de l'annexe, dans son ordre, avec en regard la valeur
 * stockee. Les quatre dernieres ont ete ajoutees a l'enumeration du serveur par
 * la migration V56 : l'annexe les proposait deja et elles n'etaient pas
 * enregistrables.
 */
export const SERVICE_TYPES = [
  { value: 'HANDLING', label: 'Ground Handling' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'CUSTOMS', label: 'Customs & Security' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'PARKING', label: 'Parking / Stand' },
  { value: 'DEICING', label: 'De-Icing' },
  { value: 'CREW_TRANSPORT', label: 'Crew Transport' },
  { value: 'PPR', label: 'PPR' },
  { value: 'APIS', label: 'APIS' },
  { value: 'AIRPORT_SLOT', label: 'Airport Slot' },
  { value: 'LANDING_PERMIT', label: 'Landing Permit' },
  { value: 'PAX_TRANSPORT', label: 'Pax Transport' },
]

/**
 * Les deux lignes que le Royaume-Uni ajoute — getServiceTypesFor() de l'annexe
 * (l. 12651) les concatene quand l'aerodrome est britannique. Les series
 * americaine (EAPIS, CBP Clearance) et caraibe (CARICOM) de la meme fonction ne
 * sont pas reprises : le serveur ne les stocke pas, et une ligne qu'on ne peut
 * pas enregistrer n'a rien a faire dans la liste.
 */
const UK_SERVICE_TYPES = [
  { value: 'GAR', label: 'GAR' },
  { value: 'FCP', label: 'FCP' },
]

/** Les types offerts a une escale donnee, dans l'ordre de l'annexe. */
export function serviceTypesFor(icao) {
  const uk = typeof icao === 'string' && icao.toUpperCase().startsWith('EG')
  return uk ? [...SERVICE_TYPES, ...UK_SERVICE_TYPES] : SERVICE_TYPES
}

export function serviceTypeLabel(value) {
  const all = [...SERVICE_TYPES, ...UK_SERVICE_TYPES]
  return all.find((type) => type.value === value)?.label ?? value
}

/**
 * La clef que la feuille de l'annexe lit pour choisir l'icone de la ligne :
 * `.fd-row.interactive[data-key^="ground"]`, `[^="fuel"]`, `[^="customs"]`,
 * `[^="catering"]`, `[^="parking"]` (flightpanel.css). Cote annexe la clef etait
 * « groundDep », « fuelArr » … ; ici elle est derivee du type stocke, pour que
 * la meme icone sorte sans avoir a inventer des identifiants de ligne.
 */
export function serviceIconKey(value) {
  switch (value) {
    case 'HANDLING': return 'ground'
    case 'FUEL': return 'fuel'
    case 'CUSTOMS': return 'customs'
    case 'CATERING': return 'catering'
    case 'PARKING': return 'parking'
    default: return 'service'
  }
}

/* ───────────────────────────── les fournisseurs ─────────────────────────── */

/**
 * SUPPLIERS_BY_SERVICE de l'annexe (l. 12665), par valeur stockee.
 *
 * Il ne sert que de repli : la liste affichee vient d'abord de l'annuaire du
 * locataire (GET /v1/netplus-services/suppliers?station=…), qui est le seul a
 * savoir avec qui l'exploitant a reellement un contrat a cette escale. Le repli
 * evite qu'une escale absente de l'annuaire offre une liste vide.
 */
export const SUPPLIERS_BY_SERVICE = {
  HANDLING: ['The Network Plan', 'Swissport', 'Menzies Aviation', 'dnata', 'Celebi', 'Airport Authority'],
  FUEL: ['World Fuel Services', 'AvFuel', 'Shell Aviation', 'Total Energies', 'Airport Authority'],
  CUSTOMS: ['Airport Authority', 'Border Police', 'Customs Office'],
  CATERING: ['Do&Co', 'Gate Gourmet', 'LSG Sky Chefs', 'Newrest'],
  PARKING: ['Airport Authority'],
  DEICING: ['Swissport', 'Menzies Aviation', 'Airport Authority'],
  CREW_TRANSPORT: ['Airport Authority', 'Local Ground Transport Co.'],
  PPR: ['Airport Authority', 'Local Security Office'],
  APIS: ['Airport Authority', 'The Network Plan'],
  AIRPORT_SLOT: ['Airport Authority', 'The Network Plan', 'Universal Aviation'],
  LANDING_PERMIT: ['The Network Plan', 'CAA', 'Universal Aviation', 'UAS International Trip Support', 'ARINC Direct'],
  PAX_TRANSPORT: ['Airport Authority', 'Local Ground Transport Co.'],
  GAR: ['Airport Authority', 'Border Force'],
  FCP: ['Airport Authority', 'Border Force'],
  OVERFLIGHT: ['The Network Plan', 'CAA', 'Universal Aviation', 'UAS International Trip Support', 'ARINC Direct'],
  LANDING: ['The Network Plan', 'CAA', 'Universal Aviation', 'UAS International Trip Support', 'ARINC Direct'],
}

/* ─────────────────────────────── les statuts ────────────────────────────── */

/**
 * SERVICE_STATUS_OPTIONS de l'annexe (l. 12741), avec la valeur que le serveur
 * stocke en regard et la classe de couleur que la feuille attend.
 *
 * <b>Deux entrees de l'annexe manquent</b>, « N/A » et « Cancel ». Elles ne
 * decrivent pas l'etat d'une demande : elles disent que la ligne n'aurait pas du
 * exister. Le serveur n'a donc rien a stocker pour elles, et le geste
 * correspondant est la croix de la ligne, qui la supprime.
 */
export const REQUEST_STATUSES = [
  { value: 'DRAFT', label: 'Not Actioned', cls: 'gray' },
  { value: 'SENT', label: 'Pending', cls: 'amber' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged', cls: 'amber' },
  { value: 'CONFIRMED', label: 'Confirmed', cls: 'green' },
  { value: 'REFUSED', label: 'Denied', cls: 'red' },
]

export function statusMeta(value) {
  return REQUEST_STATUSES.find((status) => status.value === value)
    ?? { value, label: value, cls: 'gray' }
}

/**
 * Les passages que le serveur accepte (RequestStatusTransition) : la liste
 * deroulante ne propose que ceux-la, plutot que d'offrir un choix qui reviendrait
 * en erreur. Un statut inchange est toujours permis.
 */
const ALLOWED_TRANSITIONS = {
  DRAFT: ['SENT'],
  SENT: ['ACKNOWLEDGED', 'CONFIRMED', 'REFUSED'],
  ACKNOWLEDGED: ['CONFIRMED', 'REFUSED'],
  CONFIRMED: ['REFUSED'],
  REFUSED: ['SENT'],
}

export function statusOptionsFrom(current) {
  const reachable = ALLOWED_TRANSITIONS[current] ?? []
  return REQUEST_STATUSES.filter(
    (status) => status.value === current || reachable.includes(status.value),
  )
}

/* ────────────────────────────── les permis ──────────────────────────────── */

/** PERMIT_COUNTRY_LIST de l'annexe (l. 12750), triee comme elle la trie. */
export const PERMIT_COUNTRIES = [
  { iso2: 'DZ', name: 'Algeria' },
  { iso2: 'BH', name: 'Bahrain' },
  { iso2: 'BE', name: 'Belgium' },
  { iso2: 'CA', name: 'Canada' },
  { iso2: 'CY', name: 'Cyprus' },
  { iso2: 'EG', name: 'Egypt' },
  { iso2: 'FR', name: 'France' },
  { iso2: 'DE', name: 'Germany' },
  { iso2: 'GR', name: 'Greece' },
  { iso2: 'IE', name: 'Ireland' },
  { iso2: 'IT', name: 'Italy' },
  { iso2: 'JO', name: 'Jordan' },
  { iso2: 'KW', name: 'Kuwait' },
  { iso2: 'LB', name: 'Lebanon' },
  { iso2: 'LY', name: 'Libya' },
  { iso2: 'MT', name: 'Malta' },
  { iso2: 'MA', name: 'Morocco' },
  { iso2: 'NL', name: 'Netherlands' },
  { iso2: 'OM', name: 'Oman' },
  { iso2: 'PT', name: 'Portugal' },
  { iso2: 'QA', name: 'Qatar' },
  { iso2: 'SA', name: 'Saudi Arabia' },
  { iso2: 'ES', name: 'Spain' },
  { iso2: 'SD', name: 'Sudan' },
  { iso2: 'CH', name: 'Switzerland' },
  { iso2: 'TN', name: 'Tunisia' },
  { iso2: 'TR', name: 'Turkey' },
  { iso2: 'AE', name: 'United Arab Emirates' },
  { iso2: 'GB', name: 'United Kingdom' },
  { iso2: 'US', name: 'United States' },
]

export function countryName(iso2) {
  return PERMIT_COUNTRIES.find((country) => country.iso2 === iso2)?.name ?? iso2
}

/** PermitKind — l'annexe n'ouvre que le survol sous cet onglet, mais le
 *  serveur distingue le survol de l'atterrissage et la ligne le dit. */
export const PERMIT_KINDS = [
  { value: 'OVERFLIGHT', label: 'Overflight' },
  { value: 'LANDING', label: 'Landing' },
]
