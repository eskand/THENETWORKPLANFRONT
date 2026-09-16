import { useState } from 'react'
import { Globe, LayoutGrid, PlaneTakeoff, Timer } from 'lucide-react'
import TopBar from '../../components/TopBar'
import AirportSlotTab from './components/AirportSlotTab'
import EntryRequirementTab from './components/EntryRequirementTab'
import FlightAnalysisTab from './components/FlightAnalysisTab'
import MyFlightsTab from './components/MyFlightsTab'
import { emptyFlightForm } from './flightForm'
import '../../styles/netplus.css'

/**
 * NetPlus Services / OP-CLEARANCE.
 *
 * L'ecran du prototype (A4, `#opc-root`), porte en React 19 : quatre onglets,
 * trois colonnes sur Flight Analysis, la carte Leaflet, le mini briefing.
 *
 * Deux choses ont change en passant, et elles sont volontaires.
 *
 * 1. LA PEAU NE DETEINT PAS. Le prototype scopait ses styles sous `#opc-root`
 *    pour ne pas contaminer la suite ; ici tout est sous `.nps`, et aucune
 *    variable de theme.css n'est touchee. Les 22 autres ecrans ne bougent pas.
 *
 * 2. RIEN N'EST CALCULE ICI. Le moteur des sept couches (CZIB, sanctions et
 *    bilateraux, droit aerien, creneaux WASG, PPR, procedures par pays,
 *    documents) n'est pas encore porte cote Spring : c'est le sprint S10,
 *    prepare dans docs/ports/permis-asa.md. Les valeurs qu'il produira
 *    s'affichent donc a « — », et chaque onglet dit pourquoi. Un ecran qui
 *    invente des chiffres plausibles est plus dangereux qu'un ecran vide.
 *
 * Les pastilles de l'en-tete suivent la meme regle. Dans le prototype elles
 * annoncent l'edition des bases embarquees (WASG 2026-06-03, RAD 2609, CZIB
 * au 31/01/2027). Ces bases ne sont pas en base de donnees : les pastilles
 * disent donc « not loaded », ce qui est l'information juste.
 */

const TABS = [
  { key: 'analysis', label: 'Flight analysis', Icon: LayoutGrid },
  { key: 'myflights', label: 'My flights', Icon: PlaneTakeoff },
  { key: 'slot', label: 'Airport slot', Icon: Timer },
  { key: 'entry', label: 'Entry requirement', Icon: Globe },
]

const REFERENCE_CHIPS = [
  {
    key: 'wasg',
    label: 'WASG',
    state: 'not loaded',
    title: 'Annexe 12.7 du WASG — niveaux de coordination des aerodromes. Pas encore en base (S10).',
  },
  {
    key: 'rad',
    label: 'RAD',
    state: 'not loaded',
    title: 'EUROCONTROL Route Availability Document. Arrive avec le moteur de routes (S9).',
  },
  {
    key: 'czib',
    label: 'CZIB',
    state: 'not connected',
    title:
      "Registre EASA des Conflict Zone Information Bulletins. Cote serveur uniquement : le navigateur n'appellera aucun tiers.",
  },
]

export default function NetPlusServicesPage() {
  const [tab, setTab] = useState('analysis')
  const [day, setDay] = useState(false)
  // Le dossier survit au changement d'onglet : voir ./flightForm.js
  const [form, setForm] = useState(emptyFlightForm)
  const [distanceNm, setDistanceNm] = useState(null)

  return (
    <>
      <TopBar
        title="NetPlus Services"
        subtitle="Overflight & landing permit clearance · country, FIR, registration and bilateral ASA lookup"
      />

      <div className={day ? 'nps is-day' : 'nps'}>
        <header className="nps__top">
          <div className="nps__logo">
            <div className="nps__logo-mark">✈</div>
            <div>
              <div className="nps__logo-1">NetPlus</div>
              <div className="nps__logo-2">Services</div>
            </div>
          </div>

          <div className="nps__sep" />

          <div>
            <h1 className="nps__title">Overflight &amp; Landing Permit Clearance</h1>
            <div className="nps__sub">Country · FIR · registration &amp; bilateral ASA lookup</div>
          </div>

          <div className="nps__spacer" />

          {REFERENCE_CHIPS.map((chip) => (
            <span key={chip.key} className="nps__chip nps__chip--warn" title={chip.title}>
              {chip.label} <small>{chip.state}</small>
            </span>
          ))}

          <button
            type="button"
            className="nps__chip nps__chip--action"
            onClick={() => setDay((value) => !value)}
            title="Basculer jour / nuit"
          >
            {day ? '☀ Day' : '☽ Night'}
          </button>

          <span className="nps__chip nps__chip--tag">OP-CLEARANCE</span>
        </header>

        <nav className="nps__tabs">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'nps__tab is-on' : 'nps__tab'}
              onClick={() => setTab(key)}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        {tab === 'analysis' ? (
          <FlightAnalysisTab
            form={form}
            setForm={setForm}
            distanceNm={distanceNm}
            setDistanceNm={setDistanceNm}
            onImport={() => setTab('myflights')}
          />
        ) : null}
        {tab === 'myflights' ? (
          <div className="nps__body">
            <MyFlightsTab />
          </div>
        ) : null}
        {tab === 'slot' ? (
          <div className="nps__body">
            <AirportSlotTab />
          </div>
        ) : null}
        {tab === 'entry' ? (
          <div className="nps__body">
            <EntryRequirementTab />
          </div>
        ) : null}
      </div>
    </>
  )
}
