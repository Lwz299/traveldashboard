import {
  FolderTree,
  Music,
  Mic2,
  Headphones,
  Film,
  Video,
  Camera,
  Plane,
  Car,
  TrainFront,
  Bus,
  MapPin,
  Map,
  Mountain,
  Tent,
  Trophy,
  Award,
  Gamepad2,
  Dice5,
  Palette,
  Paintbrush,
  BookOpen,
  GraduationCap,
  Users,
  Baby,
  Heart,
  HandHeart,
  Utensils,
  Coffee,
  ShoppingBag,
  Store,
  Landmark,
  Building2,
  Church,
  Sparkles,
  Wand2,
  Star,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Dumbbell,
  Bike,
  Fish,
  TreePine,
  Flower2,
  Ticket,
  Calendar,
  Clock,
  Briefcase,
  Laptop,
  Smartphone,
  Radio,
  Tv,
  PartyPopper,
  Gift,
  Megaphone,
  Waves,
  Wine,
  Zap,
  Drama,
  Clapperboard,
  Drum,
  Guitar,
} from "lucide-react"
import { cn } from "../lib/utils.mjs"

/** @type {Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>} */
const LUCIDE_BY_NAME = {
  FolderTree,
  Music,
  Mic2,
  Headphones,
  Film,
  Video,
  Camera,
  Plane,
  Car,
  TrainFront,
  Bus,
  MapPin,
  Map,
  Mountain,
  Tent,
  Trophy,
  Award,
  Gamepad2,
  Dice5,
  Palette,
  Paintbrush,
  BookOpen,
  GraduationCap,
  Users,
  Baby,
  Heart,
  HandHeart,
  Utensils,
  Coffee,
  ShoppingBag,
  Store,
  Landmark,
  Building2,
  Church,
  Sparkles,
  Wand2,
  Star,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Dumbbell,
  Bike,
  Fish,
  TreePine,
  Flower2,
  Ticket,
  Calendar,
  Clock,
  Briefcase,
  Laptop,
  Smartphone,
  Radio,
  Tv,
  PartyPopper,
  Gift,
  Megaphone,
  Waves,
  Wine,
  Zap,
  Drama,
  Clapperboard,
  Drum,
  Guitar,
}

const DEFAULT_ICON = FolderTree

/**
 * يقرأ من الـ API حقل `iconUrl` — يُستخدم كاسم تصدير أيقونة Lucide (مثل Music، Building2)، وليس رابط صورة.
 * القيم القديمة التي تبدأ بـ http تُتجاهل وتُعرض الأيقونة الافتراضية.
 */
export function getCategoryIconName(cat) {
  if (cat == null || typeof cat !== "object") return ""
  const raw = cat.iconUrl ?? cat.IconUrl
  if (raw == null) return ""
  const s = String(raw).trim()
  if (!s || /^https?:\/\//i.test(s)) return ""
  return s
}

function normalizeIconKey(name) {
  const t = String(name).trim()
  if (!t) return ""
  if (LUCIDE_BY_NAME[t]) return t
  const pascal = t.charAt(0).toUpperCase() + t.slice(1)
  if (LUCIDE_BY_NAME[pascal]) return pascal
  return t
}

export function resolveCategoryLucideIcon(name) {
  if (name == null || name === "") return DEFAULT_ICON
  const s = String(name).trim()
  if (!s || /^https?:\/\//i.test(s)) return DEFAULT_ICON
  const key = normalizeIconKey(s)
  return LUCIDE_BY_NAME[key] ?? DEFAULT_ICON
}

/**
 * @param {{ name?: string, className?: string, strokeWidth?: number, title?: string }} props
 */
export default function CategoryIcon({ name, className, strokeWidth = 1.75, title, ...rest }) {
  const Icon = resolveCategoryLucideIcon(name)
  return <Icon className={cn("shrink-0", className)} strokeWidth={strokeWidth} title={title} {...rest} />
}
