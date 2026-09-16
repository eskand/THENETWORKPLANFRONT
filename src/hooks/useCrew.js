import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCrewAbsence,
  createCrewMember,
  fetchCrewExpiries,
  fetchCrewList,
  fetchCrewMember,
  fetchOpsQualifications,
  setApproachCategory,
  updateCrewMember,
} from '../api/crew'

/**
 * Crew data is not a live operational picture: it changes when someone edits a
 * file, not every thirty seconds. So, unlike the dispatch board, these queries
 * do not poll — they are invalidated by the mutations below.
 */
export function useCrewList(filters) {
  return useQuery({
    queryKey: ['crew-list', filters],
    queryFn: () => fetchCrewList(filters),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useCrewMember(personId) {
  return useQuery({
    queryKey: ['crew-member', personId],
    queryFn: () => fetchCrewMember(personId),
    enabled: Boolean(personId),
  })
}

export function useCrewExpiries(horizonDays = 90) {
  return useQuery({
    queryKey: ['crew-expiries', horizonDays],
    queryFn: () => fetchCrewExpiries(horizonDays),
    staleTime: 300_000,
  })
}

function useCrewMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // The server owns the truth; refetch rather than patch the cache by hand.
      queryClient.invalidateQueries({ queryKey: ['crew-list'] })
      queryClient.invalidateQueries({ queryKey: ['crew-member'] })
      queryClient.invalidateQueries({ queryKey: ['crew-expiries'] })
    },
  })
}

export function useCreateCrewMember() {
  return useCrewMutation(createCrewMember)
}

export function useUpdateCrewMember() {
  return useCrewMutation(({ personId, command }) => updateCrewMember(personId, command))
}

export function useAddCrewAbsence() {
  return useCrewMutation(({ personId, command }) => addCrewAbsence(personId, command))
}

export function useOpsQualifications() {
  return useQuery({ queryKey: ['crew-ops-qualifications'], queryFn: fetchOpsQualifications })
}

export function useSetApproachCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ personId, ...command }) => setApproachCategory(personId, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-ops-qualifications'] })
      // La catégorie fait partie du dossier : la fiche équipage la relira.
      queryClient.invalidateQueries({ queryKey: ['crew'] })
    },
  })
}
