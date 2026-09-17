/**
 * L'anneau de progression des onglets SERVICES et OVF PERMIT.
 *
 * Porte de TNPFlightPanel.progress / .progressHtml (prototype l. 72277-72350),
 * avec sa geometrie — rayon 19 dans une boite 44x44, l'arc pose en
 * stroke-dasharray — et ses trois etats : idle / work / ok.
 *
 * <b>L'anneau n'avance que sur des CONFIRMATIONS</b>, comme chez elle : une
 * demande partie, ou en attente chez le prestataire, n'est pas un progres sur
 * lequel un agent peut s'appuyer. C'est la sous-ligne qui dit le travail en
 * cours.
 *
 * <b>Ce qui change : ce qui sort du denominateur.</b> L'annexe retirait les
 * lignes « N/A » et « Cancel », deux etats que le serveur ne stocke pas ici —
 * une ligne sans objet est supprimee, elle n'est pas gardee dans un etat neutre.
 * Le denominateur est donc simplement le nombre de demandes.
 */
export default function ProgressRing({ requests, noun }) {
  const rows = requests ?? []
  const total = rows.length
  const confirmed = rows.filter((row) => row.status === 'CONFIRMED').length
  const denied = rows.filter((row) => row.status === 'REFUSED').length
  const pending = rows.filter(
    (row) => row.status === 'SENT' || row.status === 'ACKNOWLEDGED',
  ).length
  const untouched = rows.filter((row) => row.status === 'DRAFT').length

  const pct = total ? Math.round((confirmed / total) * 100) : 0
  let state = 'work'
  let label = 'Under process'
  if (!total || (confirmed === 0 && pending === 0 && denied === 0)) {
    state = 'idle'
    label = 'Not actioned'
  } else if (confirmed === total) {
    state = 'ok'
    label = 'Confirmed'
  }

  const nouns = `${noun}s`
  let sub
  if (state === 'idle') {
    sub = total ? `${total} ${nouns} awaiting action` : `No ${noun} on this leg`
  } else if (state === 'ok') {
    sub = `${confirmed} of ${total} ${nouns} confirmed`
  } else {
    // Le decompte nomme toujours ce qu'il compte : « 2 confirmed » seul ne dit
    // pas s'il s'agit de services de piste ou de permis de survol.
    const bits = [`${confirmed} of ${total} ${nouns} confirmed`]
    if (pending) bits.push(`${pending} pending`)
    if (denied) bits.push(`${denied} denied`)
    if (untouched) bits.push(`${untouched} not actioned`)
    sub = bits.join(' · ')
  }

  const radius = 19
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.max(0, Math.min(1, pct / 100))

  return (
    <div className={`fd-prog fd-prog-${state}`}>
      <svg className="fd-prog-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="tr" cx="22" cy="22" r={radius} />
        <circle
          className="bar"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={`${dash.toFixed(2)} ${circumference.toFixed(2)}`}
        />
      </svg>
      <span className="fd-prog-pct">{pct}<i>%</i></span>
      <span className="fd-prog-txt">
        <span className="st">{label}</span>
        <span className="sub">{sub}</span>
      </span>
    </div>
  )
}
