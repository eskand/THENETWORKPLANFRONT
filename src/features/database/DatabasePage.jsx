import { useState } from 'react'
import TopBar from '../../components/TopBar'
import FleetRegister from './components/FleetRegister'
import AircraftReference from './components/AircraftReference'
import ReferenceSets from './components/ReferenceSets'
import '../../styles/database.css'

const TABS = [
  ['FLEET', 'Fleet Register'],
  ['REFERENCE', 'Aircraft reference'],
  ['SETS', 'Reference sets'],
]

/**
 * Database.
 *
 * <b>Le registre de flotte</b> reprend l'onglet du prototype (annexe A4,
 * viewDatabase l. 5996) : mêmes colonnes, même regroupement par famille, mêmes
 * chiffres — parce qu'ils viennent maintenant de la même source, les 308 fiches
 * de la base avion unique.
 *
 * <b>L'onglet « Reference sets »</b> n'existe pas chez lui. Il répond à une
 * question que l'audit posait et à laquelle rien ne répondait : quel jeu de
 * référence est réellement chargé, qui en est propriétaire, et qu'est-ce qui
 * casse quand il est vide. Le prototype avait deux annuaires d'aérodromes
 * concurrents et aucun moyen de savoir lequel servait.
 */
export default function DatabasePage() {
  const [tab, setTab] = useState('FLEET')

  return (
    <>
      <TopBar
        title="Aircraft Database — Fleet Register"
        subtitle="The Network Plan Airlines · type specifications, MTOW, runway minima and status"
      />

      <div className="db-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} type="button"
                  className={tab === key ? 'db-tab db-tab--active' : 'db-tab'}
                  onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'FLEET' ? <FleetRegister /> : null}
      {tab === 'REFERENCE' ? <AircraftReference /> : null}
      {tab === 'SETS' ? <ReferenceSets /> : null}
    </>
  )
}
