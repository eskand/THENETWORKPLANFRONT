import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeCampaign,
  activateErp,
  assessFeasibility,
  assessRisk,
  closeOccurrence,
  decideQuote,
  fetchErpBoard,
  fetchPromotionBoard,
  deleteReportDraft,
  fetchReportingBoard,
  answerSafetyQuery,
  askSafetyQuery,
  fetchHazardRegister,
  fetchRexLibrary,
  fetchSafetyNotifications,
  fetchSafetyQueries,
  markAllNotificationsRead,
  markNotificationRead,
  markRexRead,
  recordHazardReview,
  fetchSafetyBoard,
  saveReportDraft,
  submitSafetyReport,
  fetchSafetyOverview,
  runSafetyScan,
  fetchSafetyReports,
  fetchSalesBoard,
  fetchSalesRequest,
  fileWithAuthority,
  standDownErp,
} from '../api/commercial'

export function useSalesBoard(status) {
  return useQuery({
    queryKey: ['sales-board', status],
    queryFn: () => fetchSalesBoard(status),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useSalesRequest(requestId) {
  return useQuery({
    queryKey: ['sales-request', requestId],
    queryFn: () => fetchSalesRequest(requestId),
    enabled: Boolean(requestId),
  })
}

export function useSafetyBoard(filters) {
  return useQuery({
    queryKey: ['safety-board', filters],
    queryFn: () => fetchSafetyBoard(filters),
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  })
}

export function useSafetyReports(windowDays = 365) {
  return useQuery({
    queryKey: ['safety-reports', windowDays],
    queryFn: () => fetchSafetyReports(windowDays),
    staleTime: 120_000,
  })
}

export function usePromotionBoard() {
  return useQuery({
    queryKey: ['promotion-board'],
    queryFn: fetchPromotionBoard,
    staleTime: 300_000,
  })
}

/**
 * The ERP board polls slowly but does poll: an activation opened by another
 * user is the one thing on this screen that cannot wait for a refresh.
 */
export function useErpBoard() {
  return useQuery({
    queryKey: ['erp-board'],
    queryFn: fetchErpBoard,
    refetchInterval: 60_000,
    retry: false,
  })
}

function useCommercialMutation(mutationFn, keys) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  })
}

export function useAssessFeasibility() {
  return useCommercialMutation(
    ({ requestId, command }) => assessFeasibility(requestId, command),
    ['sales-board', 'sales-request'],
  )
}

export function useDecideQuote() {
  return useCommercialMutation(
    ({ quoteId, command }) => decideQuote(quoteId, command),
    ['sales-board', 'sales-request'],
  )
}

export function useAssessRisk() {
  return useCommercialMutation(
    ({ occurrenceId, command }) => assessRisk(occurrenceId, command),
    ['safety-board', 'safety-reports'],
  )
}

export function useCloseOccurrence() {
  return useCommercialMutation(
    ({ occurrenceId, conclusion }) => closeOccurrence(occurrenceId, conclusion),
    ['safety-board', 'safety-reports'],
  )
}

export function useFileWithAuthority() {
  return useCommercialMutation(
    ({ occurrenceId, command }) => fileWithAuthority(occurrenceId, command),
    ['safety-reports', 'safety-board'],
  )
}

export function useActivateErp() {
  return useCommercialMutation(activateErp, ['erp-board'])
}

export function useStandDownErp() {
  return useCommercialMutation(
    ({ activationId, outcome }) => standDownErp(activationId, outcome),
    ['erp-board'],
  )
}

/**
 * The Safety Manager dashboard.
 *
 * <p>Sixty seconds of stale time: the scan reads six modules, and a dashboard
 * that re-runs it on every focus change would cost more than it tells.
 */
export function useSafetyOverview() {
  return useQuery({ queryKey: ['safety-overview'], queryFn: fetchSafetyOverview, staleTime: 60_000 })
}

export function useRunSafetyScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runSafetyScan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-overview'] }),
  })
}

/**
 * Safety Reports.
 *
 * <p>No stale time: a reporter who has just sent something must see it in
 * their own list straight away, and the board is small.
 */
export function useReportingBoard(reporterId) {
  return useQuery({
    queryKey: ['reporting-board', reporterId],
    queryFn: () => fetchReportingBoard(reporterId),
    enabled: Boolean(reporterId),
  })
}

export function useSaveReportDraft(reporterId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (command) => saveReportDraft(reporterId, command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reporting-board'] }),
  })
}

export function useDeleteReportDraft(reporterId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftId) => deleteReportDraft(reporterId, draftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reporting-board'] }),
  })
}

export function useSubmitSafetyReport(reporterId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (command) => submitSafetyReport(reporterId, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reporting-board'] })
      // The Safety Manager's screens now have one more occurrence to show.
      queryClient.invalidateQueries({ queryKey: ['safety-board'] })
      queryClient.invalidateQueries({ queryKey: ['safety-overview'] })
    },
  })
}

/**
 * L'accusé de lecture.
 *
 * <p>C'est le seul geste possible sur Safety Promotion, et c'est lui qui
 * alimente le « 9 / 24 read » : un compte de personnes qui ont cliqué, pas un
 * chiffre déclaré.
 */
export function useAcknowledgeCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, personId }) => acknowledgeCampaign(campaignId, personId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotion-board'] }),
  })
}

/* ── Safety: register, REX, queries, notifications ─────────────────────── */

export function useHazardRegister() {
  return useQuery({
    queryKey: ['hazard-register'],
    queryFn: fetchHazardRegister,
    staleTime: 60_000,
  })
}

export function useHazardReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordHazardReview,
    onSuccess: (data) => queryClient.setQueryData(['hazard-register'], data),
  })
}

export function useRexLibrary(reader) {
  return useQuery({
    queryKey: ['rex-library', reader ?? ''],
    queryFn: () => fetchRexLibrary(reader),
    staleTime: 60_000,
  })
}

export function useMarkRexRead(reader) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markRexRead,
    onSuccess: (data) => queryClient.setQueryData(['rex-library', reader ?? ''], data),
  })
}

export function useSafetyQueries(filters) {
  return useQuery({
    queryKey: ['safety-queries', filters],
    queryFn: () => fetchSafetyQueries(filters),
    staleTime: 30_000,
  })
}

function useQueryMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-queries'] })
      queryClient.invalidateQueries({ queryKey: ['reporting-board'] })
      queryClient.invalidateQueries({ queryKey: ['safety-notifications'] })
    },
  })
}

export function useAskSafetyQuery() {
  return useQueryMutation(askSafetyQuery)
}

export function useAnswerSafetyQuery() {
  return useQueryMutation(answerSafetyQuery)
}

export function useSafetyNotifications() {
  return useQuery({
    queryKey: ['safety-notifications'],
    queryFn: fetchSafetyNotifications,
    refetchInterval: 120_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (data) => queryClient.setQueryData(['safety-notifications'], data),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (data) => queryClient.setQueryData(['safety-notifications'], data),
  })
}
