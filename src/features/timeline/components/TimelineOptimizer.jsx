import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApplyOperation, useOptimizerSetup, useRunOptimization } from '../../../hooks/useOptimizer'

/**
 * TIMELINE OPTIMIZER — la fenetre de l'annexe (`optRender`, prototype
 * l. 95402 ; `optResultsHtml`, l. 95490), au DOM pres.
 *
 * <b>Cinq panneaux, puis le resultat.</b> 1 · fenetre d'optimisation (dates,
 * bande horaire, raccourcis), 2 · objectif (cout ou score, cible), 3 · ce qui
 * peut etre change (les dix perimetres), 4 · couts de la valorisation,
 * 5 · modules lus. Le resultat : douze tuiles, la ligne d'objectif, la barre
 * Apply all / Revert, les instructions ops groupees et numerotees, le resume
 * par appareil, et « Detected but not addressed ».
 *
 * <b>Ce qui change est ou tourne le moteur.</b> Chez l'annexe, l'analyse lisait
 * un instantane du navigateur et le « moteur » tirait son taux de resolution au
 * sort ({@code Math.random}, l. 90794). Ici {@code POST /v1/timeline/optimize}
 * lit la base et rend une proposition deterministe : chaque inefficience dans
 * le perimetre recoit l'action de son bareme. Les gestes « applicables »
 * passent par les routes de l'etape ; les autres sont marques « manual »,
 * comme chez elle.
 *
 * <p>Deux boutons de l'annexe ne sont pas la : « Replay Mode » et
 * « Optimization Briefing » ouvrent deux autres ecrans (rp / br) qui ne sont
 * pas portes ; « Open in Simulation Center » charge le scenario vivant dans le
 * bac a sable, que le notre ne sait pas encore importer. Ils reviendront avec
 * ces ecrans plutot que d'ouvrir sur rien.
 */
const COSTS_KEY = 'netplus.optimizer.costs'

/* COST_GLOBALS (l. 90668) : cle, libelle, unite. */
const COST_GLOBALS = [
  ['fuelPrice', 'Jet A-1 price', '$/US gal'],
  ['delayPerMin', 'Delay cost', '$/min'],
  ['cxlPenalty', 'Cancellation penalty', '$/flight'],
  ['aogPerDay', 'AOG cost', '$/day'],
  ['crewDisrupt', 'Crew disruption event', '$/event'],
  ['crewDeadhead', 'Crew deadhead', '$/event'],
  ['nightStop', 'Night-stop away from base', '$/tail/night'],
  ['charterYield', 'Charter yield (revenue)', '$/FH'],
  ['mxSlotMiss', 'Missed MX / CAMO exposure', '$/event'],
]

