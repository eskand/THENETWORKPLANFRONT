import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteScenario,
  fetchAircraftReference,
  fetchScenarioGenerator,
  generateScenario,
  fetchFleetRegister,
  fetchReferenceSets,
  fetchReportCatalogue,
  fetchReportRuns,
  fetchSettings,
  fetchSettingsForm,
  importSettings,
  resetSettings,
  fetchSimulationBoard,
  runReport,
  runScenario,
  updateSetting,
} from '../api/platform'

export function useReportCatalogue() {
  return useQuery({
    queryKey: ['report-catalogue'],
    queryFn: fetchReportCatalogue,
    staleTime: 120_000,
  })
}

export function useReportRuns() {
  return useQuery({ queryKey: ['report-runs'], queryFn: fetchReportRuns, staleTime: 60_000 })
}

/**
 * Running a report is a mutation, not a query: it records an execution, and
 * the result carries the instant it was computed. Caching it would be caching
 * a figure with a date on it, which is how a stale number gets quoted.
 */
export function useRunReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-catalogue'] })
      queryClient.invalidateQueries({ queryKey: ['report-runs'] })
    },
  })
}

export function useSimulationBoard() {
  return useQuery({
    queryKey: ['simulation-board'],
    queryFn: fetchSimulationBoard,
    staleTime: 120_000,
  })
}

export function useRunScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scenarioId, remark }) => runScenario(scenarioId, remark),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation-board'] }),
  })
}

export function useReferenceSets() {
  return useQuery({
    queryKey: ['reference-sets'],
    queryFn: fetchReferenceSets,
    staleTime: 300_000,
  })
}

export function useSettings(category) {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => fetchSettings(category),
    staleTime: 300_000,
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ settingId, settingValue }) => updateSetting(settingId, settingValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings-form'] })
    },
  })
}

/**
 * The Settings screen.
 *
 * <p>No stale time: a value written on one desk has to be the value read on
 * the next, and the screen is asked for rarely enough that a fresh read costs
 * nothing. Every mutation below invalidates this one key, so the form is
 * always drawn from what the server holds and never from what the browser
 * hoped it wrote.
 */
export function useSettingsForm() {
  return useQuery({ queryKey: ['settings-form'], queryFn: fetchSettingsForm })
}

export function useResetSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (section) => resetSettings(section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-form'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useImportSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values) => importSettings(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-form'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useFleetRegister() {
  return useQuery({ queryKey: ['fleet-register'], queryFn: fetchFleetRegister, staleTime: 300_000 })
}

export function useAircraftReference(search) {
  return useQuery({
    queryKey: ['aircraft-reference', search],
    queryFn: () => fetchAircraftReference(search),
    staleTime: 600_000,
    placeholderData: (previous) => previous,
  })
}

export function useScenarioGenerator() {
  return useQuery({ queryKey: ['scenario-generator'], queryFn: fetchScenarioGenerator })
}

export function useGenerateScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateScenario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenario-generator'] }),
  })
}

export function useDeleteScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteScenario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenario-generator'] }),
  })
}
