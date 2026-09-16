import { useMemo, useState } from 'react'
import { LoadingState } from '../../../components/States'
import {
  useCamoAdminComponents,
  useCamoAdminDocuments,
  useCamoFleet,
  useTechLogBoard,
  useDirectives,
  useMelItems,
  useMelLibrary,
  useProgramme,
  useTechLogPages,
  useUsers,
  useWorkOrders,
} from '../../../hooks/useMaintenance'
import { EMPTY, dayMonthYear, minutesToHhmm, titleCase } from '../../../lib/format'

/**
 * One register of the airworthiness record.
 *
 * <b>One component of the screen, fifteen collections.</b> They differ in their
 * columns and in nothing else: each is a searchable table over rows the server
 * already derives. Fifteen near-identical components would have drifted apart
 * within a month, and the drift would have shown as fifteen slightly different
 * ideas of what "overdue" looks like.
 */
export default function AdminCollection({ entry }) {
  const [search, setSearch] = useState('')
  const view = VIEWS[entry.k]

  if (!view) {
    return (
      <div className="ca-page">
        <div className="ca-card">
          <div className="ca-empty">{entry.label} is not yet on the record.</div>
        </div>
      </div>
    )
  }

  return <Collection entry={entry} view={view} search={search} setSearch={setSearch} />
}

