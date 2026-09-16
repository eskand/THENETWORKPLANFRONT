import { NavLink } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Database,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Megaphone,
  Plane,
  Radio,
  Settings2,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Users,
  Wrench,
} from 'lucide-react'
import crest from '../assets/occ/crest.png'

/**
 * Navigation de la suite operationnelle.
 *
 * L'ordre, les intitules et le decoupage en sections sont ceux du prototype
 * approuve : le menu est le vrai menu de l'application, pas une maquette
 * reduite. Seuls l'OCC Dashboard et le Dispatch sont implementes dans cette
 * iteration ; les autres entrees ouvrent une page qui le dit clairement.
 */
const SECTIONS = [
  {
    title: 'Operations',
    items: [
      { to: '/flight-timeline', label: 'Flight Timeline', icon: CalendarDays },
      { to: '/dispatch', label: 'Dispatch', icon: Plane },
      { to: '/flight-following', label: 'Flight Following', icon: Radio },
      { to: '/netplus-services', label: 'NetPlus Services', icon: LayoutGrid },
      { to: '/airports', label: 'Airports Data', icon: MapPin },
    ],
  },
  {
    title: 'Crew',
    items: [
      { to: '/crew-scheduling', label: 'Crew Scheduling', icon: CalendarDays },
      { to: '/roster', label: 'Roster', icon: BookOpen },
      { to: '/crew-management', label: 'Crew Management', icon: Users },
      { to: '/training', label: 'Training', icon: GraduationCap },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { to: '/camo', label: 'CAMO', icon: Wrench },
      { to: '/camo-admin', label: 'CAMO Admin', icon: Settings2 },
      { to: '/tech-log', label: 'Tech Log', icon: FileText },
      { to: '/mel', label: 'MEL / CDL / HIL', icon: TriangleAlert },
    ],
  },
  {
    title: 'Sales',
    items: [{ to: '/sales', label: 'Sales & CRM', icon: BadgeCheck }],
  },
  {
    title: 'Safety Management System',
    items: [
      { to: '/safety-manager', label: 'Safety Manager', icon: ShieldCheck },
      { to: '/safety-reports', label: 'Safety Reports', icon: FileBarChart },
      { to: '/safety-promotion', label: 'Safety Promotion', icon: Megaphone, badge: 4 },
      { to: '/erp', label: 'ERP', icon: Siren },
    ],
  },
  {
    title: 'Reporting',
    items: [{ to: '/reports', label: 'Reports', icon: FileBarChart }],
  },
  {
    title: 'Simulation',
    items: [{ to: '/simulation', label: 'Simulation Center', icon: Activity }],
  },
  {
    title: 'Database',
    items: [{ to: '/database', label: 'Database', icon: Database }],
  },
]

const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')

function NavRow({ to, label, icon: Icon, badge }) {
  return (
    <NavLink to={to} className={navClass}>
      <Icon size={15} strokeWidth={1.8} />
      {label}
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img src={crest} alt="The Network Plan" />
        </div>
        <div className="brand-text">
          <div className="t1">THE NETWORK PLAN</div>
          <div className="t2">the art of aviation</div>
        </div>
      </div>

      <div className="nav-group">
        <NavRow to="/occ" label="OCC Dashboard" icon={LayoutGrid} />
      </div>

      {SECTIONS.map((section) => (
        <div className="nav-group" key={section.title}>
          <div className="nav-label">{section.title}</div>
          {section.items.map((item) => (
            <NavRow key={item.to} {...item} />
          ))}
        </div>
      ))}

      <div className="nav-group nav-group-settings">
        <NavRow to="/settings" label="Settings" icon={Settings2} />
      </div>
    </aside>
  )
}
