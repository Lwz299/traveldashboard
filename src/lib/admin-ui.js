/**
 * Super Admin — Quiet Authority: sky primary, navy text, soft surfaces.
 * Use inside `.admin-app` so CSS variables apply to Button variants.
 */

/** Primary content cards */
export const adminCardClass =
  "admin-card-surface rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-[background-color,box-shadow] duration-200 hover:bg-sky-50/35 hover:shadow-md hover:shadow-slate-900/10"

/** List cards — نفس سلوك hover الثابت */
export const adminListCardClass =
  "admin-card-surface rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-[background-color,box-shadow] duration-200 hover:bg-slate-50/70 hover:shadow-md hover:shadow-slate-900/10"

/** Cards without hover lift (modals, nested) */
export const adminCardClassStatic =
  "admin-card-surface rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.06]"

/** Icon badge (matches dashboard quick links) */
export const adminIconBox =
  "flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100 text-sky-700"

export const adminIconBoxRound =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 ring-1 ring-sky-100 text-sky-700"

/** Inline error / validation banner */
export const adminPageError =
  "rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-sm text-rose-800"

/** Primary CTA — stack on default Button (sky in admin-app) */
export const adminBtnPrimary = "rounded-xl shadow-sm shadow-sky-500/20"

/** Modal overlay */
export const adminModalBackdrop =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"

/** Secondary text (empty states, captions) */
export const adminTextMuted = "text-slate-500"

/** KPI / summary strip (reports page) */
export const adminKpiCard =
  "admin-card-surface rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-[background-color,box-shadow] duration-200 hover:bg-slate-50/70 hover:shadow-md hover:shadow-slate-900/10"
