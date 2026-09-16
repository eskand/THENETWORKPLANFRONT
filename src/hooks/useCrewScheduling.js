import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignSeat, fetchSchedulingBoard, unassignSeat } from '../api/crewScheduling'

/**
 * Scheduling is a live picture — two planners work on the same day — so it
 * polls like the dispatch board rather than sitting on a stale cache.
 */
export function useSchedulingBoard(filters) {
  return useQuery({
    queryKey: ['scheduling-board', filters],
    queryFn: () => fetchSchedulingBoard(filters),
    // Sans filtre, il n'y a rien a demander : l'editeur de roster n'ouvre le
    // programme du jour que lorsqu'il compose un vol.
    enabled: Boolean(filters),
    refetchInterval: 45_000,
    staleTime: 20_000,
    placeholderData: (previous) => previous,
  })
}

function useSchedulingMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-board'] })
      // A seat taken changes the dispatch board too: it carries the crew column.
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
    },
  })
}

export function useAssignSeat() {
  return useSchedulingMutation(assignSeat)
}

export function useUnassignSeat() {
  return useSchedulingMutation(unassignSeat)
}

/**
 * La semaine entiere — sept journees du meme endpoint que la vue du jour.
 *
 * Il n'existe pas d'endpoint « semaine » : les sept requetes partent en
 * parallele, portent chacune leur cle de cache et partagent celle de la vue du
 * jour, si bien qu'ouvrir un jour deja vu dans la semaine ne redemande rien.
 *
 * Le hook rend la matiere brute — les sept plateaux, une ligne par personne
 * vue, et l'index personne/jour des etapes affectees. Les compteurs et les
 * filtres se calculent au-dessus : c'est l'ecran qui decide ce qu'il montre,
 * pas le hook.
 */
export function useSchedulingWeek(days, role) {
  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: ['scheduling-board', { date: day, role }],
      queryFn: () => fetchSchedulingBoard({ date: day, role }),
      staleTime: 20_000,
      placeholderData: (previous) => previous,
    })),
  })

  const stamp = queries.map((query) => query.dataUpdatedAt).join('|')
  const key = days.join('|')

  return useMemo(() => {
    const boards = queries.map((query) => query.data)

    // Une personne par ligne, qu'elle tienne un siege ou qu'elle soit au
    // vivier : la semaine d'un equipage au repos est une information, et une
    // grille qui ne montre que les gens affectes ne dit pas qui est disponible.
    const people = new Map()
    const remember = (person) => {
      if (!people.has(person.personId)) {
        people.set(person.personId, {
          personId: person.personId,
          staffNo: person.staffNo,
          fullName: person.fullName,
          mainRole: person.mainRole,
          baseIcao: person.baseIcao ?? null,
          typeRatings: person.typeRatings ?? [],
        })
      } else if (person.baseIcao || person.typeRatings) {
        // La fiche du vivier est plus riche que la ligne d'un siege : elle
        // porte la base et les qualifications, dont les filtres ont besoin.
        const known = people.get(person.personId)
        known.baseIcao = known.baseIcao ?? person.baseIcao ?? null
        if (!known.typeRatings.length) known.typeRatings = person.typeRatings ?? []
      }
    }

    for (const board of boards) {
      for (const candidate of board?.pool ?? []) remember(candidate)
      for (const leg of board?.legs ?? []) {
        for (const member of leg.crew ?? []) remember(member)
      }
    }

    /** personId -> jour -> [{ leg, member }] */
    const duties = new Map()
    days.forEach((day, position) => {
      for (const leg of boards[position]?.legs ?? []) {
        for (const member of leg.crew ?? []) {
          const perPerson = duties.get(member.personId) ?? new Map()
          perPerson.set(day, [...(perPerson.get(day) ?? []), { leg, member }])
          duties.set(member.personId, perPerson)
        }
      }
    })

    return {
      boards,
      people: [...people.values()],
      duties,
      loading: queries.some((query) => query.isLoading),
      error: queries.find((query) => query.isError)?.error ?? null,
    }
    // `queries` est recree a chaque rendu ; la dependance utile est le contenu,
    // represente par l'horodatage de chaque reponse et par les dates demandees.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, key])
}
