import '../styles/chart.css'

/**
 * One chart, wherever it is drawn.
 *
 * <b>Drawn as SVG, from the server's labels and series.</b> No chart library:
 * the five shapes the product actually uses — bar, horizontal bar, line,
 * donut and stacked — are a few dozen lines each, and a dependency that renders
 * to canvas would not be readable by a screen reader or selectable for a
 * screenshot.
 *
 * <b>The axis starts at zero.</b> A bar chart that starts anywhere else
 * exaggerates whatever it is showing, and these are figures an operator quotes.
 *
 * <b>Colour comes from the server when the categories mean something.</b> A
 * status donut sends its own slice colours so that "cancelled" stays red when
 * the period changes and a slice disappears; only a neutral series falls back
 * to the palette.
 */
export default function Chart({ chart, bare = false }) {
  /* Mode nu : la carte qui accueille le dessin porte deja son titre.
     Le repeter dans la figure donne deux fois le meme libelle a dix
     pixels d intervalle, ce que ni l annexe ni personne ne fait. */
  const { kind, width, title, labels, series } = chart
  const hasData = series?.some((entry) => entry.data?.some((value) => value !== 0))

  return (
    <figure className={`rpc rpc--${width ?? 'half'}`}>
      {bare ? null : <figcaption>{title}</figcaption>}
      {!hasData ? (
        <div className="rpc__empty">Nothing to plot in this period.</div>
      ) : kind === 'donut' ? (
        <Donut labels={labels} series={series} />
      ) : kind === 'line' ? (
        <Line labels={labels} series={series} />
      ) : kind === 'hbar' ? (
        <HorizontalBars labels={labels} series={series} />
      ) : kind === 'stacked' ? (
        <Stacked labels={labels} series={series} />
      ) : (
        <Bars labels={labels} series={series} />
      )}
      {series.length > 1 && kind !== 'donut' ? (
        <ul className="rpc__keys">
          {series.map((entry, index) => (
            <li key={index}>
              <i style={{ background: entry.colour ?? '#c7cbd6' }} />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  )
}

/* La palette du prototype, au chiffre hexadecimal pres. */
const PALETTE = ['#1B2D6B', '#C9A227', '#1f9d5c', '#2f6fb0', '#C8202F',
  '#7b4fc9', '#b8790a', '#0f766e', '#9333ea', '#64748b']

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

/** The colour of one point: the server's, else the series', else the palette. */
function pointColour(entry, index, fallback) {
  if (entry.colours?.[index]) return entry.colours[index]
  return entry.colour ?? fallback ?? PALETTE[0]
}

/**
 * Vertical bars — one series, or several side by side.
 *
 * <p><b>Two series are drawn grouped, not stacked.</b> « Initial risk » and
 * « residual after controls » are two readings of the same thing, not two parts
 * of a total: stacking them would draw a bar of 27 where the risk is 15, and
 * the eye would read the controls as making the risk worse.
 */
function Bars({ labels, series }) {
  const max = scale(series)
  const count = Math.max(1, labels.length)
  const step = (W - PAD_L - 8) / count
  const lanes = Math.max(1, series.length)
  const groupWidth = Math.max(2, Math.min(30, step * 0.66))
  const barWidth = Math.max(1.5, (groupWidth - (lanes - 1) * 2) / lanes)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpc__svg" role="img"
         aria-label={`${series.map((entry) => entry.label).join(' and ')} by ${labels.length} categories`}>
      <Grid max={max} />
      {labels.map((label, index) => (
        <g key={index}>
          {series.map((entry, lane) => {
            const value = entry.data?.[index] ?? 0
            const height = (value / max) * (H - PAD_T - PAD_B)
            const left = PAD_L + index * step + (step - groupWidth) / 2
            const x = left + lane * (barWidth + 2)
            return (
              <rect
                key={lane}
                x={x}
                y={H - PAD_B - height}
                width={barWidth}
                height={Math.max(0, height)}
                rx="2"
                fill={pointColour(entry, index, PALETTE[lane % PALETTE.length])}
              >
                <title>
                  {`${label}${lanes > 1 ? ' · ' + entry.label : ''}: ${round(value)}`}
                </title>
              </rect>
            )
          })}
        </g>
      ))}
      <Labels labels={labels} step={step} />
    </svg>
  )
}

/**
 * Bars laid on their side.
 *
 * <p>For categories that are names — routes, aerodromes, delay causes. A route
 * label under a vertical bar has to be rotated to fit, and a rotated label is a
 * picture of text.
 */
function HorizontalBars({ labels, series }) {
  const data = series[0]?.data ?? []
  const max = scale(series)
  const rowHeight = 20
  const gutter = 96
  const height = Math.max(60, data.length * rowHeight + 16)
  const barMax = W - gutter - 46

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="rpc__svg" role="img"
         aria-label={`${series[0]?.label ?? 'series'} across ${labels.length} categories`}>
      {data.map((value, index) => {
        const barWidth = (value / max) * barMax
        const y = 8 + index * rowHeight
        return (
          <g key={index}>
            <text x={gutter - 6} y={y + 12} textAnchor="end" className="rpc__cat">
              {labels[index]}
            </text>
            <rect x={gutter} y={y + 2} width={Math.max(1, barWidth)} height={rowHeight - 7}
                  rx="2" fill={pointColour(series[0], index)}>
              <title>{`${labels[index]}: ${round(value)}`}</title>
            </rect>
            <text x={gutter + barWidth + 5} y={y + 12} className="rpc__val">
              {round(value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Several layers on the same category. The total is the bar. */
function Stacked({ labels, series }) {
  const totals = labels.map((_, index) =>
    series.reduce((sum, entry) => sum + (entry.data?.[index] ?? 0), 0))
  const max = Math.max(...totals, 0) || 1
  const step = (W - PAD_L - 8) / Math.max(1, labels.length)
  const barWidth = Math.max(2, Math.min(30, step * 0.66))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpc__svg" role="img"
         aria-label={`${series.length} series across ${labels.length} categories`}>
      <Grid max={max} />
      {labels.map((label, index) => {
        let cursor = 0
        return (
          <g key={index}>
            {series.map((entry, layer) => {
              const value = entry.data?.[index] ?? 0
              const height = (value / max) * (H - PAD_T - PAD_B)
              const y = H - PAD_B - cursor - height
              cursor += height
              if (value === 0) return null
              return (
                <rect
                  key={layer}
                  x={PAD_L + index * step + (step - barWidth) / 2}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill={entry.colour ?? PALETTE[layer % PALETTE.length]}
                >
                  <title>{`${label} · ${entry.label}: ${round(value)}`}</title>
                </rect>
              )
            })}
          </g>
        )
      })}
      <Labels labels={labels} step={step} />
    </svg>
  )
}

function Line({ labels, series }) {
  const max = scale(series)
  const count = series[0]?.data?.length ?? 0
  const step = count > 1 ? (W - PAD_L - 12) / (count - 1) : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpc__svg" role="img"
         aria-label={`${series.length} series over ${labels.length} points`}>
      <Grid max={max} />
      {series.map((entry, layer) => {
        const colour = entry.colour ?? PALETTE[layer % PALETTE.length]
        const points = (entry.data ?? []).map((value, index) => [
          PAD_L + index * step,
          H - PAD_B - (value / max) * (H - PAD_T - PAD_B),
        ])
        return (
          <g key={layer}>
            <polyline
              fill="none"
              stroke={colour}
              strokeWidth="2"
              strokeLinejoin="round"
              points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            />
            {points.length <= 40 ? points.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="2.6" fill={colour}>
                <title>{`${labels[index]} · ${entry.label}: ${round(entry.data[index])}`}</title>
              </circle>
            )) : null}
          </g>
        )
      })}
      <Labels labels={labels} step={step} offset={0} />
    </svg>
  )
}

function Donut({ labels, series }) {
  const entry = series[0] ?? {}
  const data = entry.data ?? []
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
          // Une part unique ferait un arc de 360°, que le path referme en rien.
          const path = data.filter((one) => one > 0).length === 1
            ? ring(80, 80, radius, inner)
            : arc(80, 80, radius, inner, angle, angle + slice)
          angle += slice
          if (value === 0) return null
          return (
            <path key={index} d={path}
                  fill={pointColour(entry, index, PALETTE[index % PALETTE.length])}
                  fillRule="evenodd">
              <title>
                {`${labels[index]}: ${round(value)} (${Math.round(value / total * 100)}%)`}
              </title>
            </path>
          )
        })}
      </svg>
      <ul className="rpc__legend">
        {labels.map((label, index) => (
          <li key={index}>
            <i style={{ background: pointColour(entry, index, PALETTE[index % PALETTE.length]) }} />
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
          <text key={index} x={PAD_L + (index + offset) * step} y={H - 8}
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

/** A full ring, for the case where one category holds everything. */
function ring(cx, cy, outer, inner) {
  return `M${cx - outer},${cy} a${outer},${outer} 0 1 0 ${outer * 2},0 `
    + `a${outer},${outer} 0 1 0 ${-outer * 2},0 `
    + `M${cx - inner},${cy} a${inner},${inner} 0 1 0 ${inner * 2},0 `
    + `a${inner},${inner} 0 1 0 ${-inner * 2},0`
}

function round(value) {
  if (value >= 100) return String(Math.round(value))
  return String(Math.round(value * 10) / 10)
}
