import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelLeg, changeLegAircraft, fetchOptimizerSetup, moveLeg, runOptimization,
} from '../api/optimizer'

export function useOptimizerSetup(enabled) {
  return useQuery({
    queryKey: ['optimizer-setup'],
    queryFn: fetchOptimizerSetup,
    enabled,
    staleTime: 60_000,
  })
}

export function useRunOptimization() {
  return useMutation({ mutationFn: runOptimization })
}

/**
 * Appliquer une instruction — `Applier.applyOp()` de l'annexe (l. 93870), par
 * les routes de l'etape. Chaque geste laisse son motif dans le journal de
 * l'etape ; la timeline et le tableau de dispatch sont relus ensuite.
 */
export function useApplyOperation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ op, reverse = false }) => {
      const reason = (reverse ? 'Optimizer revert — ' : 'Optimizer — ') + op.title
      switch (op.op) {
        case 'MOVE_LEG':
          return changeLegAircraft(op.legId, reverse ? op.fromReg : op.toReg, reason)
        case 'RETIME_LEG':
          return moveLeg(op.legId, reverse ? op.oldStd : op.newStd, reverse ? op.oldSta : op.newSta, reason)
        case 'CANCEL_LEG':
          if (reverse) throw new Error('A cancelled leg cannot be restored from here — re-create it in Sales')
          return cancelLeg(op.legId, reason)
        default:
          throw new Error(`${op.op} is a manual step — it is done in another module`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] })
      queryClient.invalidateQueries({ queryKey: ['occ-timeline'] })
    },
  })
}
