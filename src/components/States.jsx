import { TriangleAlert } from 'lucide-react'

export function LoadingState({ label = 'Loading the operating picture…' }) {
  return (
    <div className="state">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

/**
 * A failed board is almost always the API not running or the database not
 * migrated, so the message says what to check rather than "something went
 * wrong".
 */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="state">
      <TriangleAlert size={22} color="var(--attention-fg)" />
      <h3>The dispatch board could not be loaded</h3>
      <p>{error?.message}</p>
      <p>
        Check that the API is up on <code>http://localhost:8080</code> and that Flyway has run.
      </p>
      {onRetry ? (
        <button type="button" className="toolbar__button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ label }) {
  return (
    <div className="state">
      <h3>Nothing to show</h3>
      <p>{label}</p>
    </div>
  )
}
