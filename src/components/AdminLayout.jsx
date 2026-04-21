import { useEffect, useState } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { AnimatedOutlet } from "./motion"
import SupportChat from "./chat/SupportChat"
import { useAuth } from "../context/AuthContext"
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
  Building2,
  Wallet,
  Landmark,
  User,
  LogOut,
  ChevronsUpDown,
  Shield,
  Users,
  Calendar,
  FolderTree,
  BarChart3,
  Megaphone,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react"

const adminNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "لوحة التحكم", end: true },
  { to: "/admin/partners", icon: Building2, label: "طلبات الشركاء", end: false },
  { to: "/admin/organizations", icon: Users, label: "المنظمات", end: false },
  { to: "/admin/events", icon: Calendar, label: "الفعاليات", end: false },
  { to: "/admin/categories", icon: FolderTree, label: "التصنيفات", end: false },
  { to: "/admin/reports", icon: BarChart3, label: "التقارير", end: false },
  { to: "/admin/finance", icon: Landmark, label: "المالية", end: false },
  { to: "/admin/payouts", icon: Wallet, label: "طلبات السحب", end: false },
  { to: "/admin/notifications", icon: Megaphone, label: "الإشعارات", end: false },
  { to: "/admin/support", icon: LifeBuoy, label: "الدعم الفني", end: false },
]

const routeTitles = {
  "/admin": "لوحة التحكم",
  "/admin/partners": "طلبات الشركاء",
  "/admin/organizations": "المنظمات",
  "/admin/events": "الفعاليات",
  "/admin/categories": "التصنيفات",
  "/admin/reports": "التقارير",
  "/admin/finance": "المالية",
  "/admin/payouts": "طلبات السحب",
  "/admin/notifications": "الإشعارات",
  "/admin/support": "الدعم الفني",
}

function getPageTitle(pathname) {
  if (pathname === "/admin" || pathname === "/admin/") return "لوحة التحكم"
  if (/^\/admin\/events\/.+/.test(pathname) && pathname !== "/admin/events") {
    return "تفاصيل الفعالية"
  }
  for (const [path, title] of Object.entries(routeTitles)) {
    if (path !== "/admin" && pathname.startsWith(path)) return title
  }
  return "غرفة التحكم"
}

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pageTitle = getPageTitle(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

  return (
    <div className="admin-app flex min-h-svh w-full bg-surface-canvas text-slate-800 antialiased">
      <aside className="group/sidebar hidden w-[72px] shrink-0 flex-col overflow-hidden border-e border-slate-200/70 bg-gradient-to-b from-white via-sky-50/25 to-white shadow-[4px_0_32px_-16px_rgba(15,23,42,0.1)] transition-[width] duration-300 ease-out hover:w-[260px] focus-within:w-[260px] md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/60 px-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-slate-800 text-white shadow-md shadow-sky-500/10 ring-2 ring-sky-400/25">
            <Shield className="size-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            <span className="block truncate text-sm font-semibold tracking-tight text-brand-navy">
              غرفة التحكم
            </span>
            <span className="text-xs font-medium text-slate-500">Super Admin</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-auto px-3 py-5">
          {adminNavItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                  isActive
                    ? "bg-gradient-to-l from-brand-sky to-brand-sky-light text-white shadow-md shadow-sky-500/25"
                    : "text-slate-600 hover:bg-sky-50/80 hover:text-brand-navy",
                ].join(" ")
              }
            >
              <Icon className="size-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="truncate opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/60 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between rounded-xl px-3 py-2.5 text-slate-700 hover:bg-sky-50/90"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-slate-100 text-sky-800 ring-1 ring-sky-200/50">
                    <User className="size-4" strokeWidth={1.75} />
                  </div>
                  <span className="truncate text-sm font-medium text-brand-navy opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                    المدير العام
                  </span>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-slate-400 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="admin-glass w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal text-slate-500">الحساب</DropdownMenuLabel>
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={[
          "fixed inset-y-0 start-0 z-50 flex w-[280px] max-w-[82vw] flex-col border-e border-slate-200/80 bg-white shadow-xl transition-transform duration-200 md:hidden",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200/80 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-slate-800 text-white">
              <Shield className="size-4" />
            </div>
            <span className="text-sm font-semibold text-brand-navy">غرفة التحكم</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة">
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
          {adminNavItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-glass sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
          <Breadcrumb>
            <BreadcrumbList className="text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink
                    to="/admin"
                    className="text-slate-500 transition-colors hover:text-brand-sky"
                  >
                    الرئيسية
                  </NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-300" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-brand-navy">{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[min(100%,1600px)] px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
            <AnimatedOutlet />
          </div>
        </main>
      </div>
      <SupportChat variant="admin" />
    </div>
  )
}
