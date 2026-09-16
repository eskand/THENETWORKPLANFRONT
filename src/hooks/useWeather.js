import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStationWeather, recordMetar } from '../api/weather'

/**
 * Station weather.
 *
 * A METAR is issued every half hour and the server refetches at most every
 * ten minutes, so polling faster than five would only re-render the same
 * message. The age of each observation travels with it, so a stale one is
 * visible between two refreshes.
 */
export function useStationWeather(stations) {
  const key = [...(stations ?? [])].sort().join(',')
  return useQuery({
    queryKey: ['station-weather', key],
    queryFn: () => fetchStationWeather(stations),
    enabled: Boolean(key),
    refetchInterval: 300_000,
    staleTime: 120_000,
    placeholderData: (previous) => previous,
    retry: false,
  })
}

export function useRecordMetar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordMetar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['station-weather'] }),
  })
}
