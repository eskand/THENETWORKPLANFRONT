import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, Sun, Zap } from 'lucide-react'
import { hhmm } from '../../../lib/format'

/**
 * Meteo des terrains.
 *
 * Chaque valeur vient de GET /v1/weather/stations, donc d'une ligne de
 * refdata.weather_observations, donc d'un METAR recu et decode — avec son
 * heure d'observation, son age et le nom de sa source. Une escale sans
 * observation le dit ; elle n'affiche pas la derniere qu'on aurait sous la
 * main.
 */

/** L'icone suit les groupes de temps present, pas une humeur. */
function icon(observation) {
  const conditions = observation?.conditions ?? ''
  if (/TS/.test(conditions)) return Zap
  if (/SN|SG/.test(conditions)) return CloudSnow
  if (/RA|SH/.test(conditions)) return CloudRain
  if (/DZ/.test(conditions)) return CloudDrizzle
  if (/FG|BR|HZ|FU/.test(conditions)) return CloudFog
  if (observation?.cavok || (observation?.ceilingFt ?? 99999) > 5000) return Sun
  return Cloud
}

/** « Clear · wind 320/10kt · vis 10km · QNH 1014 », comme sur la maquette. */
function summary(observation) {
  const parts = []

  if (observation.cavok) {
    parts.push('CAVOK')
  } else if (observation.conditions) {
    parts.push(observation.conditions)
  } else if (observation.ceilingFt !== null && observation.ceilingFt !== undefined) {
    parts.push(`ceiling ${observation.ceilingFt} ft`)
  } else {
    parts.push('No significant weather')
  }

  if (observation.windSpeedKt !== null && observation.windSpeedKt !== undefined) {
    const direction = observation.windVariable
      ? 'VRB'
      : String(observation.windDirDeg ?? 0).padStart(3, '0')
    const gust = observation.windGustKt ? `G${observation.windGustKt}` : ''
    parts.push(`wind ${direction}/${observation.windSpeedKt}${gust}kt`)
  }

  if (!observation.cavok && observation.visibilityM !== null && observation.visibilityM !== undefined) {
    parts.push(
      observation.visibilityM >= 9999
        ? 'vis 10km+'
        : `vis ${(observation.visibilityM / 1000).toFixed(1)}km`,
    )
  }

  if (observation.qnhHpa) {
    parts.push(`QNH ${observation.qnhHpa}`)
  }
  return parts.join(' · ')
}

const CATEGORY_TONE = { VFR: 'ok', MVFR: 'warn', IFR: 'crit', LIFR: 'crit' }

export default function WeatherPanel({ occ, weather, loading }) {
  const stations = weather?.stations ?? []
  const bases = occ.bases

  return (
    <div className="dash-card dash-card-wx">
      <div className="dash-card-head">
        <h3>
          <Cloud size={17} strokeWidth={2} />
          Station weather
        </h3>
        <span className="cnt">
          {weather?.computedAt ? `updated ${hhmm(weather.computedAt)}Z` : 'no source'}
        </span>
      </div>

      {bases.length === 0 ? (
        <div className="dash-empty">No base returned by the dispatch board</div>
      ) : null}

      {bases.length > 0 && loading && stations.length === 0 ? (
        <div className="dash-empty">Fetching observations…</div>
      ) : null}

      {stations.length > 0 ? (
        <div className="dash-list">
          {stations.map((station) => {
            const observation = station.observation
            const Icon = icon(observation)
            const missing = station.state === 'NO_OBSERVATION'
            const stale = station.state === 'STALE'

            return (
              <div className="wx-row" key={station.icao} title={observation?.rawText ?? undefined}>
                <span className={`wx-icon ${missing ? 'unknown' : ''}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="wx-main">
                  <span className="code">{station.icao}</span>
                  <span className="cond">
                    {missing
                      ? 'No observation received'
                      : `${summary(observation)}${stale ? ' — stale' : ''}`}
                  </span>
                </span>
                <span className="wx-metrics">
                  <span className="t">
                    {observation?.temperatureC === null || observation?.temperatureC === undefined
                      ? '—'
                      : `${observation.temperatureC}°C`}
                  </span>
                  <span className={`w ${observation ? CATEGORY_TONE[observation.flightCategory] ?? '' : ''}`}>
                    {missing
                      ? 'waiting for METAR'
                      : `${observation.flightCategory ?? 'no category'} · ${observation.ageMinutes} min`}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="wx-live-note">
        {weather?.sourceConnected
          ? `Source ${weather.provider} · observation older than ${weather.staleThresholdMinutes} min shown as stale`
          : 'No weather source connected — set netplus.weather.provider'}
      </div>
    </div>
  )
}
