/**
 * One chart of a report.
 *
 * <b>Drawn as SVG, from the server's labels and series.</b> No chart library:
 * the four shapes the catalogue actually uses — bar, line, donut, stacked — are
 * a few dozen lines each, and a dependency that renders to canvas would not be
 * readable by a screen reader or selectable for a screenshot.
 *
 * <b>The axis starts at zero.</b> A bar chart that starts anywhere else
 * exaggerates whatever it is showing, and these are figures an operator quotes.
 */
export default function ReportChart({ chart }) {
  const { kind, width, title, labels, series } = chart
  const hasData = series?.some((entry) => entry.data?.some((value) => value > 0))

  return (
    <figure className={`rpc rpc--${width ?? 'half'}`}>
      <figcaption>{title}</figcaption>
      {!hasData ? (
        <div className="rpc__empty">Nothing to plot in this period.</div>
      ) : kind === 'donut' ? (
        <Donut labels={labels} series={series} />
      ) : kind === 'line' ? (
        <Line labels={labels} series={series} />
      ) : (
        <Bars labels={labels} series={series} />
      )}
    </figure>
  )
}

const W = 520
const H = 190
const PAD_L = 42
const PAD_B = 26
const PAD_T = 10

function scale(series) {
  const max = Math.max(...series.flatMap((entry) => entry.data ?? [0]), 0)
  // A flat zero series would divide by zero; one is the honest floor.
  return max === 0 ? 1 : max
}

function Bars({ labels, series }) {
  const max = scale(series)
  const data = series[0]?.data ?? []
  const step = (W - PAD_L - 8) / Math.max(1, data.length)
  const barWidth = Math.max(2, Math.min(28, step * 0.62))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpc__svg" role="img"
         aria-label={`${series[0]?.label ?? 'series'} by ${labels.length} categories`}>
      <Grid max={max} />
      {data.map((value, index) => {
        const height = (value / max) * (H - PAD_T - PAD_B)
        const x = PAD_L + index * step + (step - barWidth) / 2
        return (
          <g key={labels[index] ?? index}>
            <rect
              x={x}
              y={H - PAD_B - height}
              width={barWidth}
              height={Math.max(0, height)}
              rx="2"
              fill={series[0].colour ?? '#1B2D6B'}
            >
              <title>{`${labels[index]}: ${round(value)}`}</title>
            </rect>
          </g>
        )
      })}
      <Labels labels={labels} step={step} />
    </svg>
  )
}

function Line({ labels, series }) {
  const max = scale(series)
  const data = series[0]?.data ?? []
  const step = data.length > 1 ? (W - PAD_L - 12) / (data.length - 1) : 0
  const points = data.map((value, index) => [
    PAD_L + index * step,
    H - PAD_B - (value / max) * (H - PAD_T - PAD_B),
  ])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpc__svg" role="img"
         aria-label={`${series[0]?.label ?? 'series'} over ${labels.length} points`}>
      <Grid max={max} />
      <polyline
        fill="none"
        stroke={series[0].colour ?? '#a9811d'}
        strokeWidth="2"
        strokeLinejoin="round"
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
      />
      {points.map(([x, y], index) => (
        <circle key={labels[index] ?? index} cx={x} cy={y} r="2.6"
                fill={series[0].colour ?? '#a9811d'}>
          <title>{`${labels[index]}: ${round(data[index])}`}</title>
        </circle>
      ))}
      <Labels labels={labels} step={step} offset={0} />
    </svg>
  )
}

const DONUT_COLOURS = ['#1B2D6B', '#a9811d', '#2f6fb0', '#1f9d5c', '#C8202F',
  '#7b4fc9', '#b8790a', '#00b4d8']

function Donut({ labels, series }) {
  const data = series[0]?.data ?? []
  const total = data.reduce((sum, value) => sum + value, 0)
  if (!total) return <div className="rpc__empty">Nothing to plot.</div>

  const radius = 62
  const inner = 38
  let angle = -Math.PI / 2

  return (
    <div className="rpc__donut">
      <svg viewBox="0 0 160 160" className="rpc__svg rpc__svg--donut" role="img"
           aria-label={`${labels.length} slices`}>
        {data.map((value, index) => {
          const slice = (value / total) * Math.PI * 2
          const path = arc(80, 80, radius, inner, angle, angle + slice)
          angle += slice
          return (
            <path key={labels[index] ?? index} d={path}
                  fill={DONUT_COLOURS[index % DONUT_COLOURS.length]}>
              <title>{`${labels[index]}: ${round(value)} (${Math.round(value / total * 100)}%)`}</title>
            </path>
          )
        })}
      </svg>
      <ul className="rpc__legend">
        {labels.map((label, index) => (
          <li key={label}>
            <i style={{ background: DONUT_COLOURS[index % DONUT_COLOURS.length] }} />
            {label}
            <b>{round(data[index])}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Four gridlines and their values. Without them a bar height means nothing. */
function Grid({ max }) {
  const lines = [0, 0.25, 0.5, 0.75, 1]
  return (
    <g className="rpc__grid">
      {lines.map((fraction) => {
        const y = H - PAD_B - fraction * (H - PAD_T - PAD_B)
        return (
          <g key={fraction}>
            <line x1={PAD_L} y1={y} x2={W - 6} y2={y} />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end">{round(max * fraction)}</text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * Category labels, thinned so they never overlap.
 *
 * <p>A chart with thirty overlapping date labels is a chart with none: every
 * nth is drawn, and the tooltip carries the rest.
 */
function Labels({ labels, step, offset = 0.5 }) {
  const every = Math.max(1, Math.ceil(labels.length / 12))
  return (
    <g className="rpc__labels">
      {labels.map((label, index) => (
        index % every === 0 ? (
          <text key={label ?? index} x={PAD_L + (index + offset) * step} y={H - 8}
                textAnchor="middle">
            {label}
          </text>
        ) : null
      ))}
    </g>
  )
}

function arc(cx, cy, outer, inner, start, end) {
  const large = end - start > Math.PI ? 1 : 0
  const x1 = cx + outer * Math.cos(start)
  const y1 = cy + outer * Math.sin(start)
  const x2 = cx + outer * Math.cos(end)
  const y2 = cy + outer * Math.sin(end)
  const x3 = cx + inner * Math.cos(end)
  const y3 = cy + inner * Math.sin(end)
  const x4 = cx + inner * Math.cos(start)
  const y4 = cy + inner * Math.sin(start)
  return `M${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} `
    + `L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`
}

function round(value) {
  if (value >= 100) return String(Math.round(value))
  return String(Math.round(value * 10) / 10)
}
