import { Zap, Dumbbell, Target, Flame, Activity, TrendingUp, UtensilsCrossed, BarChart3, Leaf, GraduationCap, Medal, Trophy, Armchair, PersonStanding, Home, ArrowLeftRight, CircleDot, Infinity } from 'lucide-react'

// Maps material icon names (from onboarding-options) to Lucide components
// Same mapping as v1 /onboarding-fitness ICON_MAP + F6.B.1 equipment icons
export const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  local_fire_department: Flame,
  fitness_center: Dumbbell,
  directions_run: Activity,
  refresh: Target,
  weekend: Armchair,
  directions_walk: PersonStanding,
  bolt: Zap,
  fastfood: UtensilsCrossed,
  restaurant: UtensilsCrossed,
  analytics: BarChart3,
  eco: Leaf,
  school: GraduationCap,
  trending_up: TrendingUp,
  military_tech: Medal,
  emoji_events: Trophy,
  // F6.B.1 equipment
  home: Home,
  swap_horiz: ArrowLeftRight,
  sports_handball: CircleDot,
  all_inclusive: Infinity,
}
