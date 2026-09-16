import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeMelItem,
  complyDirective,
  completeTask,
  fetchAircraftCamo,
  fetchCamoFleet,
  fetchDefects,
  fetchDirectives,
  fetchDueList,
  fetchLifeLimitedParts,
  fetchMelItems,
  fetchMelLibrary,
  fetchProgramme,
  fetchCamoAdminBoard,
  fetchCamoAuditTrail,
  fetchCamoComponents,
  fetchCamoDocuments,
  fetchCamoUsers,
  fetchTechLogBoard,
  fetchTechLogPages,
  fetchWorkOrders,
  resolveDefect,
  signTechLogPage,
} from '../api/maintenance'

/**
 * Maintenance data changes when an engineer writes something, not on a clock,
 * so nothing here polls. The one exception would be the fleet status if it
 * were shown in the OCC — it is not: the OCC reads the dispatch board, which
 * already carries AOG.
 */
export function useCamoFleet() {
  return useQuery({ queryKey: ['camo-fleet'], queryFn: fetchCamoFleet, staleTime: 60_000 })
}

export function useDueList(horizonDays = 90) {
  return useQuery({
    queryKey: ['camo-due-list', horizonDays],
    queryFn: () => fetchDueList(horizonDays),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useLifeLimitedParts() {
  return useQuery({ queryKey: ['camo-llp'], queryFn: fetchLifeLimitedParts, staleTime: 60_000 })
}

export function useWorkOrders() {
  return useQuery({ queryKey: ['camo-work-orders'], queryFn: fetchWorkOrders, staleTime: 60_000 })
}

export function useAircraftCamo(aircraftId) {
  return useQuery({
    queryKey: ['camo-aircraft', aircraftId],
    queryFn: () => fetchAircraftCamo(aircraftId),
    enabled: Boolean(aircraftId),
  })
}

export function useProgramme(icaoType) {
  return useQuery({
    queryKey: ['camo-programme', icaoType],
    queryFn: () => fetchProgramme(icaoType),
    staleTime: 300_000,
  })
}

export function useDirectives(outstandingOnly = false) {
  return useQuery({
    queryKey: ['camo-directives', outstandingOnly],
    queryFn: () => fetchDirectives(outstandingOnly),
    staleTime: 120_000,
  })
}

export function useTechLogPages(filters) {
  return useQuery({
    queryKey: ['techlog-pages', filters],
    queryFn: () => fetchTechLogPages(filters),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useTechLogBoard() {
  return useQuery({ queryKey: ['techlog-board'], queryFn: fetchTechLogBoard, refetchInterval: 60_000 })
}

export function useDefects(filters) {
  return useQuery({
    queryKey: ['techlog-defects', filters],
    queryFn: () => fetchDefects(filters),
    staleTime: 60_000,
  })
}

export function useMelItems() {
  return useQuery({ queryKey: ['mel-items'], queryFn: fetchMelItems, staleTime: 60_000 })
}

export function useMelLibrary(filters) {
  return useQuery({
    queryKey: ['mel-library', filters],
    queryFn: () => fetchMelLibrary(filters),
    staleTime: 600_000,
  })
}

/**
 * Every maintenance write can move a counter, a due date or a dispatch
 * limitation, so they all invalidate the same family of queries — including
 * the dispatch board, which carries the MEL and AOG columns.
 */
function useMaintenanceMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      ;['camo-fleet', 'camo-due-list', 'camo-aircraft', 'camo-directives',
        'techlog-pages', 'techlog-defects', 'mel-items', 'dispatch-board'].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      )
    },
  })
}

export function useSignTechLogPage() {
  return useMaintenanceMutation(signTechLogPage)
}

export function useCompleteTask() {
  return useMaintenanceMutation(({ taskId, command }) => completeTask(taskId, command))
}

export function useResolveDefect() {
  return useMaintenanceMutation(({ defectId, command }) => resolveDefect(defectId, command))
}

export function useCloseMelItem() {
  return useMaintenanceMutation(({ itemId, correctiveAction }) => closeMelItem(itemId, correctiveAction))
}

export function useComplyDirective() {
  return useMaintenanceMutation(({ applicationId, command }) => complyDirective(applicationId, command))
}

/* ── CAMO Administration ───────────────────────────────────────────────── */

export function useCamoAdminBoard() {
  return useQuery({
    queryKey: ['camo-admin-board'],
    queryFn: fetchCamoAdminBoard,
    refetchInterval: 120_000,
    retry: false,
  })
}

/** The component register. `category` null returns all four screens' worth. */
export function useCamoAdminComponents(category) {
  return useQuery({
    queryKey: ['camo-components', category],
    queryFn: () => fetchCamoComponents(category),
    staleTime: 60_000,
  })
}

export function useCamoAdminDocuments(category) {
  return useQuery({
    queryKey: ['camo-documents', category],
    queryFn: () => fetchCamoDocuments(category),
    staleTime: 60_000,
  })
}

export function useUsers() {
  return useQuery({ queryKey: ['camo-users'], queryFn: fetchCamoUsers, staleTime: 300_000 })
}

export function useCamoAuditTrail(limit = 200) {
  return useQuery({
    queryKey: ['camo-audit', limit],
    queryFn: () => fetchCamoAuditTrail(limit),
    staleTime: 30_000,
  })
}
