import { useState } from 'react'
import Badge from '../../../components/Badge'
import { ErrorState, LoadingState } from '../../../components/States'
import { useOpsQualifications, useSetApproachCategory } from '../../../hooks/useCrew'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const CATEGORIES = ['CAT_I', 'CAT_II', 'CAT_IIIA', 'CAT_IIIB', 'CAT_IIIC']
const LABEL = {
  CAT_I: 'CAT I', CAT_II: 'CAT II', CAT_IIIA: 'CAT IIIA', CAT_IIIB: 'CAT IIIB', CAT_IIIC: 'CAT IIIC',
}
const STATUS_TONE = { VALID: 'READY', EXPIRING: 'PENDING', EXPIRED: 'ATTENTION', UNKNOWN: 'INFO' }
const ROLE = { CAPTAIN: 'CAP', FIRST_OFFICER: 'FO' }

/**
 * Settings → OPS Qualifications.
 *
 * <b>Ce que fait le prototype</b> (renderOpsQualSettings, annexe A4
 * l. 21018-21042) : la liste des pilotes, un menu déroulant CAT I → CAT IIIC
 * par ligne, et sous le tableau la définition des cinq catégories.
 *
 * <b>Ce qui est ajouté, et pourquoi.</b> Une date d'échéance. Une CAT II n'est
 * pas un attribut du pilote : c'est une formation qui se périme, et un menu
 * sans date continuerait d'affirmer une qualification que personne n'a
 * renouvelée. Le serveur refuse donc toute catégorie au-dessus de CAT I sans
 * échéance, et la ligne affiche l'état de cette échéance comme le fait le
 * reste du dossier équipage.
 *
 * <b>CAT I est l'absence de ligne.</b> Le prototype l'écrit lui-même :
 * « Company standard: all flight crew are CAT I ». Un pilote sans qualification
 * LVO est donc CAT I, sans que rien n'ait été semé pour l'affirmer.
 */
export default function OpsQualificationsSection({ onFlash }) {
  const list = useOpsQualifications()
  const save = useSetApproachCategory()
  const [editing, setEditing] = useState(null)

  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />
  if (!list.data) return <LoadingState label="Reading the flight crew…" />

  const rows = list.data

  const commit = (row, category, validTo) => {
    save.mutate(
      { personId: row.personId, category, validTo: validTo || null, validFrom: null, reference: null },
      {
        onSuccess: () => { setEditing(null); onFlash?.(`${row.fullName} · ${LABEL[category]}`) },
        onError: (error) => onFlash?.(error?.response?.data?.message ?? 'Not saved'),
      },
    )
  }

  return (
    <>
      <div className="set-card">
        <div className="set-card__title">Flight crew — approach category</div>
        {rows.length === 0 ? (
          <div className="set-row">
            <div className="set-row__label">
              <div className="lbl">No flight crew on file</div>
              <div className="desc">An approach category applies to captains and first officers only.</div>
            </div>
          </div>
        ) : null}
        {rows.map((row) => {
          const lowVisibility = row.approachCategory !== 'CAT_I'
          return (
          <div className="set-row" key={row.personId}>
            <div className="set-row__label">
              <div className="lbl">
                {row.fullName}{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 11 }}>
                  ({ROLE[row.mainRole] ?? row.mainRole})
                </span>
              </div>
              <div className="desc">{row.typeRatings.join(' · ') || 'no type rating on file'}</div>
              {/* CAT I n'a pas d'echeance, meme quand la ligne LVO existe encore
                  parce que le pilote a ete redescendu : afficher « expire — »
                  laisserait croire a une qualification sans date de fin. */}
              <div className={lowVisibility ? 'set-row__reader' : 'set-row__reader set-row__reader--none'}>
                {lowVisibility
                  ? `${row.reference ? `${row.reference} · ` : ''}expires ${row.validTo ? dayMonthYear(row.validTo) : EMPTY}`
                  : 'company standard — no low-visibility qualification in force'}
              </div>
            </div>
            <div className="set-row__ctrl">
              {lowVisibility && row.status !== 'VALID' ? (
                <Badge tone={STATUS_TONE[row.status] ?? 'NEUTRAL'} warn={row.status === 'EXPIRED'}>
                  {row.status}
                </Badge>
              ) : null}
              {editing?.personId === row.personId ? (
                <Editor row={row} editing={editing} setEditing={setEditing}
                        saving={save.isPending} onCommit={commit} />
              ) : (
                <select className="set-select" value={row.approachCategory} disabled={save.isPending}
                        aria-label={`Approach category for ${row.fullName}`}
                        onChange={(event) => {
                          const category = event.target.value
                          // CAT I n'a pas d'échéance : on écrit tout de suite.
                          if (category === 'CAT_I') commit(row, category, null)
                          else setEditing({ personId: row.personId, category, validTo: '' })
                        }}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{LABEL[category]}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          )
        })}
      </div>

      <div className="set-card">
        <div className="set-card__title">Categories</div>
        <div style={{ padding: '10px 0 16px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          CAT I — DH ≥ 200 ft, RVR ≥ 550 m · CAT II — DH 100–200 ft, RVR ≥ 300 m ·
          CAT IIIA — DH &lt; 100 ft, RVR ≥ 175 m · CAT IIIB — DH &lt; 50 ft, RVR 50–175 m ·
          CAT IIIC — no DH / no RVR limit.
        </div>
      </div>
    </>
  )
}

/** La date que le serveur exige pour toute catégorie au-dessus de CAT I. */
function Editor({ row, editing, setEditing, saving, onCommit }) {
  return (
    <>
      <span className="set-unit">{LABEL[editing.category]} expires</span>
      <input className="set-input" type="date" value={editing.validTo} disabled={saving}
             aria-label="Expiry date"
             autoFocus
             onChange={(event) => setEditing({ ...editing, validTo: event.target.value })} />
      <button type="button" className="set-btn set-btn--primary" disabled={saving || !editing.validTo}
              onClick={() => onCommit(row, editing.category, editing.validTo)}>
        Save
      </button>
      <button type="button" className="set-btn" disabled={saving} onClick={() => setEditing(null)}>
        Cancel
      </button>
    </>
  )
}
