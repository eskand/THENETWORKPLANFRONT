import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addLegPassenger,
  deleteLegDocument,
  deleteLegPassenger,
  fetchFlightNote,
  fetchLegEvents,
  fetchOccTimeline,
  fetchLegFuel,
  fetchLegLvp,
  fetchStationLvp,
  fetchLegPassengers,
  fetchTripFolder,
  importLegPassengers,
  saveLegPassenger,
  saveFlightNote,
  saveTripRemark,
  setLegSlot,
  signRelease,
  uploadLegDocument,
} from '../api/flightfile'
import { closeLeg } from '../api/operations'

/**
 * Les lectures et ecritures des onglets PAX, FUEL et TRIP FOLDER.
 *
 * <p>Toute ecriture reinvalide l'onglet ET les controles de mise en ligne : un
 * passager sans document valide est un constat de l'onglet PAX et un constat du
 * verdict global, et les deux doivent bouger ensemble.
 */
function useLegMutation(mutationFn, legId, keys = []) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key, legId] }))
      queryClient.invalidateQueries({ queryKey: ['leg-readiness', legId] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-leg', legId] })
    },
  })
}

export function useLegPassengers(legId) {
  return useQuery({
    queryKey: ['leg-passengers', legId],
    queryFn: () => fetchLegPassengers(legId),
    enabled: Boolean(legId),
    staleTime: 10_000,
  })
}

export function useAddPassenger(legId) {
  return useLegMutation((command) => addLegPassenger(legId, command), legId, ['leg-passengers'])
}

export function useSavePassenger(legId) {
  return useLegMutation(
    ({ passengerId, ...command }) => saveLegPassenger(passengerId, command),
    legId, ['leg-passengers'],
  )
}

export function useDeletePassenger(legId) {
  return useLegMutation((passengerId) => deleteLegPassenger(passengerId), legId, ['leg-passengers'])
}

export function useImportPassengers(legId) {
  return useLegMutation((file) => importLegPassengers(legId, file), legId, ['leg-passengers'])
}

export function useTripFolder(legId) {
  return useQuery({
    queryKey: ['trip-folder', legId],
    queryFn: () => fetchTripFolder(legId),
    enabled: Boolean(legId),
    staleTime: 10_000,
  })
}

export function useSaveTripRemark(legId) {
  return useLegMutation((remark) => saveTripRemark(legId, remark), legId, ['trip-folder'])
}

export function useUploadDocument(legId) {
  return useLegMutation(({ kind, file }) => uploadLegDocument(legId, kind, file), legId, ['trip-folder'])
}

export function useDeleteDocument(legId) {
  return useLegMutation((documentId) => deleteLegDocument(documentId), legId, ['trip-folder'])
}

export function useCloseLeg(legId) {
  return useLegMutation(() => closeLeg(legId), legId, ['trip-folder'])
}

export function useLegFuel(legId) {
  return useQuery({
    queryKey: ['leg-fuel', legId],
    queryFn: () => fetchLegFuel(legId),
    enabled: Boolean(legId),
    staleTime: 60_000,
  })
}

/** Le journal de l'etape, pour la frise du menu. */
export function useLegEvents(legId, enabled = true) {
  return useQuery({
    queryKey: ['leg-events', legId],
    queryFn: () => fetchLegEvents(legId),
    enabled: Boolean(legId) && enabled,
    staleTime: 10_000,
  })
}

export function useFlightNote(legId, enabled = true) {
  return useQuery({
    queryKey: ['flight-note', legId],
    queryFn: () => fetchFlightNote(legId),
    enabled: Boolean(legId) && enabled,
    staleTime: 10_000,
  })
}

/** Ecrire la note invalide aussi le journal : elle y laisse un evenement. */
export function useSaveFlightNote(legId) {
  return useLegMutation((note) => saveFlightNote(legId, note), legId,
    ['flight-note', 'leg-events'])
}

/** Le verdict de faible visibilite de l'etape, pour le bandeau FLIGHT. */
export function useLegLvp(legId) {
  return useQuery({
    queryKey: ['leg-lvp', legId],
    queryFn: () => fetchLegLvp(legId),
    enabled: Boolean(legId),
    // La meteo bouge : le bandeau se rafraichit comme le METAR qui le porte.
    refetchInterval: 300_000,
    staleTime: 120_000,
  })
}

/**
 * Le verdict de faible visibilite du dossier, quel que soit ce qu'il porte.
 *
 * <p>Une etape est interrogee par son identifiant ; un appareil immobilise,
 * qui n'en a pas, par l'escale ou il se trouve. Les deux rendent la meme forme,
 * donc le bandeau et le panneau n'ont qu'un seul chemin de rendu.
 */
export function useFlightFileLvp({ legId, stations }) {
  const wanted = (stations ?? []).filter(Boolean)
  const byLeg = useQuery({
    queryKey: ['leg-lvp', legId],
    queryFn: () => fetchLegLvp(legId),
    enabled: Boolean(legId),
    refetchInterval: 300_000,
    staleTime: 120_000,
  })
  const byStation = useQuery({
    queryKey: ['station-lvp', wanted.join(',')],
    queryFn: () => fetchStationLvp(wanted),
    enabled: !legId && wanted.length > 0,
    refetchInterval: 300_000,
    staleTime: 120_000,
  })
  return legId ? byLeg : byStation
}

/**
 * La frise OCC Dispatch — dix etapes, statuts calcules par le serveur.
 *
 * <p>Elle se rafraichit toute seule toutes les trente secondes, comme chez
 * l'annexe (`setInterval` l. 14142) : les fenetres avancent et une etape passe
 * de « scheduled » a « in progress » sans que personne ne clique. Le serveur
 * rend l'instant du calcul, donc l'ecran n'a pas a faire confiance a l'horloge
 * du poste.
 */
export function useOccTimeline(legId, enabled = true) {
  return useQuery({
    queryKey: ['occ-timeline', legId],
    queryFn: () => fetchOccTimeline(legId),
    enabled: Boolean(legId) && enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * « Confirm release » — la signature de la mise en ligne.
 *
 * <p>Chez l'annexe le bouton posait un booleen ; ici il signe vraiment, et le
 * serveur refuse tant qu'un constat bloquant tient. Ce refus est le point : un
 * bouton qui ne peut pas echouer n'est pas une release.
 */
export function useSignRelease(legId) {
  return useLegMutation((command) => signRelease(legId, command), legId,
    ['occ-timeline', 'leg-events', 'leg-release'])
}

/** « Set CTOT / Slot ref » — le creneau ATC recu pour l'etape. */
export function useSetSlot(legId) {
  return useLegMutation((command) => setLegSlot(legId, command), legId,
    ['occ-timeline', 'leg-events'])
}
