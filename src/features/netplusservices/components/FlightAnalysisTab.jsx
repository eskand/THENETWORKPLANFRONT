import { useCallback } from 'react'
import FlightDetailsForm from './FlightDetailsForm'
import MiniBriefing from './MiniBriefing'
import RouteOverviewMap from './RouteOverviewMap'

/**
 * FLIGHT ANALYSIS — les trois colonnes.
 *
 * Le dossier est tenu par la page (voir ../flightForm.js) : le formulaire
 * l'ecrit, la carte et le briefing le lisent. Une seule source pour l'ecran,
 * comme cote serveur un seul chemin d'ecriture par fait.
 *
 * Le bouton RUN ANALYSIS est present et desactive : l'endpoint qui rendra le
 * verdict n'existe pas encore (sprint S10). Un bouton actif qui ne ferait
 * rien serait pire qu'un bouton grise qui dit pourquoi.
 */
export default function FlightAnalysisTab({ form, setForm, distanceNm, setDistanceNm, onImport }) {
  const set = useCallback(
    (key, value) => setForm((previous) => ({ ...previous, [key]: value })),
    [setForm],
  )

  const swap = useCallback(
    () => setForm((previous) => ({ ...previous, dep: previous.dest, dest: previous.dep })),
    [setForm],
  )

  const ready = form.dep.length === 4 && form.dest.length === 4 && form.registration.trim() !== ''

  return (
    <div className="nps__body">
      <div className="nps__col-form">
        <div className="nps__panel-head">
          <span className="nps__panel-title">✈ Flight details</span>
          <button type="button" className="nps__btn" onClick={onImport}>
            ⬇ Import flight
          </button>
        </div>

        <FlightDetailsForm form={form} set={set} onSwap={swap} />

        <div style={{ padding: '0 15px 18px' }}>
          <button
            type="button"
            className="nps__btn nps__btn--primary"
            disabled
            title={
              ready
                ? "Le moteur permis/ASA n'est pas encore porte cote serveur (sprint S10)"
                : 'Renseignez depart, destination et immatriculation'
            }
          >
            Run analysis
          </button>
          <div className="nps__brief-eyebrow" style={{ marginTop: 7, textAlign: 'center' }}>
            {ready ? 'Engine not connected — S10' : 'Departure · destination · registration'}
          </div>
        </div>
      </div>

      <div className="nps__col-main">
        <RouteOverviewMap dep={form.dep} dest={form.dest} onDistance={setDistanceNm} />
      </div>

      <div className="nps__col-side">
        <MiniBriefing form={form} distanceNm={distanceNm} />
      </div>
    </div>
  )
}

