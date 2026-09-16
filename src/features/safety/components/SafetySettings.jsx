import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../../components/States'
import { useSettings } from '../../../hooks/usePlatform'
import { EMPTY } from '../../../lib/format'

/**
 * Settings.
 *
 * <b>Read here, edited in Settings.</b> The operator's thresholds live in one
 * place for the whole platform; a second copy inside the safety module would
 * mean two answers to "what counts as due soon", and the screens reading them
 * would drift apart. This tab shows what the module is actually using and
 * links to where it is changed.
 */

const SECTIONS = [
  ['org', 'Organisation'],
  ['thresholds', 'Alert thresholds'],
  ['spi', 'Targets'],
  ['policy', 'Policy'],
]

export default function SafetySettings({ indicators, accountability }) {
  const [section, setSection] = useState('org')
  const settings = useSettings()

  if (settings.isError) {
    return <div className="sms-empty">{settings.error?.message}</div>
  }
  if (!settings.data) {
    return <LoadingState label="Reading the settings…" />
  }

  const all = settings.data
  const value = (key) => all.find((entry) => entry.settingKey === key)?.settingValue ?? null
  const safety = all.filter((entry) => entry.category === 'SAFETY')

  return (
    <div className="sms-settings">
      <nav className="sms-settnav">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={section === key ? 'is-on' : undefined}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {section === 'org' ? (
          <>
            <Row label="Operator" value={accountability?.operator} />
            <Row label="AOC reference" value={accountability?.aocReference} />
            <Row label="Accountable Manager" value={accountability?.accountableManager} />
            <Row label="Safety Manager" value={accountability?.safetyManager} />
            <p className="sms-note">
              Under EASA ORO.GEN.200 the Accountable Manager holds ultimate responsibility for
              the management system. The Safety Manager is the focal point for the development
              and maintenance of the SMS and reports directly to them.
            </p>
          </>
        ) : null}

        {section === 'thresholds' ? (
          <>
            {safety
              .filter((entry) => entry.valueType === 'INTEGER')
              .map((entry) => (
                <Row
                  key={entry.settingKey}
                  label={entry.label}
                  value={`${entry.settingValue}${entry.unit ? ` ${entry.unit}` : ''}`}
                  hint={entry.description}
                />
              ))}
            <p className="sms-note">
              These thresholds drive the cross-module scan. They are the operator's own warning
              margins and sit inside, not instead of, the regulatory limits held in the source
              modules.
            </p>
          </>
        ) : null}

        {section === 'spi' ? (
          <>
            <p className="sms-note" style={{ marginTop: 0 }}>
              A target is what the operator aims to achieve; an alert level is the point at which
              performance must be reviewed by the Safety Review Board.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Direction</th>
                  <th>Target</th>
                  <th>Alert level</th>
                  <th>Latest</th>
                </tr>
              </thead>
              <tbody>
                {(indicators ?? []).map((spi) => (
                  <tr key={spi.code}>
                    <td>
                      <b>{spi.name}</b>
                      <div className="table__sub">
                        {spi.code}
                        {spi.unit ? ` · ${spi.unit}` : ''}
                      </div>
                    </td>
                    <td className="table__sub">
                      {spi.lowerIsBetter ? 'lower is better' : 'higher is better'}
                    </td>
                    <td><b>{spi.target ?? EMPTY}</b></td>
                    <td><b className="is-warn">{spi.alertLevel ?? EMPTY}</b></td>
                    <td><b>{spi.value ?? EMPTY}</b></td>
                  </tr>
                ))}
                {!(indicators ?? []).length ? (
                  <tr>
                    <td colSpan={5} className="table__empty">No indicator is defined.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        ) : null}

        {section === 'policy' ? (
          <>
            <Row label="Just Culture policy" value={value('safety.justCulture') ?? 'In force'} />
            <Row
              label="Reports confidential by default"
              value={value('safety.confidentialByDefault') ?? 'No'}
            />
            <Row
              label="Mandatory reporting window"
              value={`${value('safety.morWindowHours') ?? 72} hours`}
              hint="Regulation (EU) 376/2014 Art. 4(3)"
            />
            <p className="sms-note">
              <b>Regulatory references applied in this module</b>
              <br />
              ICAO Annex 19 (3rd edition) — SMS framework · ICAO Doc 9859 (4th edition) — risk
              matrix, SPI and SPT method · Regulation (EU) 376/2014 — occurrence reporting and the
              72-hour notification window · EASA ORO.GEN.200 — management system.
            </p>
          </>
        ) : null}

        <p className="sms-note">
          These values are stored once for the whole platform and edited in{' '}
          <Link to="/settings">Settings</Link>, under Safety.
        </p>
      </section>
    </div>
  )
}

function Row({ label, value, hint }) {
  return (
    <div className="sms-setrow">
      <span>
        {label}
        {hint ? <i>{hint}</i> : null}
      </span>
      <b>{value || EMPTY}</b>
    </div>
  )
}
