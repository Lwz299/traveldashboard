import { useEffect, useState, useMemo } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { AnimatedOutlet } from "./motion"
import SupportChat from "./chat/SupportChat"
import { useAuth } from "../context/AuthContext"
import api from "../api/api"
import { Button } from "./ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Users,
  UsersRound,
  ShoppingCart,
  Video,
  QrCode,
  ClipboardCheck,
  BarChart3,
  Wallet,
  User,
  LogOut,
  ChevronsUpDown,
  Plane,
  LifeBuoy,
} from "lucide-react"
import { useOrgPermissions } from "../hooks/useOrgPermissions"

const baseNavItems = [
  { to: "/", icon: LayoutDashboard, label: "لوحة التحكم" },
  { to: "/events", icon: Calendar, label: "الرحلات", perm: ["CanManageEvents", "CanManageTrips"] },
  { to: "/videos", icon: Video, label: "الفيديوهات", perm: ["CanManageVideos"] },
  { to: "/orders", icon: ShoppingCart, label: "المبيعات والحجوزات", perm: ["CanManageOrders"] },
  { to: "/agenda", icon: ListTodo, label: "الأجندة والنماذج", perm: ["CanManageEvents", "CanManageTrips"] },
  { to: "/attendees", icon: Users, label: "المسافرون", perm: ["CanManageOrders"] },
  { to: "/field", icon: QrCode, label: "عمليات الميدان", perm: ["CanManageOrders"] },
  { to: "/attendance", icon: ClipboardCheck, label: "الحضور", perm: ["CanManageOrders"] },
  { to: "/reports", icon: BarChart3, label: "التقارير" },
  { to: "/wallet", icon: Wallet, label: "المحفظة", perm: ["CanManageFinance"] },
  { to: "/org-users", icon: UsersRound, label: "مستخدمو المنظمة" },
  { to: "/profile", icon: User, label: "الملف الشخصي" },
  { to: "/support", icon: LifeBuoy, label: "الدعم الفني" },
]

const routeTitles = {
  "/": "لوحة التحكم",
  "/events": "الرحلات",
  "/videos": "الفيديوهات",
  "/org-users": "مستخدمو المنظمة",
  "/orders": "المبيعات والحجوزات",
  "/bookings": "المبيعات والحجوزات",
  "/agenda": "الأجندة والنماذج",
  "/attendees": "المسافرون",
  "/field": "عمليات الميدان",
  "/attendance": "الحضور",
  "/reports": "التقارير",
  "/wallet": "المحفظة",
  "/profile": "الملف الشخصي",
  "/support": "الدعم الفني",
}

function getPageTitle(pathname) {
  if (pathname === "/") return "لوحة التحكم"
  if (/^\/events\/[^/]+$/.test(pathname)) return "تفاصيل الرحلة"
  for (const [path, title] of Object.entries(routeTitles)) {
    if (path !== "/" && pathname.startsWith(path)) return title
  }
  return "لوحة التحكم"
}

const ROLE_LABELS = { OrgAdmin: "مدير المنظمة", OrgStaff: "موظف" }

