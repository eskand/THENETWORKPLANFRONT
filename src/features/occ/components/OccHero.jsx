import { useEffect, useState } from 'react'

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC',
]
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function stamp(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return {
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
    date: `${DAYS[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
  }
}

/**
 * L'horloge est en UTC et bat a la seconde : un OCC laisse cet ecran ouvert
 * en permanence et lit l'heure ici, pas dans la barre des taches.
 */
export default function OccHero({ activeFlights, tailsAirborne }) {
  const [now, setNow] = useState(() => stamp(new Date()))

  useEffect(() => {
    const timer = setInterval(() => setNow(stamp(new Date())), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="dash-hero">
      <div className="dash-hero-left">
        <div className="dash-hero-live">
          <span className="pulse" />
          Live · Operations Control Center
        </div>
        <h2 className="dash-hero-title">
          The Network Plan Airlines — Global Fleet Watch
        </h2>
        <p className="dash-hero-sub">
          Real-time network overview · all fleets · UTC timezone
        </p>
      </div>

      <div className="dash-hero-right">
        <div className="dash-hero-stat">
          <div className="n">{activeFlights ?? '—'}</div>
          <div className="t">Active flights</div>
        </div>
        <div className="dash-hero-divider" />
        <div className="dash-hero-stat">
          <div className="n">{tailsAirborne}</div>
          <div className="t">Tails airborne</div>
        </div>
        <div className="dash-hero-divider" />
        <div className="dash-hero-clock">
          <div className="time">{now.time} UTC</div>
          <div className="date">{now.date}</div>
        </div>
      </div>
    </section>
  )
}
