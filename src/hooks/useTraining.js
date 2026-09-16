import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enrolOnSession,
  fetchPersonTraining,
  fetchTrainingCompliance,
  fetchTrainingCourses,
  fetchTrainingSessions,
} from '../api/training'

/** The matrix is a report, not a live picture: it is refetched, not polled. */
export function useTrainingCompliance() {
  return useQuery({
    queryKey: ['training-compliance'],
    queryFn: fetchTrainingCompliance,
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  })
}

export function useTrainingSessions(range) {
  return useQuery({
    queryKey: ['training-sessions', range],
    queryFn: () => fetchTrainingSessions(range),
    staleTime: 120_000,
  })
}

export function useTrainingCourses() {
  return useQuery({
    queryKey: ['training-courses'],
    queryFn: fetchTrainingCourses,
    staleTime: 600_000,
  })
}

export function usePersonTraining(personId) {
  return useQuery({
    queryKey: ['training-person', personId],
    queryFn: () => fetchPersonTraining(personId),
    enabled: Boolean(personId),
  })
}

export function useEnrolOnSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, personId }) => enrolOnSession(sessionId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['training-compliance'] })
    },
  })
}
