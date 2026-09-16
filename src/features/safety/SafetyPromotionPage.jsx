import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import TopBar from '../../components/TopBar'
import { useCrewList } from '../../hooks/useCrew'
import { useAcknowledgeCampaign, usePromotionBoard } from '../../hooks/useCommercial'
import { dayMonthYear } from '../../lib/format'
import '../../styles/safetyreports.css'

const KINDS = [
  ['ALERT', 'Safety alert'],
  ['BULLETIN', 'Safety bulletin'],
  ['LESSON', 'Lesson learned'],
  ['POLICY', 'Policy'],
]

/**
 * Safety Promotion.
 *
 * <b>Une page de consultation.</b> Le prototype le dit dans sa barre du haut —
 * « Read only » — et c'est la bonne lecture : ce que publie le responsable
 * sécurité, personne d'autre ne l'édite. Le seul geste possible est
 * l'accusé de lecture, et c'est lui qui alimente le « 9 / 24 read ».
 *
 * <b>Le type porte la couleur.</b> Une ALERTE ne se lit pas comme une
 * POLITIQUE : l'une demande une action avant le prochain vol, l'autre énonce
 * une règle permanente. Le filet de gauche et la pastille du coin viennent du
 * serveur, pour qu'ils ne puissent pas diverger.
 */
