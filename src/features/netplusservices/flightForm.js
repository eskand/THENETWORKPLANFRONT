import { isoDate } from '../../lib/format'

/**
 * Le dossier de vol de l'onglet Flight Analysis.
 *
 * Il vit dans la page, pas dans l'onglet : un onglet est demonte des qu'on
 * le quitte, et un dispatcher qui va verifier une escale dans My Flights ne
 * doit pas retrouver son formulaire vide en revenant. C'est la meme raison
 * pour laquelle le prototype gardait ses champs dans le composant racine.
 */
export function emptyFlightForm() {
  return {
    dep: '',
    dest: '',
    stops: '',
    stopKind: 'TECH',
    etd: '08:00',
    date: isoDate(new Date()),
    flightType: 'N',
    operation: 'PAX',
    registration: '',
    operator: '',
    callsign: '',
    acType: '',
    mtow: '',
    pax: '',
    cargo: '',
    cruiseFl: '',
    cruiseKt: '',
    mach: '',
    avoidFir: '',
    route: '',
  }
}
