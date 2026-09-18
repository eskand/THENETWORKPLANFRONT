import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { askVigil, fetchVigilPanel, setVigilAlertStatus } from '../api/vigil'

/**
 * Le panneau VIGIL, rafraichi toutes les soixante secondes — la cadence de
 * `scanEveryS` de l'annexe (l. 97954). Chaque lecture EST un balayage : c'est
 * le panneau qui donne le rythme, comme le Web Worker donnait le sien.
 *
 * <p>La requete part des que le composant est monte, panneau ferme ou non :
 * la pastille de l'en-tete doit dire l'etat du reseau avant qu'on l'ouvre.
 */
export function useVigilPanel() {
  return useQuery({
    queryKey: ['vigil-panel'],
    queryFn: fetchVigilPanel,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useSetVigilAlertStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ alertId, status }) => setVigilAlertStatus(alertId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vigil-panel'] }),
  })
}

export function useAskVigil() {
  return useMutation({ mutationFn: askVigil })
}
