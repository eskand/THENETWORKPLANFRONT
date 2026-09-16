const DASH = '—'

/**
 * SUMMARY / MINI BRIEFING — la colonne de droite.
 *
 * Deux natures de valeurs, et la distinction est la raison d'etre de ce
 * composant :
 *
 *   - ce qui est SAISI ou MESURE (depart, destination, niveau, immat, MTOW,
 *     distance orthodromique) est affiche ;
 *   - ce qui doit etre CALCULE par le moteur permis/ASA (permis de survol,
 *     permis d'atterrissage, creneaux, PPR, redevances, zones de conflit,
 *     NOTAM) reste a « — ».
 *
 * Rien n'est estime pour remplir la place. Le prototype tenait la meme ligne
 * avant RUN ANALYSIS ; la difference est qu'ici le moteur n'existe pas encore
 * cote serveur, et le bandeau le dit au lieu de le laisser deviner.
 */

function Card({ icon, title, rows }) {
  return (
    <div className="nps__card">
      <div className="nps__card-head">
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span>{title}</span>
      </div>
      {rows.map(([key, value]) => (
        <div className="nps__kv" key={key}>
          <span>{key}</span>
          <span>{value ?? DASH}</span>
        </div>
      ))}
    </div>
  )
}

export default function MiniBriefing({ form, distanceNm }) {
  const dep = form.dep ? form.dep.toUpperCase() : DASH.repeat(4)
  const dest = form.dest ? form.dest.toUpperCase() : DASH.repeat(4)
  const fl = form.cruiseFl ? form.cruiseFl.replace(/^FL\s*/i, 'FL') : null

  // Le temps de vol n'est donne QUE si une vitesse a ete saisie : sans elle,
  // toute duree serait une invention. Le prototype ajoutait ~21 min de
  // roulage/montee/descente ; on garde la meme marge, et on la nomme.
  const kt = Number(form.cruiseKt) || null
  let ete = null
  if (distanceNm && kt) {
    const hours = distanceNm / kt + 0.35
    const hh = Math.floor(hours)
    const mm = Math.round((hours - hh) * 60)
    ete = `${hh}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`
  }

  return (
    <>
      <div className="nps__panel-head">
        <span className="nps__panel-title nps__panel-title--plain">Summary / mini briefing</span>
      </div>

      <div className="nps__brief">
        <div>
          <div className="nps__brief-eyebrow">Itinerary</div>
          <div className="nps__itin">
            <span className="nps__itin-dep">{dep}</span>
            <span className="nps__itin-arrow">→</span>
            <span className="nps__itin-dest">{dest}</span>
          </div>
          <div className="nps__tiles">
            <div className="nps__tile">
              <div className="nps__tile-k">Total distance</div>
              <div className="nps__tile-v">{distanceNm ? `${distanceNm} NM` : DASH}</div>
            </div>
            <div className="nps__tile">
              <div className="nps__tile-k">Est. flight time</div>
              <div className="nps__tile-v">{ete ?? DASH}</div>
            </div>
            <div className="nps__tile">
              <div className="nps__tile-k">Cruise alt</div>
              <div className="nps__tile-v">{fl ?? DASH}</div>
            </div>
          </div>
          {distanceNm ? (
            <div className="nps__brief-eyebrow" style={{ marginTop: 6 }}>
              Great circle · a filed route will be longer
            </div>
          ) : null}
        </div>

        <Card
          icon="📋"
          title="Permits & authorizations"
          rows={[
            ['Overflight permits', null],
            ['Landing permits', null],
            ['Slots', null],
            ['PPR', null],
          ]}
        />

        <Card
          icon="💲"
          title="Navigation charges per country (USD)"
          rows={[
            ['Per country', null],
            ['Total', null],
          ]}
        />

        <Card
          icon="🛡"
          title="Restrictions & warnings"
          rows={[
            ['Conflict zones', null],
            ['Closed airspace', null],
            ['Relevant AICs', null],
            ['Critical NOTAMs', null],
            ['Route fixes to verify', null],
          ]}
        />

        <Card
          icon="✈"
          title="Aircraft"
          rows={[
            ['Registration', form.registration || null],
            ['Type', form.acType || null],
            ['Category', null],
            ['MTOW', form.mtow ? `${Number(form.mtow).toLocaleString('en-US')} kg` : null],
          ]}
        />

        <div className="nps__notice">
          <span>⚠</span>
          <span>
            <b>Le moteur permis / ASA n'est pas branche.</b> Les sept couches de decision
            (CZIB, sanctions et bilateraux, droit aerien, creneaux WASG, PPR, procedures par
            pays, documents) sont extraites et classees dans{' '}
            <code>docs/ports/permis-asa.md</code>, mais leur portage est le sprint{' '}
            <code>S10</code>. Aucune valeur n'est calculee ici, et aucune n'est inventee.
          </span>
        </div>
      </div>
    </>
  )
}