function pickOrganizationName(org) {
  if (!org || typeof org !== "object") return null
  return (
    org.name ??
    org.organizationName ??
    org.Name ??
    org.OrganizationName ??
    null
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { can } = useOrgPermissions()
  const navItems = useMemo(
    () => baseNavItems.filter((item) => !item.perm || can(item.perm)),
    [can]
  )
  const roleLabel = user?.orgRole ? ROLE_LABELS[user.orgRole] ?? user.orgRole : null
  const navigate = useNavigate()
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  const initialName = pickOrganizationName(user) ?? pickOrganizationName(user?.organization)
  const [organizationName, setOrganizationName] = useState(
    /** @type {string | null | undefined} */
    (initialName !== null && initialName !== undefined ? initialName : undefined)
  )

  useEffect(() => {
    if (!user?.token || user?.isSuperAdmin) return
    let cancelled = false
    api
      .get("/organizations/me")
      .then((res) => {
        if (cancelled) return
        const name = pickOrganizationName(res.data)
        setOrganizationName(name ?? null)
      })
      .catch(() => {
        if (!cancelled) setOrganizationName((prev) => (prev !== undefined ? prev : null))
      })
    return () => {
      cancelled = true
    }
  }, [user?.token, user?.isSuperAdmin])

  const handleLogout = async () => {
    await logout({ redirect: false })
    navigate("/login")
  }

  const navLinkClass = ({ isActive }) =>
    [
      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-green-600 text-white shadow-md shadow-green-900/15"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    ].join(" ")

  return (
    <div className="org-app flex min-h-svh w-full text-slate-800 antialiased">
      <aside className="org-sidebar-surface group/orgside hidden w-[80px] shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-out hover:w-[260px] focus-within:w-[260px] md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/90 px-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/12 ring-1 ring-emerald-600/25">
            <Plane className="size-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/orgside:opacity-100 group-focus-within/orgside:opacity-100">
            <span
              className="block truncate text-sm font-semibold tracking-tight text-slate-900"
              title={typeof organizationName === "string" ? organizationName : undefined}
            >
              {organizationName === undefined ? "…" : organizationName || "—"}
            </span>
            <span className="text-xs font-medium text-slate-500">لوحة المنظمة</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <div className="flex w-[32px] shrink-0 items-center justify-center">
                    <Icon className="size-[20px] opacity-95" strokeWidth={1.75} />
                  </div>
                  <span className="truncate opacity-0 transition-opacity duration-200 group-hover/orgside:opacity-100 group-focus-within/orgside:opacity-100">
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity duration-200 group-hover/orgside:opacity-100 group-focus-within/orgside:opacity-100" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/90 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-100/95 hover:text-slate-900"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">
                    <User className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 text-right opacity-0 transition-opacity duration-200 group-hover/orgside:opacity-100 group-focus-within/orgside:opacity-100">
                    <span className="block truncate text-sm font-medium">الحساب</span>
                    {roleLabel && (
                      <span className="block truncate text-xs font-normal text-slate-500">{roleLabel}</span>
                    )}
                  </div>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-slate-400 opacity-0 transition-opacity duration-200 group-hover/orgside:opacity-100 group-focus-within/orgside:opacity-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal text-slate-500">الحساب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg"
                onClick={() => navigate("/profile")}
              >
                <User className="ms-2 size-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
              >
                <LogOut className="ms-2 size-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-emerald-900/10 bg-white/85 px-4 shadow-sm shadow-emerald-950/5 backdrop-blur-md md:px-6">
          <Breadcrumb>
            <BreadcrumbList className="text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/" className="text-slate-500 transition-colors hover:text-emerald-700">
                    الرئيسية
                  </NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-300" />
              <BreadcrumbItem>
                <BreadcrumbPage className="org-heading font-semibold">{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl md:hidden"
                aria-label="الحساب"
              >
                <User className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel w-48 rounded-xl">
              <DropdownMenuItem onClick={() => navigate("/profile")}>الملف الشخصي</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-emerald-900/10 bg-white/95 py-2 shadow-[0_-4px_24px_-8px_rgba(6,78,59,0.12)] backdrop-blur-md md:hidden">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1.5 py-1.5 active:scale-[0.98]"
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    "flex size-9 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/25"
                      : "bg-slate-100/95 text-slate-600",
                  ].join(" ")}
                >
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                </span>
                <span
                  className={[
                    "line-clamp-2 max-w-full text-center text-[10px] font-medium leading-tight",
                    isActive ? "text-emerald-800" : "text-slate-500",
                  ].join(" ")}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="h-16 shrink-0 md:hidden" aria-hidden />
      <SupportChat variant="org" />
    </div>
  )
}
