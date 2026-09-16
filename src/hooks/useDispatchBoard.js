import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeAlert,
  fetchDispatchBoard,
  fetchLegReadiness,
  fetchOpenAlerts,
} from '../api/dispatch'

/**
 * The board polls: an OCC leaves this screen open, and the server caches the
 * read model for twenty seconds, so a thirty-second refetch costs one query set
 * however many dispatchers are watching.
 */
export function useDispatchBoard(filters) {
  return useQuery({
    queryKey: ['dispatch-board', filters],
    queryFn: () => fetchDispatchBoard(filters),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  })
}

export function useLegReadiness(legId) {
  return useQuery({
    queryKey: ['leg-readiness', legId],
    queryFn: () => fetchLegReadiness(legId),
    enabled: Boolean(legId),
  })
}

export function useOpenAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchOpenAlerts,
    refetchInterval: 60_000,
  })
}

/**
 * Prendre une alerte en compte.
 *
 * Apres l'ecriture, la liste est reinvalidee plutot que corrigee a la main :
 * le compte affiche reste celui que le serveur repond, y compris si une
 * autre alerte est apparue entre-temps.
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })
}
