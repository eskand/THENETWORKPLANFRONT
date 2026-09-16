import Badge from '../../../components/Badge'
import { ErrorState, LoadingState } from '../../../components/States'
import { useReferenceSets } from '../../../hooks/usePlatform'
import { dayMonthYear } from '../../../lib/format'

const COLUMNS = ['Set', 'Schema', 'Table', 'Owned by', 'Rows', 'Last change', 'Source of truth', 'Used for']

/**
 * Les jeux de référence chargés.
 *
 * <b>Cet onglet n'existe pas dans le prototype</b>, et c'est délibéré. Les
 * comptes de lignes sont interrogés, pas déclarés : un jeu jamais chargé
 * affiche zéro et dit ce qui casse à cause de ça. L'audit avait trouvé deux
 * annuaires d'aérodromes concurrents et aucun moyen de savoir lequel servait —
 * cette page est la réponse à cette question.
 */
export default function ReferenceSets() {
  const sets = useReferenceSets()

  if (sets.isError) return <ErrorState error={sets.error} onRetry={() => sets.refetch()} />
  if (!sets.data) return <LoadingState label="Counting the reference sets…" />

  const data = sets.data

  return (
    <div className="db-body">
      <div className="kpi-strip">
        <div className="kpi" style={{ '--kpi-accent': 'var(--accent-orange)' }}>
          <span className="kpi__corners" />
          <div className="eyebrow">Reference sets</div>
          <div className="kpi__value">{data.sets.length}</div>
          <div className="kpi__hint">catalogued</div>
        </div>
        <div className="kpi" style={{ '--kpi-accent': 'var(--info-fg)' }}>
          <span className="kpi__corners" />
          <div className="eyebrow">Rows loaded</div>
          <div className="kpi__value">{data.totalRows.toLocaleString('en-US')}</div>
          <div className="kpi__hint">counted, not declared</div>
        </div>
        <div className="kpi"
             style={{ '--kpi-accent': 'var(--attention-fg)',
                      '--kpi-value': data.emptySets > 0 ? 'var(--attention-fg)' : undefined }}>
          <span className="kpi__corners" />
          <div className="eyebrow">Empty sets</div>
          <div className="kpi__value">{data.emptySets}</div>
          <div className="kpi__hint">nothing loaded yet</div>
        </div>
      </div>

      <div className="db-table-wrap" style={{ marginTop: 18 }}>
        <table className="db-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className={column === 'Rows' ? 'db-table__num' : undefined}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sets.map((set) => (
              <tr key={set.code}>
                <td className="db-table__reg">{set.label}</td>
                <td className="db-table__muted">{set.schemaName}</td>
                <td className="db-table__muted">{set.tableName}</td>
                <td>{set.ownedBy}</td>
                <td className="db-table__num">
                  {set.rowCount === 0 ? (
                    <Badge tone="ATTENTION" warn>empty</Badge>
                  ) : set.rowCount.toLocaleString('en-US')}
                </td>
                <td className="db-table__num">{dayMonthYear(set.lastUpdatedAt)}</td>
                <td className="db-table__muted">{set.sourceOfTruth}</td>
                <td style={{ whiteSpace: 'normal', maxWidth: 340 }}>{set.usedFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
