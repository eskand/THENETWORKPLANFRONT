import {
  Armchair,
  Building2,
  Circle,
  Clock,
  GraduationCap,
  MapPin,
  MonitorPlay,
  Plane,
  PlaneTakeoff,
  ShieldPlus,
} from 'lucide-react'

/**
 * Une icone par code de vacation — celles du prototype.
 *
 * <b>Pourquoi une icone et pas le code.</b> Le prototype ne met pas « FLT »
 * dans la case : il y met un avion. Sur trente-et-une colonnes, trois lettres
 * par case donnent une grille qu'on dechiffre ; un pictogramme se reconnait.
 * La couleur continue de porter le code, l'icone porte la nature.
 *
 * <b>Un seul endroit.</b> La grille et l'editeur de case lisent cette table :
 * un repos qui serait une horloge dans l'une et un cercle dans l'autre
 * obligerait le planificateur a apprendre deux alphabets pour le meme ecran.
 */
export const CODE_ICON = {
  OFF: Circle,
  RES: Clock,
  SBY: Clock,
  FLT: Plane,
  POS: PlaneTakeoff,
  TRG: GraduationCap,
  OFFICE: Building2,
  LVE: MapPin,
  SICK: ShieldPlus,
  // Un siege : en mise en place passager, l'equipage est assis derriere.
  DH: Armchair,
  // Un ecran : la seance de simulateur n'est pas un cours au sol.
  SIM: MonitorPlay,
}

/** Le pictogramme d'un code, ou l'avion faute de mieux. */
export function CodeIcon({ code, size = 13 }) {
  const Icon = CODE_ICON[code] ?? Plane
  return <Icon size={size} strokeWidth={2} />
}
