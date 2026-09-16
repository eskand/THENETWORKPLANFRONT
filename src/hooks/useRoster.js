import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRosterVersion,
  deleteRosterEntry,
  fetchRosterGrid,
  fetchRosterMonth,
  fetchRosterVersions,
  publishRoster,
  saveRosterEntry,
} from '../api/roster'

export function useRosterVersions() {
  return useQuery({
    queryKey: ['roster-versions'],
    queryFn: fetchRosterVersions,
    staleTime: 60_000,
  })
}

export function useRosterGrid(versionId) {
  return useQuery({
    queryKey: ['roster-grid', versionId ?? 'published'],
    queryFn: () => fetchRosterGrid(versionId),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    // A missing published roster is an answer, not a failure to retry.
    retry: false,
  })
}

function useRosterMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster-versions'] })
      queryClient.invalidateQueries({ queryKey: ['roster-grid'] })
      queryClient.invalidateQueries({ queryKey: ['roster-month'] })
    },
  })
}

export function usePublishRoster() {
  return useRosterMutation(publishRoster)
}

export function useSaveRosterEntry() {
  return useRosterMutation(({ versionId, command }) => saveRosterEntry(versionId, command))
}

export function useDeleteRosterEntry() {
  return useRosterMutation(deleteRosterEntry)
}

export function useCreateRosterVersion() {
  return useRosterMutation(createRosterVersion)
}

/**
 * Ecrire plusieurs jours d'un coup — la plage de dates de l'editeur.
 *
 * Les jours partent en serie et non en parallele : le serveur reprend la
 * cellule existante avant de la reecrire, et deux ecritures simultanees sur la
 * meme ligne se liraient l'une l'autre a moitie. Une plage d'un mois fait
 * trente appels ; c'est le prix d'un compte juste.
 *
 * La premiere erreur arrete la serie et remonte telle quelle : mieux vaut sept
 * jours ecrits et un message qu'un silence sur trente.
 */
export function useSaveRosterDays() {
  return useRosterMutation(async ({ versionId, days, command }) => {
    const saved = []
    for (const day of days) {
      saved.push(await saveRosterEntry(versionId, { ...command, dutyDate: day }))
    }
    return saved
  })
}

export function useRosterMonth(month) {
  return useQuery({
    queryKey: ['roster-month', month],
    queryFn: () => fetchRosterMonth(month),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}
