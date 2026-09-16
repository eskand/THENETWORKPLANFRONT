import { TriangleAlert } from 'lucide-react'

const TONE_CLASS = {
  READY: 'badge--ready',
  PENDING: 'badge--pending',
  ATTENTION: 'badge--attention',
  INFO: 'badge--info',
  NEUTRAL: 'badge--neutral',
  CRITICAL: 'badge--critical',
  MEDIUM: 'badge--medium',
}

export default function Badge({ tone = 'NEUTRAL', children, warn = false, title }) {
  const className = `badge ${TONE_CLASS[tone] ?? TONE_CLASS.NEUTRAL}`
  return (
    <span className={className} title={title}>
      {children}
      {warn ? <TriangleAlert size={11} strokeWidth={2.2} /> : null}
    </span>
  )
}
