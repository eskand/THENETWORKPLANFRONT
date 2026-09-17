import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLegPermitRequest,
  createLegServiceRequest,
  deletePermitRequest,
  deleteServiceRequest,
  fetchLegPermits,
  fetchLegServices,
  updatePermitRequest,
  updatePermitRequestDetails,
  updateServiceRequest,
  updateServiceRequestDetails,
} from '../api/tripsupport'

/**
 * Les deux lectures et les six ecritures des onglets SERVICES et OVF PERMIT.
 *
 * <p>Chaque ecriture invalide trois choses : la liste de l'onglet, la ligne du
 * tableau de dispatch (sa colonne SERVICES compte les memes demandes) et les
 * controles de mise en ligne. Corriger le cache a la main ferait afficher au
 * dossier un decompte que le serveur ne confirme pas.
 */
function useTripSupportMutation(mutationFn, legId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leg-services', legId] })
      queryClient.invalidateQueries({ queryKey: ['leg-permits', legId] })
      queryClient.invalidateQueries({ queryKey: ['leg-readiness', legId] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
      queryClient.invalidateQueries({ queryKey: ['tripsupport-board'] })
    },
  })
}

export function useLegServices(legId) {
  return useQuery({
    queryKey: ['leg-services', legId],
    queryFn: () => fetchLegServices(legId),
    enabled: Boolean(legId),
    staleTime: 10_000,
  })
}

export function useLegPermits(legId) {
  return useQuery({
    queryKey: ['leg-permits', legId],
    queryFn: () => fetchLegPermits(legId),
    enabled: Boolean(legId),
    staleTime: 10_000,
  })
}

export function useCreateLegService(legId) {
  return useTripSupportMutation((command) => createLegServiceRequest(legId, command), legId)
}

export function useUpdateServiceRequest(legId) {
  return useTripSupportMutation(
    ({ requestId, ...command }) => updateServiceRequest(requestId, command),
    legId,
  )
}

export function useUpdateServiceDetails(legId) {
  return useTripSupportMutation(
    ({ requestId, ...command }) => updateServiceRequestDetails(requestId, command),
    legId,
  )
}

export function useDeleteServiceRequest(legId) {
  return useTripSupportMutation((requestId) => deleteServiceRequest(requestId), legId)
}

export function useCreateLegPermit(legId) {
  return useTripSupportMutation((command) => createLegPermitRequest(legId, command), legId)
}

export function useUpdatePermitRequest(legId) {
  return useTripSupportMutation(
    ({ requestId, ...command }) => updatePermitRequest(requestId, command),
    legId,
  )
}

export function useUpdatePermitDetails(legId) {
  return useTripSupportMutation(
    ({ requestId, ...command }) => updatePermitRequestDetails(requestId, command),
    legId,
  )
}

export function useDeletePermitRequest(legId) {
  return useTripSupportMutation((requestId) => deletePermitRequest(requestId), legId)
}
