/**
 * Everything an OCC reads is UTC.
 *
 * The audited prototype stored decimal hours with no date and mixed local and
 * UTC on the same screen; times here are ISO instants from the API and are
 * always rendered as HH:MM UTC.
 */

const PLACEHOLDER = '—'

export function hhmm(iso) {
  if (!iso) return PLACEHOLDER
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return PLACEHOLDER
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// Abbreviations as the approved mock-up shows them ("09 Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

export function dayMonth(iso) {
  if (!iso) return PLACEHOLDER
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return PLACEHOLDER
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`
}

export function isoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Minutes as HH:MM, the way flight and duty time are written in an ops room.
 * 505 minutes is "08:25", never "8.4 h" — the audited prototype stored decimal
 * hours and that is exactly how it lost the sense of a duty period.
 */
export function minutesToHhmm(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return PLACEHOLDER
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  return `${String(hours).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** ISO date (yyyy-mm-dd) as "09 Sept 2026", for expiry columns. */
export function dayMonthYear(iso) {
  if (!iso) return PLACEHOLDER
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return PLACEHOLDER
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Whole days from today to an ISO date; negative once the date has passed. */
export function daysUntil(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((midnight - today) / 86_400_000)
}

/** "Ready" reads better than "READY" in a badge; the API stays in enums. */
export function titleCase(value) {
  if (!value) return ''
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ')
}

export const EMPTY = PLACEHOLDER
