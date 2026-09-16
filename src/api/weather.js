import client from './client'

/**
 * GET /v1/weather/stations?stations=DTTA,LFML
 *
 * One entry point for the whole product: no screen calls a weather provider
 * itself, and no provider token ever reaches the browser.
 */
export async function fetchStationWeather(stations) {
  if (!stations || stations.length === 0) return null
  const { data } = await client.get('/weather/stations', {
    params: { stations: stations.join(',') },
  })
  return data
}

/** POST /v1/weather/observations — a METAR read over the radio or off an ATIS. */
export async function recordMetar(rawText) {
  const { data } = await client.post('/weather/observations', { rawText })
  return data
}