/* OPS_GROUPS (l. 94899) — l'ordre est celui dans lequel un dispatcher execute. */
const OPS_GROUPS = [
  { key: 'SWAP', icon: 'swap', title: 'Swap aircraft on following flights',
    why: 'Same flight, same schedule — a different tail: releases a grounded or non-compliant aircraft and levels utilisation.',
    match: (o) => o.op === 'MOVE_LEG' },
  { key: 'FERRY', icon: 'ferry', title: 'Eliminate the following ferries',
    why: 'Empty legs flown for nothing: delete them and keep the aircraft on stand.',
    match: (o) => o.op === 'CANCEL_LEG' && o.ferry },
  { key: 'CANCEL', icon: 'cancel', title: 'Cancel / consolidate the following flights',
    why: 'Legs made redundant by a direct routing or by a same-dossier consolidation.',
    match: (o) => o.op === 'CANCEL_LEG' && !o.ferry },
  { key: 'TIME', icon: 'time', title: 'Re-time the following flights',
    why: 'Move STD/STA without touching aircraft or route: absorbs a delay, restores crew rest or fits a slot. Re-file the flight plan and re-confirm the slot.',
    match: (o) => o.op === 'RETIME_LEG' },
  { key: 'ROUTE', icon: 'route', title: 'Re-route the following flights',
    why: 'Fly direct instead of via a stop: the block time shown is the new one, so no separate re-timing is needed.',
    match: (o) => o.op === 'REROUTE_LEG' },
  { key: 'ADD', icon: 'add', title: 'Create the following recovery flights',
    why: 'Demand left uncovered by an AOG or a cancellation, re-flown by an available tail.',
    match: (o) => o.op === 'ADD_LEG' },
  { key: 'CREW', icon: 'crew', title: 'Reposition crew',
    why: 'Pairings rebuilt within FTL: duty span, minimum rest and 7-day block hours already checked.',
    match: (o) => o.op === 'SET_CREW' },
  { key: 'PAX', icon: 'pax', title: 'Move passenger manifests',
    why: 'Manifest transfers following a consolidation — recheck MTOW/CG and catering.',
    match: (o) => o.op === 'SET_PAX' },
]
const FU_GROUPS = [
  { key: 'MX', icon: 'mx', title: 'Adjust maintenance', match: (f) => /CAMO|Maintenance/i.test(f.module) },
  { key: 'DISP', icon: 'disp', title: 'Complete dispatch files', match: (f) => /Dispatch/i.test(f.module) },
  { key: 'GH', icon: 'base', title: 'Coordinate ground handling', match: (f) => /Ground|handling/i.test(f.module) },
  { key: 'CREW2', icon: 'crew', title: 'Crew follow-up', match: (f) => /Crew/i.test(f.module) },
  { key: 'SALES', icon: 'ferry', title: 'Offer empty legs to sales', match: (f) => /Sales/i.test(f.module) },
  { key: 'PLAN', icon: 'route', title: 'Night-stop planning — bring the aircraft back to base', match: (f) => /Planning/i.test(f.module) },
]
/* OPS_ICON (l. 94885) — les traces SVG de l'annexe. */
const OPS_ICON = {
  base: 'M3 20h18M12 3l3 7h5l-4 4 1 6-5-3-5 3 1-6-4-4h5z',
  swap: 'M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3',
  ferry: 'M4 20l7-7M11 13l3-9 3 9-3 3zM4 8l4 2M20 8l-4 2',
  crew: 'M12 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 20c0-3 3-5 6-5s6 2 6 5M17 11l2 2 3-3',
  mx: 'M14 7a4 4 0 1 0 5 5l3 3-3 3-3-3a4 4 0 0 1-5-5zM9 9L3 3l2-2 6 6',
  time: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l4 2',
  route: 'M4 18c6 0 6-12 16-12M4 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M20 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  add: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 8v8M8 12h8',
  cancel: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9 9l6 6M15 9l-6 6',
  pax: 'M12 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M5 21c0-4 3-7 7-7s7 3 7 7',
  disp: 'M6 3h9l5 5v13H6zM15 3v5h5M9 13h7M9 17h5',
}

