import TopBar from '../components/TopBar'

/**
 * Les modules que l'audit a inventories mais que cette iteration n'implemente
 * pas.
 *
 * Le dire franchement est deliberé : le pire defaut du prototype etait de
 * montrer un ecran rempli de valeurs qui n'existaient pas. Une page vide et
 * honnete vaut mieux qu'une page convaincante.
 */
export default function ModulePlaceholder({ title, subtitle }) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <div className="shell__scroll">
        <main className="page">
          <div className="state">
            <h3>{title} is not implemented in this iteration</h3>
            <p>
              The agreed scope was the OCC dashboard and Dispatch end to end:
              schema, API, readiness engine and screens.
            </p>
            <p>
              This module has its schema reserved in PostgreSQL and its
              endpoints specified in the architecture annexe.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