function Collection({ entry, view, search, setSearch }) {
  const query = view.use()
  const rows = useMemo(() => {
    const all = view.rows ? view.rows(query.data) : (query.data ?? [])
    if (!search.trim()) return all
    const needle = search.trim().toLowerCase()
    return all.filter((row) =>
      view.columns.some((column) => {
        const value = column.value(row)
        return value != null && String(value).toLowerCase().includes(needle)
      }),
    )
  }, [query.data, search, view])

  return (
    <div className="ca-page">
      <div className="ca-head">
        <div>
          <div className="ca-h1">{entry.label}</div>
          <div className="ca-h2">{view.note}</div>
        </div>
        <div className="ca-hact">
          <input
            className="ca-search"
            value={search}
            placeholder="Search…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="ca-stamp">
            {rows.length} row{rows.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="ca-card">
        {query.isLoading ? (
          <LoadingState label={`Loading ${entry.label.toLowerCase()}…`} />
        ) : query.isError ? (
          <div className="ca-empty">{query.error?.message}</div>
        ) : rows.length ? (
          <table className="ca-tbl">
            <thead>
              <tr>
                {view.columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? index}>
                  {view.columns.map((column) => (
                    <td key={column.label} className={column.mono ? 'mono' : undefined}>
                      {render(column, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ca-empty">
            Nothing on this register yet. Rows arrive by import, by connector, or from the
            operational modules.
          </div>
        )}
      </div>
    </div>
  )
}

function render(column, row) {
  const value = column.value(row)
  if (value === null || value === undefined || value === '') return EMPTY
  if (column.pill) {
    return <span className={`ca-pill ${column.pill(row) ?? ''}`}>{value}</span>
  }
  return value
}

const col = (label, value, options = {}) => ({ label, value, ...options })

/** A status that stops an aircraft is red; one that merely slows it is amber. */
const statusPill = (bad, warn) => (row) => {
  const status = row.status ?? ''
  if (bad.includes(status)) return 'bad'
  if (warn.includes(status)) return 'warn'
  return ''
}

const VIEWS = {
  aircraft: {
    use: useCamoFleet,
    note: 'The fleet the CAMO answers for. Status is changed through the CAMO status control, so every change is named and audited.',
    columns: [
      col('Registration', (r) => r.registration, { mono: true }),
      col('Type', (r) => r.icaoType),
      col('Status', (r) => titleCase(r.status ?? ''), {
        pill: statusPill(['AOG'], ['MAINTENANCE']),
      }),
      col('ARC expiry', (r) => dayMonthYear(r.arcExpiresOn)),
      col('Days to ARC', (r) => r.arcDaysLeft, { mono: true }),
      col('Next due', (r) => (r.nextDueCode ? `${r.nextDueCode} · ${dayMonthYear(r.nextDueOn)}` : null)),
      col('Open AD/SB', (r) => r.openDirectives, { mono: true }),
      col('Open WO', (r) => r.openWorkOrders, { mono: true }),
    ],
  },

  engines: componentView('ENGINE', 'Engines on the register, with the two trends a CAMO actually watches: EGT margin and oil consumption.'),
  apu: componentView('APU', 'Auxiliary power units, with their hours since overhaul and their next inspection.'),
  gear: componentView('GEAR', 'Landing gear assemblies, by position, with the overhaul that falls due first.'),
  components: componentView(null, 'Every component with a part number and a serial number. Life used is computed against the tightest of the hour, cycle and calendar limits — a part comes off at whichever arrives first.'),

  tasks: {
    use: () => useProgramme(''),
    note: 'The approved maintenance programme. This is the template; what it becomes on a registration lives in CAMO, which is what lets an interval be amended without rewriting the history of every tail.',
    columns: [
      col('Code', (r) => r.code, { mono: true }),
      col('Title', (r) => r.title),
      col('ATA', (r) => r.ataChapter, { mono: true }),
      col('Type', (r) => r.icaoType),
      col('Hours', (r) => r.intervalHours, { mono: true }),
      col('Months', (r) => r.intervalMonths, { mono: true }),
      col('Mandatory', (r) => (r.mandatory ? 'Yes' : 'No')),
      col('Tails', (r) => r.appliedToAircraft, { mono: true }),
    ],
  },

  ads: directiveView('AD', 'Airworthiness directives: mandatory, and an overdue one grounds the aircraft until it is embodied and released to service.'),
  sbs: directiveView('SB', 'Service bulletins. Not mandatory unless an authority makes them so, which is why they are kept apart from directives.'),

  workOrders: {
    use: useWorkOrders,
    note: 'Work orders with the approved maintenance organisation. A work order closes against a Certificate of Release to Service, not against a tick.',
    columns: [
      col('WO', (r) => r.orderNo, { mono: true }),
      col('Aircraft', (r) => r.registration, { mono: true }),
      col('Task', (r) => r.title),
      col('Facility', (r) => r.facility),
      col('Opened', (r) => dayMonthYear(r.openedOn)),
      col('Target', (r) => r.targetOn ? dayMonthYear(r.targetOn) : r.targetNote),
      col('Status', (r) => titleCase(r.status ?? ''), {
        pill: statusPill(['AOG'], ['AWAITING_PARTS', 'IN_WORK']),
      }),
    ],
  },

  defects: {
    use: useTechLogBoard,
    rows: (data) => data?.defects ?? [],
    note: 'Defects raised on the technical log. A defect leaves the open state in exactly one of two ways: rectified, or deferred under a named MEL line.',
    columns: [
      col('Aircraft', (r) => r.registration, { mono: true }),
      col('ATA', (r) => r.ataChapter, { mono: true }),
      col('Description', (r) => r.description),
      col('Reported', (r) => dayMonthYear(r.reportedAt)),
      col('By', (r) => r.reportedByName),
      col('Status', (r) => titleCase(r.status ?? ''), {
        pill: statusPill(['OPEN'], ['DEFERRED']),
      }),
      col('Corrective action', (r) => r.correctiveAction),
    ],
  },

  mel: {
    use: () => useMelLibrary({}),
    note: 'The MEL / CDL catalogue by aircraft type. These lines define what MAY be deferred and for how long; what IS deferred is in the Hold Item List.',
    columns: [
      col('Ref', (r) => r.itemRef, { mono: true }),
      col('Type', (r) => r.icaoType),
      col('ATA', (r) => r.ataChapter, { mono: true }),
      col('Item', (r) => r.title),
      col('Cat', (r) => r.melCategory, { mono: true }),
      col('Interval', (r) => (r.melCategory === 'A' ? 'per MEL remark' : r.rectificationDays)),
      col('Installed / required', (r) => `${r.installedQuantity ?? '—'} / ${r.requiredQuantity ?? '—'}`, { mono: true }),
      col('Placard', (r) => (r.placardRequired ? 'Required' : 'No')),
    ],
  },

  logbook: {
    use: () => useTechLogPages({ from: '2020-01-01' }),
    note: 'The technical logbook. Signing a page is the only event that advances TSN and CSN — everything else in the record is downstream of it.',
    columns: [
      col('Page', (r) => r.pageRef, { mono: true }),
      col('Aircraft', (r) => r.registration, { mono: true }),
      col('Date', (r) => dayMonthYear(r.flownOn)),
      col('Route', (r) => `${r.depIcao ?? '—'} → ${r.arrIcao ?? '—'}`, { mono: true }),
      col('Block', (r) => minutesToHhmm(r.blockMinutes), { mono: true }),
      col('Cycles', (r) => r.cycles, { mono: true }),
      col('Commander', (r) => r.commanderName),
      col('Status', (r) => titleCase(r.status ?? ''), { pill: statusPill([], ['OPEN']) }),
    ],
  },

  documents: {
    use: () => useCamoAdminDocuments(null),
    note: 'The document library. An expired document grounds an aircraft as surely as a defect does. "No expiry" is a fact about the document, not a gap in the record.',
    columns: [
      col('Category', (r) => r.category),
      col('Reference', (r) => r.reference, { mono: true }),
      col('Aircraft', (r) => r.registration, { mono: true }),
      col('Issued', (r) => dayMonthYear(r.issueDate)),
      col('Expires', (r) => (r.expiryDate ? dayMonthYear(r.expiryDate) : 'no expiry')),
      col('Days', (r) => r.daysToExpiry),
      col('State', (r) => titleCase(r.expiryStatus.replace('_', ' ')), {
        pill: (r) =>
          r.expiryStatus === 'EXPIRED' ? 'bad' : r.expiryStatus === 'EXPIRING' ? 'warn' : '',
      }),
      col('Status', (r) => titleCase(r.status ?? '')),
    ],
  },

  users: {
    use: useUsers,
    note: 'Who may change the record. Declaring an aircraft AOG belongs to the CAMO department, not to a grade: a planner who finds a reason to stop a tail must be able to stop it without waiting for a post holder.',
    columns: [
      col('Name', (r) => r.displayName),
      col('Login', (r) => r.login, { mono: true }),
      col('Role', (r) => titleCase((r.role ?? '').replace('_', ' '))),
      col('CAMO role', (r) => titleCase((r.camoRole ?? '').replace('_', ' '))),
      col('Airworthiness authority', (r) => (INSIDE_CAMO.includes(r.camoRole) ? 'Yes' : 'Read only'), {
        pill: (r) => (INSIDE_CAMO.includes(r.camoRole) ? '' : 'warn'),
      }),
      col('Active', (r) => (r.active ? 'Yes' : 'No')),
    ],
  },
}

/** Membership of the department is what carries the authority, not seniority. */
const INSIDE_CAMO = ['CAMO_MANAGER', 'AIRWORTHINESS', 'ENGINEER', 'PLANNER', 'TECHNICAL_RECORDS']

function componentView(category, note) {
  return {
    use: () => useCamoAdminComponents(category),
    note,
    columns: [
      col('Aircraft', (r) => r.registration, { mono: true }),
      col('Name', (r) => r.name),
      col('Position', (r) => r.position),
      col('P/N', (r) => r.partNumber, { mono: true }),
      col('S/N', (r) => r.serialNumber, { mono: true }),
      col('TSN', (r) => r.tsn, { mono: true }),
      col('CSN', (r) => r.csn, { mono: true }),
      col('Life used', (r) => (r.lifeUsedPercent == null ? null : `${r.lifeUsedPercent}%`), {
        mono: true,
        pill: (r) =>
          r.lifeUsedPercent == null ? '' : r.lifeUsedPercent >= 95 ? 'bad' : r.lifeUsedPercent >= 90 ? 'warn' : '',
      }),
      col('Next inspection', (r) => dayMonthYear(r.nextInspection)),
      col('Status', (r) => titleCase(r.status ?? ''), {
        pill: statusPill(['UNSERVICEABLE', 'SCRAPPED'], ['REMOVED']),
      }),
    ],
  }
}

function directiveView(kind, note) {
  return {
    use: () => useDirectives(false),
    rows: (data) => (data ?? []).filter((row) => row.kind === kind),
    note,
    columns: [
      col('Reference', (r) => r.reference, { mono: true }),
      col('Subject', (r) => r.subject),
      col('Issued by', (r) => r.issuedBy),
      col('Effective', (r) => dayMonthYear(r.effectiveOn)),
      col('Comply by', (r) => dayMonthYear(r.complianceByDate)),
      col('Applies to', (r) => r.icaoType),
      col('Complied', (r) => r.aircraftComplied, { mono: true }),
      col('Outstanding', (r) => r.aircraftOutstanding, { mono: true }),
      col('Status', (r) => titleCase((r.status ?? '').replace('_', ' ')), {
        pill: statusPill(['OVERDUE'], ['OPEN']),
      }),
    ],
  }
}
