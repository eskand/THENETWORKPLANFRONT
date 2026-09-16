/**
 * La marque VIGIL du prototype : un casque de pilote sur fond navy, visiere
 * cyan, dans une pastille a coins arrondis.
 *
 * Reprise trait pour trait de `iconSvg()` du prototype (TNP_DEMO_FINAL,
 * module VIGIL) plutot que remplacee par une icone d'oeil generique : la
 * marque est reconnaissable, c'est tout son interet.
 *
 * Les trois degrades portent un identifiant unique par instance — deux SVG
 * sur une meme page qui declarent `id="vglbg"` se volent leurs degrades.
 */
export default function VigilMark({ size = 26, id = 'vgl' }) {
  const bg = `${id}-bg`
  const helm = `${id}-helm`
  const visor = `${id}-visor`

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={bg} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#0b1c3f" />
          <stop offset="100%" stopColor="#040a18" />
        </radialGradient>
        <linearGradient id={helm} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f7fb" />
          <stop offset="55%" stopColor="#c7ceda" />
          <stop offset="100%" stopColor="#8e97a8" />
        </linearGradient>
        <linearGradient id={visor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1428" />
          <stop offset="100%" stopColor="#050b18" />
        </linearGradient>
      </defs>

      <rect
        x="1.5" y="1.5" width="61" height="61" rx="13"
        fill={`url(#${bg})`} stroke="#2f7dff" strokeOpacity="0.45" strokeWidth="1.4"
      />

      {/* le semis d'etoiles : ce qui fait lire le fond comme un ciel */}
      <g fill="#2f7dff" opacity="0.28">
        <circle cx="12" cy="24" r="1" />
        <circle cx="17" cy="20" r="1" />
        <circle cx="14" cy="30" r="1" />
        <circle cx="50" cy="22" r="1" />
        <circle cx="54" cy="28" r="1" />
        <circle cx="48" cy="31" r="1" />
        <circle cx="52" cy="17" r="1" />
        <circle cx="10" cy="17" r="1" />
      </g>
      <circle cx="32" cy="30" r="24" fill="none" stroke="#2f7dff" strokeOpacity="0.18" strokeWidth="1" />

      <path d="M18 52 q2 -8 8 -9 l12 0 q6 1 8 9 z" fill="#20293c" stroke="#39435c" strokeWidth="0.8" />
      <path d="M15 49 q-4 1 -4 5 l10 0 q0 -4 -2 -6 z" fill={`url(#${helm})`} />
      <path d="M49 49 q4 1 4 5 l-10 0 q0 -4 2 -6 z" fill={`url(#${helm})`} />
      <rect x="27" y="40" width="10" height="6" rx="2" fill="#1a2336" />
      <ellipse cx="32" cy="27" rx="15.5" ry="16.5" fill={`url(#${helm})`} stroke="#78829a" strokeWidth="0.8" />
      <ellipse cx="17.5" cy="28" rx="3.4" ry="5.4" fill="#aab2c2" stroke="#39c1ff" strokeOpacity="0.6" strokeWidth="0.7" />
      <ellipse cx="46.5" cy="28" rx="3.4" ry="5.4" fill="#aab2c2" stroke="#39c1ff" strokeOpacity="0.6" strokeWidth="0.7" />
      <path
        d="M20 26 a12.5 13.5 0 0 1 24 0 a12 14 0 0 1 -24 0 z"
        fill={`url(#${visor})`} stroke="#39c1ff" strokeOpacity="0.35" strokeWidth="0.7"
      />
      <path d="M24 29 q2.6 -2.6 5.2 0" stroke="#39c1ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M34.8 29 q2.6 -2.6 5.2 0" stroke="#39c1ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path
        d="M29.4 23.6 l2.6 3.4 l2.6 -3.4"
        stroke="#39c1ff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="26.5" y="14" width="11" height="2.4" rx="1.2" fill="#39c1ff" opacity="0.65" />
    </svg>
  )
}
