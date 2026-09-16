const SEVERITIES = [
  ['A', 'Catastrophic'],
  ['B', 'Hazardous'],
  ['C', 'Major'],
  ['D', 'Minor'],
  ['E', 'Negligible'],
]

const PROBABILITIES = [
  [5, 'Frequent'],
  [4, 'Occasional'],
  [3, 'Remote'],
  [2, 'Improbable'],
  [1, 'Extremely improbable'],
]

/**
 * The operator's 5×5 matrix, read from safety.risk_matrix.
 *
 * The colour of a cell is the level the operator declared, not a formula:
 * a matrix may be asymmetric, and severity × probability would flatten that.
 * The number in the cell is how many open occurrences currently sit there.
 */
export default function RiskMatrix({ cells = [] }) {
  const byKey = new Map(cells.map((cell) => [`${cell.severity}${cell.probability}`, cell]))

  return (
    <div className="matrix">
      <table>
        <thead>
          <tr>
            <th />
            {PROBABILITIES.map(([value, label]) => (
              <th key={value} title={label}>
                {value} · {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEVERITIES.map(([severity, label]) => (
            <tr key={severity}>
              <th title={label}>{severity} · {label}</th>
              {PROBABILITIES.map(([probability]) => {
                const cell = byKey.get(`${severity}${probability}`)
                if (!cell) {
                  return (
                    <td key={probability} title="The operator matrix does not define this cell">
                      <span className="cell__label">undefined</span>
                    </td>
                  )
                }
                return (
                  <td key={probability} className={`cell--${cell.riskLevel}`} title={cell.actionRequired}>
                    <span className="cell__count">{cell.occurrences}</span>
                    <span className="cell__label">{cell.riskLevel.toLowerCase()}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
