import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createServiceRequest,
  fetchAirportDetail,
  fetchAirports,
  fetchFollowingBoard,
  fetchSuppliers,
  fetchLeg,
  fetchTimeline,
  fetchTrack,
  fetchLiveTraffic,
  fetchTripSupportBoard,
  recordMovement,
  fetchDelayCodes,
  sendMvt,
} from '../api/operations'

/** The timeline is an operational picture: it polls, like the dispatch board. */
export function useTimeline(filters) {
  return useQuery({
    queryKey: ['timeline', filters],
    queryFn: () => fetchTimeline(filters),
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })
}

/**
 * Flight following polls hardest — thirty seconds — because that is the screen
 * where an old position is a real problem. The board itself carries the age of
 * each position, so a stale dot is visible even between two refreshes.
 */
/**
 * Le tableau de Flight Watch.
 *
 * `refetchInterval` est passe par l'ecran : les quatre boutons de la barre
 * reglent la frequence de lecture, et « HOLD » la coupe (false). C'est le
 * remplacement honnete des multiplicateurs de temps du prototype, qui
 * accelaraient une simulation ; sur des positions reellement recues, il n'y a
 * pas de temps a accelerer, seulement une cadence de lecture a choisir.
 */
export function useFollowingBoard(date, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['following-board', date],
    queryFn: () => fetchFollowingBoard(date),
    refetchInterval,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  })
}

export function useTrack(legId) {
  return useQuery({
    queryKey: ['following-track', legId],
    queryFn: () => fetchTrack(legId),
    enabled: Boolean(legId),
  })
}

export function useTripSupportBoard(date) {
  return useQuery({
    queryKey: ['tripsupport-board', date],
    queryFn: () => fetchTripSupportBoard(date),
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })
}

export function useSuppliers(station) {
  return useQuery({
    queryKey: ['suppliers', station],
    queryFn: () => fetchSuppliers(station),
    staleTime: 300_000,
  })
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ legId, command }) => createServiceRequest(legId, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripsupport-board'] })
      // The dispatch board carries the services column: it is stale too.
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
    },
  })
}

/** The directory is reference data: no polling, long stale time. */
/**
 * L'annuaire des aerodromes.
 *
 * <b>Rien ne part tant qu'on n'a rien demande.</b> Un annuaire n'est pas une
 * liste qu'on lit : c'est une liste dans laquelle on cherche. Le prototype
 * ouvre sur un ecran vide — « Search or pick a region to get started » — et il
 * a raison : nos vingt-six aerodromes deviendront les 9 583 de l'annexe, et
 * personne ne parcourt neuf mille lignes.
 */
export function useAirports(filters, enabled = true) {
  return useQuery({
    queryKey: ['airports', filters],
    queryFn: () => fetchAirports(filters),
    enabled,
    staleTime: 300_000,
    placeholderData: (previous) => previous,
  })
}

export function useAirportDetail(icao) {
  return useQuery({
    queryKey: ['airport-detail', icao],
    queryFn: () => fetchAirportDetail(icao),
    enabled: Boolean(icao),
  })
}

/**
 * Le trafic ADS-B vivant.
 *
 * Meme cadence que le tableau : la lecture cote serveur est protegee par sa
 * propre fenetre de rafraichissement, donc demander plus souvent ne
 * consomme pas plus de quota — cela renvoie simplement le dernier etat lu.
 */
export function useLiveTraffic(enabled, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['adsb-traffic'],
    queryFn: () => fetchLiveTraffic(1200),
    enabled,
    refetchInterval: enabled ? refetchInterval : false,
    placeholderData: (previous) => previous,
  })
}

/** Une etape, pour l'etiquette de vol. */
export function useLeg(legId) {
  return useQuery({
    queryKey: ['leg', legId],
    queryFn: () => fetchLeg(legId),
    enabled: Boolean(legId),
  })
}


/**
 * Envoyer le MVT.
 *
 * Le bouton du prototype n'envoyait rien ; celui-ci appelle
 * POST /v1/legs/{id}/mvt, qui horodate l'envoi sur l'etape. Les ecrans qui
 * lisent l'etape sont donc rafraichis derriere.
 */
/**
 * Les codes de retard du tenant, pour la cause demandee a la saisie de l'ATD.
 * Une liste de reference : pas de rafraichissement, longue duree de vie.
 */
export function useDelayCodes(enabled = true) {
  return useQuery({
    queryKey: ['delay-codes'],
    queryFn: fetchDelayCodes,
    enabled,
    staleTime: 3_600_000,
  })
}

export function useSendMvt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendMvt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leg'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
    },
  })
}

/**
 * Enregistrer une heure reelle (ATD / ATA).
 *
 * <p>Le prototype gardait l'heure dans son objet en memoire ; ici elle part
 * dans {@code ops.leg_movements}, et les ecrans qui lisent l'etape — tableau
 * de dispatch, timeline, suivi de vol — sont rafraichis derriere. Une heure
 * reelle change le retard, la disponibilite de l'avion et le temps de service
 * de l'equipage : la garder dans un seul ecran serait la perdre.
 */
export function useRecordMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ legId, kind, at, delay }) => recordMovement(legId, kind, at, delay),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leg'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
    },
  })
}
