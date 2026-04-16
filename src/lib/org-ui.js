/** Organization dashboard — shared classes (see `.org-app` in index.css) */

/** hover ثابت: لون خفيف أو ظل فقط — بلا تحريك (انظر `.org-card-surface` في index.css) */
export const orgCardClass =
  "org-card-surface rounded-2xl transition-[background-color,box-shadow] duration-200 hover:bg-emerald-50/35 hover:shadow-md hover:shadow-slate-900/8"

export const orgCardClassSubtle =
  "org-card-surface rounded-2xl transition-[background-color,box-shadow] duration-200 hover:bg-slate-50/55 hover:shadow-md hover:shadow-slate-900/8"

export const orgModalBackdrop =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"

export const orgBtnPrimary = "rounded-xl shadow-sm shadow-emerald-900/15"