export default function SafetyPromotionPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')
  const [readerId, setReaderId] = useState('')

  const crew = useCrewList({ activeOnly: true })
  const board = usePromotionBoard()
  const acknowledge = useAcknowledgeCampaign()

  const people = crew.data ?? []
  const data = board.data
  const items = data?.campaigns ?? []

  const counts = useMemo(() => {
    const map = { ALL: items.length }
    KINDS.forEach(([key]) => { map[key] = items.filter((item) => item.kind === key).length })
    return map
  }, [items])

  const visible = filter === 'ALL' ? items : items.filter((item) => item.kind === filter)

  return (
    <>
      <TopBar
        title="Safety Promotion"
        subtitle="Safety alerts, bulletins and lessons learned · published to all personnel"
      />

      <div className="sr-root">
        <div className="sr-topbar">
          <div className="sr-brand">
            <span className="sr-mark"><Megaphone size={15} strokeWidth={2} /></span>
            <div>
              <div className="sr-b1">Safety Promotion</div>
              <div className="sr-b2">
                The Network Plan Airlines · safety communication to all personnel
              </div>
            </div>
          </div>

          <div className="sr-nav">
            <button type="button"
                    className={filter === 'ALL' ? 'sr-tab sr-tab--on' : 'sr-tab'}
                    onClick={() => setFilter('ALL')}>
              All communications
              <span className="sr-badge">{counts.ALL ?? 0}</span>
            </button>
            {KINDS.map(([key, label]) => (
              <button key={key} type="button"
                      className={filter === key ? 'sr-tab sr-tab--on' : 'sr-tab'}
                      onClick={() => setFilter(key)}>
                {label}
                <span className="sr-badge">{counts[key] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="sr-who">
            {/* Le lecteur : il faut bien savoir qui accuse reception. Il
                disparaitra le jour ou l'identite viendra du jeton. */}
            <label htmlFor="pr-reader">Reading as</label>
            <select id="pr-reader" value={readerId}
                    onChange={(event) => setReaderId(event.target.value)}>
              <option value="">Select who you are…</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName} · {person.mainRole.replace('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
            <span className="sr-ro" style={{ marginLeft: 0 }}>Read only</span>
          </div>
        </div>

        <div className="sr-page">
          <div className="sr-head">
            <h1 className="sr-h1">Safety communication</h1>
            <div className="sr-h2">
              Published by the Safety Manager for all personnel. This page is for consultation —
              nothing here can be edited.
            </div>
          </div>

          {board.isError ? (
            <div className="sr-error">
              The communications could not be read —{' '}
              {board.error?.response?.data?.message ?? board.error.message}
            </div>
          ) : !data ? (
            <div className="sr-card"><div className="sr-empty">Reading the communications…</div></div>
          ) : (
            <div className="sr-grid">
              <div className="sr-main">
                {visible.length === 0 ? (
                  <div className="sr-card">
                    <div className="sr-empty">
                      No communication has been published in this category.
                    </div>
                  </div>
                ) : null}

                {visible.map((item) => {
                  const reach = item.reachPercent ?? 0
                  const colour = reach >= 90 ? '#1f9d5c' : reach >= 50 ? '#E67E22' : '#C0392B'
                  return (
                    <div className="sr-card pr-item" key={item.id}
                         style={{ borderLeftColor: item.kindColour }}>
                      <div className="pr-h">
                        <div>
                          <div className="pr-t">{item.title}</div>
                          <div className="pr-m">
                            {item.reference} · {dayMonthYear(item.publishedOn)} · {item.authorName}
                          </div>
                        </div>
                        <span className="pr-k"
                              style={{ background: `${item.kindColour}1a`, color: item.kindColour }}>
                          {item.kindLabel}
                        </span>
                      </div>

                      <div className="pr-body">{item.message}</div>

                      <div className="pr-foot">
                        <span className="pr-aud">For: <b>{audienceLabel(item.audience)}</b></span>
                        {item.acknowledgementRequired ? (
                          <>
                            <div className="pr-bar">
                              <div style={{ width: `${reach}%`, background: colour }} />
                            </div>
                            <span className="pr-n">
                              {item.acknowledgements} / {item.audienceSize} read
                            </span>
                            <button type="button" className="sr-btn sr-btn--primary"
                                    disabled={!readerId || acknowledge.isPending}
                                    title={readerId ? undefined : 'Choose who you are, above'}
                                    onClick={() => acknowledge.mutate({
                                      campaignId: item.id, personId: readerId,
                                    })}>
                              I have read this
                            </button>
                          </>
                        ) : (
                          <span className="pr-aud">No acknowledgement required</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="sr-side">
                <div className="sr-card">
                  <div className="sr-sec">Safety objectives 2026</div>
                  {data.objectives.map((spi) => {
                    const colour = spi.breachesAlert ? '#C0392B'
                      : spi.meetsTarget ? '#1f9d5c' : '#E67E22'
                    return (
                      <div className="pr-obj" key={spi.code}>
                        <span>{spi.name}</span>
                        {/* « not measured » plutot que zero : sur un objectif de
                            securite, rien a signaler et rien de mesurable ne
                            veulent pas dire la meme chose. */}
                        <b style={{ color: spi.value == null ? '#94a3b8' : colour }}>
                          {spi.value == null ? 'not measured' : Number(spi.value)}
                          {' / '}{spi.direction === 'LOWER' ? '≤' : '≥'}{Number(spi.target)}
                        </b>
                      </div>
                    )
                  })}
                  <div className="sr-note">
                    Published performance against the objectives set for the year. Measured and
                    maintained by the Safety Manager.
                  </div>
                </div>

                <div className="sr-card">
                  <div className="sr-sec">Report something</div>
                  <div className="sr-body">
                    Anyone can file a safety report — flight and cabin crew, dispatch, OCC,
                    maintenance and ground operations.
                  </div>
                  <div className="sr-actions">
                    <button type="button" className="sr-btn sr-btn--primary"
                            onClick={() => navigate('/safety-reports')}>
                      Open Safety Reports
                    </button>
                  </div>
                </div>

                <div className="sr-card">
                  <div className="sr-sec">Just Culture</div>
                  <div className="sr-body">{data.justCulturePolicy}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function audienceLabel(audience) {
  return {
    ALL: 'All personnel',
    FLIGHT_CREW: 'All flight crew',
    CABIN: 'Cabin crew',
    MAINTENANCE: 'Maintenance',
    GROUND: 'Ground operations',
    OFFICE: 'Dispatchers and office staff',
  }[audience] ?? audience
}