export default function TimelineOptimizer({ open, onClose, defaultStart, defaultDays }) {
  const setup = useOptimizerSetup(open)
  const run = useRunOptimization()
  const apply = useApplyOperation()

  const [startDate, setStartDate] = useState(defaultStart)
  const [days, setDays] = useState(defaultDays ?? 3)
  const [fromT, setFromT] = useState('00:00')
  const [toT, setToT] = useState('24:00')
  const [objective, setObjective] = useState('COST')
  const [target, setTarget] = useState(0)
  const [scope, setScope] = useState(null)
  const [costs, setCosts] = useState(null)
  const [unit, setUnit] = useState('CUR')
  const [result, setResult] = useState(null)
  const [applied, setApplied] = useState({})
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!setup.data) return
    if (scope === null) setScope(setup.data.scopes.map((g) => g.key))
    if (costs === null) {
      let saved = null
      try { saved = JSON.parse(localStorage.getItem(COSTS_KEY) ?? 'null') } catch { saved = null }
      setCosts({ ...setup.data.defaultCosts, ...(saved ?? {}) })
    }
  }, [setup.data, scope, costs])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) { if (event.key === 'Escape') { if (dialog) setDialog(null); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dialog])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const symbol = costs?.symbol ?? '$'
  const fmt = (v) => symbol + String(Math.round(v ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const unitVal = (abs, base) => (unit === 'PCT' ? (base > 0 ? `${(abs / base * 100).toFixed(1)}%` : '0%') : fmt(abs))

  function say(message, err = false) { setToast({ message, err }) }

  function toggleScope(key) {
    setScope((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))
  }

  function saveCosts() {
    try { localStorage.setItem(COSTS_KEY, JSON.stringify(costs)) } catch { /* per-viewer convenience only */ }
    say('Costs applied — re-run the analysis to value the proposal with the new figures')
  }

  function runAnalysis() {
    const fromH = parseHHMM(fromT)
    const toH = parseHHMM(toT)
    if (fromH == null || toH == null || toH <= fromH) { say('The "To" time must be after the "From" time', true); return }
    if (!scope?.length) { say('Select at least one category to optimize', true); return }
    run.mutate(
      { startDate, days: Math.max(1, Math.min(14, Number(days) || 3)), fromHour: fromH, toHour: toH,
        scope, objective, target: Math.max(0, Number(target) || 0), costs },
      {
        onSuccess: (data) => {
          setResult(data)
          setApplied({})
          if (!data.anomalies.length) say('No optimization opportunity detected in this window — the plan is already clean')
        },
        onError: (failure) => say(failure.message, true),
      },
    )
  }

  const ops = result?.operations ?? []
  const autoOps = ops.filter((o) => o.applicable)
  const appliedN = ops.filter((o) => applied[o.id]).length

  function applyOne(op) {
    apply.mutate({ op }, {
      onSuccess: () => { setApplied((a) => ({ ...a, [op.id]: true })); say(`Applied: ${op.title}`) },
      onError: (failure) => say(`Not applied — ${failure.message}`, true),
    })
  }

  function applyAll() {
    const todo = autoOps.filter((o) => !applied[o.id])
    if (!todo.length) { say('Nothing left to apply', true); return }
    setDialog({
      title: `Apply ${todo.length} changes to the live Timeline`,
      body: (
        <div style={{ lineHeight: 1.6 }}>
          These changes will be written to the operation: aircraft re-assignments, re-timings and ferry
          cancellations, each with its reason in the leg history. Swaps and re-timings can be reverted from
          this panel; a cancelled ferry cannot.<br /><br />
          <b style={{ color: 'var(--sc-gold2)' }}>Proceed?</b>
        </div>
      ),
      buttons: [
        { label: 'Cancel' },
        { label: 'Apply all', gold: true, onClick: async () => {
          let ok = 0
          const ko = []
          for (const op of todo) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await apply.mutateAsync({ op })
              ok += 1
              setApplied((a) => ({ ...a, [op.id]: true }))
            } catch (failure) { ko.push(`${op.title} (${failure.message})`) }
          }
          say(`${ok} change(s) applied to the Timeline${ko.length ? ` · ${ko.length} failed` : ''}`, ko.length > 0)
        } },
      ],
    })
  }

  async function revertAll() {
    const done = ops.filter((o) => applied[o.id] && o.op !== 'CANCEL_LEG')
    let n = 0
    for (const op of done) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await apply.mutateAsync({ op, reverse: true })
        n += 1
        setApplied((a) => ({ ...a, [op.id]: false }))
      } catch { /* reported in the count */ }
    }
    const kept = ops.filter((o) => applied[o.id] && o.op === 'CANCEL_LEG').length
    say(`${n} change(s) reverted${kept ? ` · ${kept} cancelled ferry(ies) cannot be restored from here` : ''}`, kept > 0)
  }

  function actionPlan() {
    if (!result) { say('Run the analysis first', true); return }
    const lines = ops.map((o) => o.brief || o.title)
      .concat((result.followUps ?? []).map((f) => `[${f.module}] ${f.brief || f.text}`))
    setDialog({
      title: `Ops instructions — ${lines.length} (live plan)`,
      body: (
        <>
          <div style={{ fontSize: 11, color: 'var(--sc-faint)', marginBottom: 8 }}>
            {result.scenarioName} · objective {result.objective === 'COST' ? 'minimize cost' : 'maximize improvement'}
            {' · '}score {result.initialScore} → {result.finalScore} (+{result.improvementPct}%)
            {' · '}<b style={{ color: '#6FE3A8' }}>{fmt(result.costSaving)} ({result.costSavingPct}%)</b>
            {' · '}{appliedN} of {autoOps.length} applied
          </div>
          <div className="ops-wrap"><OpsInstructions ops={ops} fus={result.followUps ?? []} /></div>
        </>
      ),
      buttons: [
        { label: 'Copy', onClick: () => {
          const txt = `OPS INSTRUCTIONS (LIVE) — ${result.scenarioName}\nSaving: ${fmt(result.costSaving)} (${result.costSavingPct}%)\n\n`
            + lines.map((s, i) => `${i + 1}. ${s}`).join('\n')
          if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => say('Ops instructions copied'), () => say('Copy failed', true))
        } },
        { label: 'Close', gold: true },
      ],
    })
  }

  function exportCsv() {
    if (!result) { say('Run the analysis first', true); return }
    const cols = ['n', 'anomalyId', 'type', 'severity', 'action', 'flights', 'aircraft', 'crew', `value_${result.currency}`, 'instruction', 'description']
    const rows = result.actions.map((x, i) => [i + 1, x.anomalyId, x.type, x.severity ?? '', x.action,
      x.flights.join(' | '), x.aircraft.join(' | '), x.crew.join(' | '), x.valueUsd ?? 0, x.step ?? '', x.description ?? '']
      .map((v) => String(v).replace(/;/g, ',').replace(/\n/g, ' ')).join(';'))
    const head = `LIVE OPTIMIZATION PROPOSAL;${result.scenarioName}\nObjective;${result.objective}\nScope;${result.scope.join(' ')}`
      + `\nScore;${result.initialScore} -> ${result.finalScore} (${result.improvementPct}%)`
      + `\nCost;${result.costBefore} -> ${result.costAfter} (saving ${result.costSaving} = ${result.costSavingPct}%)\n\n`
    const blob = new Blob([`${head}${cols.join(';')}\n${rows.join('\n')}`], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `live_optimization_${result.startDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    say('Proposal exported (CSV)')
  }

  if (!open) return null

  const P = costs ?? {}
  const scopes = setup.data?.scopes ?? []
  const sources = setup.data?.sources ?? []

  return createPortal(
    <div className="sc-opt-ov on" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="sc-opt-win">
        <div className="sc-opt-head">
          <div>
            <div className="sc-opt-t1">TIMELINE <b>OPTIMIZER</b></div>
            <div className="sc-opt-t2">Fleet Optimization Engine on live data · proposals only · nothing is written to the operation</div>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" className="sc-btn red sm" onClick={onClose}>Close</button>
        </div>

        <div className="sc-opt-body">
          {/* 1 · window selection */}
          <div className="sc-panel">
            <div className="sc-panel-head">
              <span className="sc-ph-title">1 · Optimization window</span>
              <span className="sc-ph-sub">Choose the days and the time-of-day band to optimize.</span>
            </div>
            <div className="sc-panel-body">
              <div className="sc-custom-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
                <div className="sc-cf"><label>Start date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 130 }} /></div>
                <div className="sc-cf"><label>Days to optimize</label><input type="number" min={1} max={14} value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 60 }} /></div>
                <div className="sc-cf"><label>From (UTC)</label><input value={fromT} placeholder="HH:MM" onChange={(e) => setFromT(e.target.value)} style={{ width: 70 }} /></div>
                <div className="sc-cf"><label>To (UTC)</label><input value={toT} placeholder="HH:MM" onChange={(e) => setToT(e.target.value)} style={{ width: 70 }} /></div>
              </div>
              <div className="sc-toolbar" style={{ marginTop: 8 }}>
                <span className="sc-ph-sub">Quick bands:</span>
                {[['Full day', 0, 24], ['Morning 05–12', 5, 12], ['Afternoon 12–18', 12, 18], ['Evening 18–24', 18, 24], ['Morning peak 06–10', 6, 10]].map(([label, a, b]) => (
                  <button type="button" className="sc-btn sm" key={label} onClick={() => { setFromT(hhmmDur(a)); setToT(hhmmDur(b)) }}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 2 · objective */}
          <div className="sc-panel">
            <div className="sc-panel-head">
              <span className="sc-ph-title">2 · Objective</span>
              <span className="sc-ph-sub">Optimize by cost or by score improvement. A target stops the engine as soon as it is reached.</span>
            </div>
            <div className="sc-panel-body">
              <div className="sc-toolbar" style={{ marginBottom: 10 }}>
                <button type="button" className={`sc-btn${objective === 'COST' ? ' gold' : ''}`} onClick={() => { setObjective('COST'); setTarget(0) }}>Minimize cost ({symbol})</button>
                <button type="button" className={`sc-btn${objective === 'SCORE' ? ' gold' : ''}`} onClick={() => { setObjective('SCORE'); setTarget(0) }}>Maximize improvement (%)</button>
              </div>
              <div className="sc-custom-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' }}>
                <div className="sc-cf">
                  <label>{objective === 'COST' ? `Cost-saving target (${symbol}, 0 = maximum)` : 'Share of problems to fix (%, 0 = all)'}</label>
                  <input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 90 }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3 · scope */}
          <div className="sc-panel">
            <div className="sc-panel-head">
              <span className="sc-ph-title">3 · What may be changed</span>
              <span className="sc-ph-sub">Same categories as the Simulation Center engine.</span>
            </div>
            <div className="sc-panel-body">
              <div className="sc-scope">
                {scopes.map((g) => {
                  const on = scope?.includes(g.key)
                  return (
                    <label key={g.key} className={on ? 'on' : ''}>
                      <input type="checkbox" checked={Boolean(on)} onChange={() => toggleScope(g.key)} />{g.label}
                    </label>
                  )
                })}
              </div>
              <div className="sc-toolbar">
                <button type="button" className="sc-btn sm" onClick={() => setScope(scopes.map((g) => g.key))}>Select all</button>
                <button type="button" className="sc-btn sm" onClick={() => setScope([])}>Clear</button>
                <button type="button" className="sc-btn sm" onClick={() => setScope(['FERRY'])}>Ferries only</button>
                <button type="button" className="sc-btn sm" onClick={() => setScope(['CREW'])}>Crew only</button>
              </div>
            </div>
          </div>

          {/* 4 · costs */}
          <div className="sc-panel">
            <div className="sc-panel-head">
              <span className="sc-ph-title">4 · Costs used for the valuation</span>
              <span className="sc-ph-sub">Edit here for a quick run. Per-type flying costs (fuel, MX, engine, crew, handling, nav) are the Cost Model grid below.</span>
              <div className="sc-spacer" />
            </div>
            <div className="sc-panel-body">
              <div className="sc-custom-grid">
                {COST_GLOBALS.map(([key, label, unitLabel]) => (
                  <div className="sc-cf" key={key}>
                    <label>{label}<br /><span style={{ fontSize: 9, color: 'var(--sc-faint)' }}>{unitLabel}</span></label>
                    <input type="number" step="0.01" min={0} value={P[key] ?? ''} style={{ width: 82 }}
                           onChange={(e) => setCosts((c) => ({ ...c, [key]: Math.max(0, parseFloat(e.target.value) || 0) }))} />
                  </div>
                ))}
              </div>
              <div className="sc-toolbar" style={{ marginTop: 8 }}>
                <button type="button" className="sc-btn sm gold" onClick={saveCosts}>Apply costs</button>
                <span className="sc-ph-sub">Per-type flying costs come from the Cost Model (currently {P.currency ?? 'USD'}).</span>
              </div>
              {setup.data?.typeRates ? (
                <div className="sc-opt-scroll" style={{ marginTop: 10 }}>
                  <table className="sc-table">
                    <thead><tr><th>Type</th><th className="num">gal/h</th><th className="num">MX $/FH</th><th className="num">Eng $/FH</th><th className="num">Crew $/FH</th><th className="num">Handling $/cycle</th><th className="num">Nav $/NM</th></tr></thead>
                    <tbody>
                      {setup.data.typeRates.map((r) => (
                        <tr key={r.key}><td className="mono">{r.label}</td><td className="num">{r.fuelGalPerHour}</td><td className="num">{r.mxPerFh}</td><td className="num">{r.enginePerFh}</td><td className="num">{r.crewPerFh}</td><td className="num">{r.handlingPerCycle}</td><td className="num">{r.navPerNm}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>

          {/* 5 · data sources */}
          <div className="sc-panel">
            <div className="sc-panel-head">
              <span className="sc-ph-title">5 · Modules read by the optimizer</span>
              <span className="sc-ph-sub">Read-only access — the engine never writes back.</span>
            </div>
            <div className="sc-panel-body">
              <div className="sc-scope" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
                {setup.isLoading ? <span className="sc-ph-sub">Reading the modules…</span> : null}
                {sources.map((s) => (
                  <label key={s.key} style={{ cursor: 'default', opacity: s.ok ? 1 : 0.55 }}>
                    <span className={`sc-sev ${s.ok ? 'low' : 'crit'}`} />{s.label}
                    <span className="cnt">{s.ok ? s.detail : 'not available'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* run */}
          <div className="sc-toolbar" style={{ margin: '4px 0 14px' }}>
            <button type="button" className="sc-btn gold" onClick={runAnalysis} disabled={run.isPending}>
              ▶&nbsp;{run.isPending ? 'Analysing…' : 'Analyse & propose optimizations'}
            </button>
            {result ? (
              <>
                <button type="button" className="sc-btn" onClick={actionPlan}>☰&nbsp;Action Plan</button>
                <button type="button" className="sc-btn ghost" onClick={exportCsv}>Export proposal (CSV)</button>
              </>
            ) : null}
          </div>

          {result ? (
            <Results result={result} ops={ops} autoOps={autoOps} appliedN={appliedN} applied={applied}
                     unit={unit} setUnit={setUnit} fmt={fmt} unitVal={unitVal} symbol={symbol}
                     onApplyOne={applyOne} onApplyAll={applyAll} onRevert={revertAll} busy={apply.isPending} />
          ) : null}
        </div>

        {dialog ? (
          <div className="sc-modal-ov" onClick={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
            <div className="sc-modal">
              <div className="sc-modal-head">{dialog.title}</div>
              <div className="sc-modal-body">{dialog.body}</div>
              <div className="sc-modal-foot">
                {dialog.buttons.map((b) => (
                  <button type="button" key={b.label} className={`sc-btn${b.gold ? ' gold' : ''}${b.red ? ' red' : ''}`}
                          onClick={() => { setDialog(null); if (b.onClick) b.onClick() }}>{b.label}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {toast ? <div className={`sc-toast${toast.err ? ' err' : ''}`}>{toast.message}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/** optResultsHtml() (l. 95490). */
function Results({ result: rec, ops, autoOps, appliedN, applied, unit, setUnit, fmt, unitVal, symbol, onApplyOne, onApplyAll, onRevert, busy }) {
  const pos = rec.costSaving >= 0
  const manualOps = ops.filter((o) => !o.applicable)
  const byReg = useMemo(() => {
    const map = {}
    ops.forEach((o) => {
      const regs = o.op === 'MOVE_LEG' ? [o.fromReg, o.toReg] : [o.registration ?? '—']
      regs.forEach((r) => { (map[r] = map[r] ?? []).push(o) })
    })
    return map
  }, [ops])
  const done = new Set(rec.actions.map((x) => x.anomalyId))
  const rest = rec.anomalies.filter((a) => !done.has(a.id))
  const annualPct = rec.costBefore > 0 ? `${(rec.costAnnual / (rec.costBefore * 365 / (rec.days || 3)) * 100).toFixed(1)}%` : '0%'

  return (
    <div className="sc-panel">
      <div className="sc-panel-head">
        <span className="sc-ph-title">Result — {rec.scenarioName}</span>
        <span className="sc-ph-sub">{rec.anomalies.length} inefficiencies detected · {rec.corrected} addressed{rec.stoppedEarly ? ' · target reached, engine stopped early' : ''}</span>
      </div>
      <div className="sc-panel-body">
        <div className="sc-stats" style={{ marginBottom: 14 }}>
          <div className="sc-stat"><div className="v red">{rec.initialScore}</div><div className="l">Score now</div></div>
          <div className="sc-stat"><div className="v green">{rec.finalScore}</div><div className="l">Score if applied</div></div>
          <div className="sc-stat"><div className="v gold">{rec.improvementPct}%</div><div className="l">Improvement</div></div>
          <div className="sc-stat"><div className="v">{unit === 'PCT' ? '100%' : fmt(rec.costBefore)}</div><div className="l">Cost now</div></div>
          <div className="sc-stat"><div className="v">{unitVal(rec.costAfter, rec.costBefore)}</div><div className="l">Cost if applied</div></div>
          <div className="sc-stat"><div className={`v ${pos ? 'green' : 'red'}`}>{pos ? '−' : '+'}{unitVal(Math.abs(rec.costSaving), rec.costBefore)}</div><div className="l">Saving</div></div>
          <div className="sc-stat"><div className="v gold">{rec.costSavingPct}%</div><div className="l">Cost reduction</div></div>
          <div className="sc-stat"><div className="v">{unit === 'PCT' ? annualPct : fmt(rec.costAnnual)}</div><div className="l">Annualised</div></div>
          <div className="sc-stat"><div className="v">{autoOps.length}</div><div className="l">Applicable changes</div></div>
          <div className="sc-stat"><div className="v">{appliedN}</div><div className="l">Applied so far</div></div>
          <div className="sc-stat"><div className="v">{manualOps.length}</div><div className="l">Manual steps</div></div>
          <div className="sc-stat"><div className="v">{rec.computeMs} ms</div><div className="l">Compute time</div></div>
        </div>
        <div className="sc-opt-objline">
          Objective: <b>{rec.objective === 'COST' ? 'minimize cost' : 'maximize improvement'}</b>
          {rec.target ? ` · target ${rec.objective === 'COST' ? fmt(rec.target) : `${rec.target}%`}` : ''}
          {' · '}ranked by {rec.rankedBy}
          {' · '}nothing has been changed in the operation until you press Apply.
          <span style={{ marginLeft: 8 }}>Show:</span>{' '}
          <button type="button" className={`sc-btn sm${unit === 'CUR' ? ' gold' : ''}`} onClick={() => setUnit('CUR')}>{symbol}</button>{' '}
          <button type="button" className={`sc-btn sm${unit === 'PCT' ? ' gold' : ''}`} onClick={() => setUnit('PCT')}>%</button>
        </div>

        <div className="sc-toolbar" style={{ marginBottom: 10 }}>
          <button type="button" className="sc-btn gold" onClick={onApplyAll} disabled={autoOps.length === appliedN || busy}>
            ✓&nbsp;Apply all {autoOps.length - appliedN} changes to the Timeline
          </button>
          <button type="button" className="sc-btn red" onClick={onRevert} disabled={!appliedN || busy}>Revert applied changes</button>
          <span className="sc-ph-sub">Each change can also be applied on its own.</span>
        </div>

        <div className="ops-wrap"><OpsInstructions ops={ops} fus={rec.followUps ?? []} applied={applied} onApply={onApplyOne} busy={busy} /></div>

        {Object.keys(byReg).length ? (
          <>
            <div className="sc-opt-sec">Summary by aircraft</div>
            <div className="sc-opt-scroll">
              <table className="sc-table">
                <thead><tr><th>Aircraft</th><th className="num">Changes</th><th className="num">Value</th><th>Detail</th></tr></thead>
                <tbody>
                  {Object.keys(byReg).sort().map((r) => {
                    const xs = byReg[r]
                    const v = xs.reduce((s, o) => s + (o.valueUsd || 0), 0)
                    return (
                      <tr key={r}>
                        <td className="mono"><b style={{ color: 'var(--sc-ink)' }}>{r}</b></td>
                        <td className="num">{xs.length}</td>
                        <td className="num mono" style={{ color: '#6FE3A8' }}>{fmt(v)}</td>
                        <td style={{ fontSize: 10.5 }}>{xs.map((o) => <div key={o.id}>{o.title}</div>)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {rest.length ? (
          <>
            <div className="sc-opt-sec amber">Detected but not addressed — {rest.length}</div>
            <div className="sc-opt-scroll" style={{ maxHeight: 220 }}>
              <table className="sc-table">
                <thead><tr><th>ID</th><th>Issue</th><th>Category</th><th>Recommended</th><th>Detail</th></tr></thead>
                <tbody>
                  {rest.slice(0, 40).map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{a.id}</td>
                      <td><span className={`sc-sev ${a.severity}`} />{a.label}</td>
                      <td className="mono">{a.scopeKey}{!a.inScope ? <> <span className="sc-chip archived">OUT OF SCOPE</span></> : null}</td>
                      <td className="mono" style={{ color: 'var(--sc-amber)' }}>{a.expectedFix}</td>
                      <td style={{ fontSize: 10.5 }}>{a.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {rec.exclusiveUseKept ? (
          <div className="sc-ph-sub" style={{ marginTop: 8 }}>
            Exclusive-use rule applied silently on {rec.exclusiveUseKept} pair(s) of same-route flights held by different dossiers — kept on two aircraft.
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** opsInstructionsHtml() (l. 94945) — groupees, numerotees, une ligne par instruction. */
function OpsInstructions({ ops, fus, applied = {}, onApply, busy }) {
  let n = 0
  const blocks = []
  OPS_GROUPS.forEach((g) => {
    const items = ops.filter(g.match)
    if (!items.length) return
    n += 1
    blocks.push(
      <div className="ops-card" key={g.key}>
        <div className="ops-num">{n}</div>
        <div className="ops-ico"><OpsIcon name={g.icon} /></div>
        <div className="ops-body">
          <div className="ops-title">{g.title.toUpperCase()}</div>
          {g.why ? <div className="ops-why">{g.why}</div> : null}
          <ul className="ops-list">
            {items.map((o) => (
              <li key={o.id} title={o.text}>
                <span className="ops-txt">{o.brief || o.title}</span>
                {onApply ? (applied[o.id] ? <span className="ops-done">APPLIED</span>
                  : !o.applicable ? <span className="ops-manual">manual</span>
                    : <button type="button" className="ops-apply" disabled={busy} onClick={() => onApply(o)}>Apply</button>) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>,
    )
  })
  FU_GROUPS.forEach((g) => {
    const items = fus.filter(g.match)
    if (!items.length) return
    n += 1
    blocks.push(
      <div className="ops-card" key={g.key}>
        <div className="ops-num">{n}</div>
        <div className="ops-ico"><OpsIcon name={g.icon} /></div>
        <div className="ops-body">
          <div className="ops-title">{g.title.toUpperCase()}</div>
          <ul className="ops-list">
            {items.map((f) => (
              <li key={f.id}><span className="ops-txt">{f.brief || f.text}</span><span className="ops-manual">{f.module}</span></li>
            ))}
          </ul>
        </div>
      </div>,
    )
  })
  return (
    <>
      <div className="ops-head">
        <div className="ops-h1">Ops instructions</div>
        <div className="ops-h2">Follow the actions below to implement the optimization.</div>
      </div>
      {blocks.length ? blocks : <div className="sc-empty" style={{ padding: 18 }}>No instruction to issue in this scope.</div>}
    </>
  )
}

function OpsIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={OPS_ICON[name] ?? OPS_ICON.swap} />
    </svg>
  )
}

function parseHHMM(text) {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(String(text ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 24 || mm > 59) return null
  return h + mm / 60
}

function hhmmDur(dec) {
  if (dec == null || Number.isNaN(dec)) return '--:--'
  if (dec >= 24) return '24:00'
  const h = Math.floor(dec)
  const m = Math.round((dec - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
