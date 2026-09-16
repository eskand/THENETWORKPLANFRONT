import { Link } from 'react-router-dom'

/**
 * The four Data destinations.
 *
 * Import, Export, Integrations and Settings. Each says plainly what this build
 * does and does not do: the prototype's import screen accepts a file into a
 * browser store, which is not the same thing as loading an airworthiness
 * record into a database that then has to defend it. Saying so is better than
 * a screen that looks finished and loses the file.
 */
export default function AdminData({ view, board }) {
  const page = PAGES[view]
  return (
    <div className="ca-page">
      <div className="ca-head">
        <div>
          <div className="ca-h1">{page.title}</div>
          <div className="ca-h2">{page.lead}</div>
        </div>
      </div>

      {page.body(board)}
    </div>
  )
}

const PAGES = {
  import: {
    title: 'Import',
    lead:
      'Loading an airworthiness record from outside. Every imported row keeps the file it came from, so the record can always say where a figure originated.',
    body: (board) => (
      <>
        <div className="ca-card">
          <div className="ca-ch">
            <span>What the record carries today</span>
          </div>
          <div className="ca-row t-neutral">
            <span>Aircraft with an external provenance</span>
            <b>
              {board.recordsFromImport} of {board.aircraft}
            </b>
          </div>
          <div className="ca-row t-neutral">
            <span>Components on the register</span>
            <b>{board.components}</b>
          </div>
          <div className="ca-row t-neutral">
            <span>Documents on file</span>
            <b>{board.documents}</b>
          </div>
        </div>

        <div className="ca-card">
          <div className="ca-ch">
            <span>Not built in this release</span>
          </div>
          <div className="ca-note">
            The file upload is not implemented here. It is deliberately absent rather than
            half-present: an import that parses a spreadsheet into a browser and calls it done is
            the failure mode this record exists to avoid. Until it is built, rows arrive through
            the operational modules, through a connector, or through a migration — each of which
            leaves a provenance the audit trail can read back.
          </div>
        </div>
      </>
    ),
  },

  export: {
    title: 'Export',
    lead:
      'Taking the record out — for an authority, for an owner, or for a maintenance organisation.',
    body: () => (
      <div className="ca-card">
        <div className="ca-ch">
          <span>Not built in this release</span>
        </div>
        <div className="ca-note">
          Nothing exports from this screen yet. What the module already answers is available
          through its API, and the Reports module produces the documents an authority asks for.
          A half-working export is worse than none: a file that silently drops a column is a file
          somebody will sign.
        </div>
      </div>
    ),
  },

  connectors: {
    title: 'Integrations',
    lead:
      'Synchronisation with a maintenance organisation, a manufacturer, or a records system.',
    body: () => (
      <div className="ca-card">
        <div className="ca-ch">
          <span>Not built in this release</span>
        </div>
        <div className="ca-note">
          No connector is configured. The schema is ready for one — every row carries a source
          type, a source reference and a source timestamp, which is what a synchronised record
          needs in order to say which side a value came from and when.
        </div>
      </div>
    ),
  },

  settings: {
    title: 'Settings',
    lead:
      'The thresholds and the operator details the airworthiness screens read.',
    body: () => (
      <div className="ca-card">
        <div className="ca-ch">
          <span>Where these live</span>
        </div>
        <div className="ca-note">
          The operator settings are held in one place for the whole platform rather than one copy
          per module — two copies of a review horizon would eventually disagree about what "due
          soon" means. They are edited in{' '}
          <Link to="/settings">Settings</Link>, under Maintenance and Safety.
        </div>
      </div>
    ),
  },
}
