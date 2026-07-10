// src/pages/admin/AdminPosts.jsx
import { useCallback, useEffect, useState, useMemo, useRef } from "react"
import { fetchAdminPosts, hidePost, restorePost, deletePost } from "../../api/adminPosts"
import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu"
import {
  FileText,
  Heart,
  Eye,
  Building2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  EyeOff,
  Trash2,
  Pencil,
  Download,
  Plus,
  Inbox,
} from "lucide-react"
import { formatCountEn } from "../../utils/formatEn"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

const PAGE_SIZE = 20

export default function AdminPosts() {
  const [posts, setPosts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionId, setActionId] = useState(null)
  const navigate = useNavigate()

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = {
        page,
        pageSize: PAGE_SIZE,
      }
      if (search) params.search = search
      if (statusFilter === "hidden") params.hiddenOnly = true
      const data = await fetchAdminPosts(params)
      setPosts(data.items ?? [])
      setTotalCount(data.totalCount ?? data.total ?? data.items?.length ?? 0)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل البوستات")
      setPosts([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  /* ── Stats ────────────────────────────────── */
  const stats = useMemo(() => {
    const totalLikes = posts.reduce((s, p) => s + (p.likeCount || 0), 0)
    const totalViews = posts.reduce((s, p) => s + (p.viewCount || p.shareCount || 0), 0)
    const companies = new Set(posts.map((p) => p.organizationName).filter(Boolean)).size
    return [
      { label: "إجمالي البوستات", value: formatCountEn(totalCount), icon: FileText, tone: "bg-sky-50 text-sky-800 ring-sky-100" },
      { label: "الإعجابات", value: formatCountEn(totalLikes), icon: Heart, tone: "bg-rose-50 text-rose-800 ring-rose-100" },
      { label: "المشاهدات", value: formatCountEn(totalViews), icon: Eye, tone: "bg-amber-50 text-amber-800 ring-amber-100" },
      { label: "الشركات", value: formatCountEn(companies), icon: Building2, tone: "bg-indigo-50 text-indigo-800 ring-indigo-100" },
    ]
  }, [posts, totalCount])

  /* ── Actions ──────────────────────────────── */
  const runAction = async (id, fn) => {
    setActionId(id)
    setError("")
    try {
      await fn()
      await loadPosts()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تنفيذ الإجراء")
    } finally {
      setActionId(null)
    }
  }

  const handleHide = (id) => {
    if (!confirm("إخفاء هذا البوست؟")) return
    runAction(id, () => hidePost(id, ""))
  }
  const handleRestore = (id) => {
    runAction(id, () => restorePost(id))
  }
  const handleDelete = (id) => {
    if (!confirm("تأكيد حذف البوست نهائيًا؟")) return
    runAction(id, () => deletePost(id))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">إشراف البوستات</h1>
          <p className={`mt-1 text-sm ${adminTextMuted}`}>
            راجع، ابحث، وأدر جميع منشورات الشركات السياحية.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className={`h-10 rounded-xl ${adminBtnPrimary}`} onClick={() => navigate("/admin/posts/create")}>
            <Plus className="size-4" />
            إنشاء بوست
          </Button>
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => window.location.href = "/api/admin/posts/export"}>
            <Download className="size-4" />
            تصدير
          </Button>
        </div>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      {/* ── Stats Cards ──────────────────────── */}
      <MotionSection delay={0.02} aria-label="إحصائيات البوستات">
        <StaggerList className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <StaggerItem key={label}>
              <MotionSurface>
                <Card className="admin-card-surface rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 shadow-sm ${tone}`}>
                      <Icon className="size-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="admin-stat-value text-xl font-bold tabular-nums">{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              </MotionSurface>
            </StaggerItem>
          ))}
        </StaggerList>
      </MotionSection>

      {/* ── Search + Filters + Table ─────────── */}
      <Card className={adminCardClass}>
        <CardHeader className="pb-3">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="🔍 ابحث بالعنوان..."
                  className="h-11 rounded-xl pe-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <select
                className="h-11 rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">الكل ▼</option>
                <option value="published">منشور</option>
                <option value="hidden">مخفي</option>
              </select>
            </div>
            <Button type="submit" className={`h-11 rounded-xl ${adminBtnPrimary}`}>
              بحث
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={loading}
              onClick={() => loadPosts()}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </form>
        </CardHeader>

        <CardContent className="p-0">
          {loading && posts.length === 0 ? (
            <AdminCardsSkeleton count={6} gridClassName="grid gap-4 p-4 sm:grid-cols-2" />
          ) : posts.length === 0 ? (
            /* ── Empty State ─────────────────── */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
                <Inbox className="size-7 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">لا توجد منشورات</p>
              <p className={`mt-1 text-xs ${adminTextMuted}`}>ابدأ بإنشاء أول منشور.</p>
              <Button className={`mt-4 rounded-xl ${adminBtnPrimary}`} onClick={() => navigate("/admin/posts/create")}>
                <Plus className="size-4" />
                إنشاء بوست
              </Button>
            </div>
          ) : (
            /* ── Table ───────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3 text-right">الصورة</th>
                    <th className="px-4 py-3 text-right">العنوان</th>
                    <th className="px-4 py-3 text-right">الناشر</th>
                    <th className="px-4 py-3 text-right">الشركة</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">التفاعل</th>
                    <th className="px-4 py-3 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.map((post) => {
                    const busy = actionId === post.id
                    return (
                      <tr key={post.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                        {/* Thumbnail */}
                        <td className="px-4 py-2">
                          {post.thumbnailUrl || post.imageUrl ? (
                            <img
                              src={post.thumbnailUrl || post.imageUrl}
                              alt=""
                              className="size-12 rounded-xl object-cover ring-1 ring-slate-200/80"
                            />
                          ) : (
                            <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                              <FileText className="size-5 text-slate-400" />
                            </div>
                          )}
                        </td>
                        {/* Title */}
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="text-right hover:underline"
                            onClick={() => navigate(`/admin/posts/${post.id}`)}
                          >
                            <span className="block font-medium text-brand-navy line-clamp-1">{post.title || "—"}</span>
                          </button>
                        </td>
                        {/* Author */}
                        <td className="px-4 py-2 text-slate-700">{post.authorName || post.userName || "—"}</td>
                        {/* Company */}
                        <td className="px-4 py-2 text-slate-700">{post.organizationName || "—"}</td>
                        {/* Status Badge */}
                        <td className="px-4 py-2">
                          {post.isHiddenByAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 bg-rose-50 text-rose-900 ring-rose-200/80">
                              <EyeOff className="size-3" /> مخفي
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 bg-emerald-50 text-emerald-900 ring-emerald-200/80">
                              <Eye className="size-3" /> منشور
                            </span>
                          )}
                        </td>
                        {/* Engagement */}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Heart className="size-3.5 text-rose-500" /> {formatCountEn(post.likeCount)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Eye className="size-3.5 text-sky-500" /> {formatCountEn(post.viewCount || post.shareCount)}
                            </span>
                          </div>
                        </td>
                        {/* Actions Dropdown */}
                        <td className="px-4 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="size-8 rounded-lg p-0" disabled={busy}>
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="admin-glass min-w-[140px] rounded-xl">
                              <DropdownMenuItem onClick={() => navigate(`/admin/posts/${post.id}`)}>
                                <Pencil className="size-4" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!post.isHiddenByAdmin ? (
                                <DropdownMenuItem onClick={() => handleHide(post.id)} className="text-amber-700 focus:text-amber-800">
                                  <EyeOff className="size-4" />
                                  إخفاء
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRestore(post.id)} className="text-emerald-700 focus:text-emerald-800">
                                  <Eye className="size-4" />
                                  إظهار
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-rose-700 focus:text-rose-800">
                                <Trash2 className="size-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-3">
              <span className="text-xs text-slate-500">
                عرض {PAGE_SIZE} عناصر — صفحة {page} من {totalPages} (إجمالي {formatCountEn(totalCount)})
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronRight className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
