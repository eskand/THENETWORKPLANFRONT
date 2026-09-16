import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateErp,
  addErpLogEntry,
  assessSituation,
  changeErpLevel,
  fetchErpCatalogue,
  fetchErpChecklists,
  fetchErpConsole,
  fetchErpReference,
  fetchErpTemplates,
  postErpSitrep,
  recordErpNotification,
  setErpCheck,
  standDownErp,
  updateErpSubject,
} from '../api/erp'

/**
 * The console refetches every fifteen seconds while an event is open and every
 * two minutes while the plan is merely armed. The elapsed clock is drawn from
 * `activatedAt` in the browser, so the poll is about other people's actions —
 * a second desk ticking an item — not about the clock.
 */
export function useErpConsole() {
  return useQuery({
    queryKey: ['erp-console'],
    queryFn: fetchErpConsole,
    refetchInterval: (query) => (query.state.data?.armed === false ? 15_000 : 120_000),
    retry: false,
  })
}

/** The catalogue never changes. Fetched once and kept. */
export function useErpCatalogue() {
  return useQuery({
    queryKey: ['erp-catalogue'],
    queryFn: fetchErpCatalogue,
    staleTime: Infinity,
    retry: false,
  })
}

export function useErpReference() {
  return useQuery({
    queryKey: ['erp-reference'],
    queryFn: fetchErpReference,
    staleTime: 300_000,
    retry: false,
  })
}

export function useErpChecklists(enabled = true) {
  return useQuery({
    queryKey: ['erp-checklists'],
    queryFn: fetchErpChecklists,
    enabled,
    retry: false,
  })
}

export function useErpTemplates(enabled = true) {
  return useQuery({
    queryKey: ['erp-templates'],
    queryFn: fetchErpTemplates,
    enabled,
    retry: false,
  })
}

/**
 * The severity assessment.
 *
 * A query, keyed on the event and the answers, even though it is sent as a
 * POST. As a mutation it raced itself: tapping through the questionnaire fires
 * several assessments at once and the verdict shown was whichever reply landed
 * last, not the one for the answers on screen. Keyed, each set of answers has
 * exactly one verdict, and going back to a previous answer is instant.
 */
export function useAssessment(eventCode, answers) {
  return useQuery({
    queryKey: ['erp-assessment', eventCode, answers],
    queryFn: () => assessSituation({ eventCode, answers }),
    placeholderData: (previous) => previous,
    retry: false,
  })
}

function useConsoleMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      // The command answered with the whole console: seat it directly rather
      // than asking for it again, so the screen never shows the old figure.
      if (data && typeof data.armed === 'boolean') {
        queryClient.setQueryData(['erp-console'], data)
      } else {
        queryClient.invalidateQueries({ queryKey: ['erp-console'] })
      }
      queryClient.invalidateQueries({ queryKey: ['erp-checklists'] })
      queryClient.invalidateQueries({ queryKey: ['erp-templates'] })
    },
  })
}

export function useErpCheck() {
  return useConsoleMutation(setErpCheck)
}

export function useErpNotify() {
  return useConsoleMutation(recordErpNotification)
}

export function useErpLevelChange() {
  return useConsoleMutation(changeErpLevel)
}

export function useErpSitrep() {
  return useConsoleMutation(postErpSitrep)
}

export function useErpSubject() {
  return useConsoleMutation(updateErpSubject)
}

export function useErpLog() {
  return useConsoleMutation(addErpLogEntry)
}

export function useErpActivate() {
  return useConsoleMutation(activateErp)
}

export function useErpStandDown() {
  return useConsoleMutation(({ activationId, ...command }) => standDownErp(activationId, command))
}
