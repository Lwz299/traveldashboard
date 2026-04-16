import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Html5Qrcode } from "html5-qrcode"
import api from "../api/api"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { CheckCircle2, XCircle, Camera, CameraOff, Keyboard } from "lucide-react"
import { formatCountEn, formatDateTimeEn } from "../utils/formatEn"
import { EASE } from "../lib/motion-variants"
import { MotionSection, MotionSurface, InlineDetailSkeleton } from "../components/motion"

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

const SCANNER_ID = "qr-reader-field"

export default function Field() {
  const [isScanning, setIsScanning] = useState(false)
  const [qrCode, setQrCode] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [error, setError] = useState("")
  const scannerRef = useRef(null)
  const lastScannedRef = useRef("")
  const selectedEventRef = useRef("")

  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState("")

  useEffect(() => {
    selectedEventRef.current = selectedEventId
  }, [selectedEventId])

  useEffect(() => {
    let cancelled = false
    setEventsLoading(true)

    api
      .get("/events/organization/my-events")
      .then((r) => {
        if (cancelled) return
        setEvents(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (cancelled) return
        setEvents([])
      })
      .finally(() => {
        if (cancelled) return
        setEventsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const verifyTicket = async (code, eventId) => {
    if (loading) return
    if (lastScannedRef.current === code) return
    lastScannedRef.current = code
    setResult(null)
    setLoading(true)
    setError("")
    try {
      const url = eventId
        ? `/tickets/verify/${encodeURIComponent(code)}?eventId=${encodeURIComponent(eventId)}`
        : `/tickets/verify/${encodeURIComponent(code)}`

      const { data } = await api.post(url)
      setResult({
        success: true,
        message: data?.message,
        checkedInAtUtc: data?.checkedInAtUtc,
        eventTitle: data?.eventTitle,
        code: data?.code,
      })
      stopCamera()
    } catch (err) {
      const payload = err.response?.data
      const codeFromApi = payload?.code
      const messageFromApi = payload?.message || err.message || "فشل التحقق"
      setResult({
        success: false,
        code: codeFromApi,
        message: messageFromApi,
        data: payload ?? null,
      })
    } finally {
      setLoading(false)
      setTimeout(() => { lastScannedRef.current = "" }, 2000)
    }
  }

  const resetAndScanAgain = () => {
    setResult(null)
    setQrCode("")
    lastScannedRef.current = ""
    if (!manualMode) startCamera()
  }

  const stopCamera = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch (e) {
        console.warn(e)
      }
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  const startCamera = async () => {
    setResult(null)
    setError("")
    setManualMode(false)
    if (scannerRef.current) return

    setIsScanning(true)
    await new Promise((r) => setTimeout(r, 100))

    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ID)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          verifyTicket(decodedText, selectedEventRef.current)
        },
        () => {}
      )
    } catch (err) {
      setError(err?.message || "تعذر تشغيل الكاميرا. تحقق من الصلاحيات.")
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (qrCode.trim()) verifyTicket(qrCode.trim(), selectedEventRef.current)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="space-y-8">
      <MotionSection delay={0.04}>
        <div className="grid gap-6 lg:grid-cols-2">
        <MotionSurface className="lg:col-span-2">
        <Card className="rounded-2xl border-slate-200/80 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              اختيار رحلة للتحقق (اختياري)
            </CardTitle>
            <CardDescription>
              عند اختيار رحلة سيتم إرسال `eventId` مع الطلب للتأكد من أن التذكرة تخص نفس الفعالية.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[260px]">
              <Label>الرحلة</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={eventsLoading}
              >
                <option value="">بدون تحديد (تحقق عام)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title ?? ev.name ?? "بدون عنوان"}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {eventsLoading ? (
                <span className="inline-block min-w-[140px]">
                  <InlineDetailSkeleton rows={1} />
                </span>
              ) : (
                `عدد الرحلات: ${formatCountEn(events.length)}`
              )}
            </div>
          </CardContent>
        </Card>
        </MotionSurface>

        <MotionSurface>
        <Card className="rounded-2xl border-slate-200/80 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-6 h-6" />
              مسح بالكاميرا
            </CardTitle>
            <CardDescription>
              شغّل الكاميرا ووجّهها نحو رمز QR أو الباركود على التذكرة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <Button
                onClick={startCamera}
                disabled={loading}
                className={`w-full ${btnTap}`}
              >
                <Camera className="w-4 h-4 ml-2" />
                تشغيل الكاميرا
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={stopCamera}
                disabled={loading}
                className={`w-full ${btnTap}`}
              >
                <CameraOff className="w-4 h-4 ml-2" />
                إيقاف الكاميرا
              </Button>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div
              id={SCANNER_ID}
              className={`rounded-lg overflow-hidden border bg-black/5 ${!isScanning ? "invisible h-0 overflow-hidden" : ""}`}
              style={{ minHeight: isScanning ? 300 : 0 }}
            />
          </CardContent>
        </Card>
        </MotionSurface>

        <MotionSurface>
        <Card className="rounded-2xl border-slate-200/80 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-6 h-6" />
              إدخال يدوي
            </CardTitle>
            <CardDescription>
              أدخل الرمز يدوياً في حال تعذّر المسح
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                placeholder="رمز QR أو الباركود"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !qrCode.trim()} className={`w-full ${btnTap}`}>
                {loading ? "جاري التحقق..." : "التحقق"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </MotionSurface>
        </div>
      </MotionSection>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
        <Card className={`rounded-2xl shadow-sm ring-1 ring-slate-900/[0.04] ${result.success ? "border-green-200" : "border-destructive/50"}`}>
          <CardContent className="pt-6">
            <div
              className={`flex items-start gap-4 p-4 rounded-lg ${
                result.success ? "bg-green-50" : "bg-destructive/5"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-10 h-10 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-10 h-10 text-destructive flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-semibold text-lg ${result.success ? "text-green-800" : "text-destructive"}`}>
                  {result.success ? result.message || "تم التحقق بنجاح" : "فشل التحقق"}
                </p>
                {result.success ? (
                  <>
                    {result.eventTitle && (
                      <p className="mt-1 text-sm text-green-900/90">{result.eventTitle}</p>
                    )}
                    {result.checkedInAtUtc && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        وقت التسجيل: {formatDateTimeEn(result.checkedInAtUtc)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {result.code && (
                      <p className="mt-2 text-sm text-destructive">
                        كود الخطأ: <span className="font-semibold">{result.code}</span>
                      </p>
                    )}
                    <p className="mt-1 text-destructive">{result.message}</p>
                    {result.data?.earliestCheckInUtc && result.data?.latestCheckInUtc && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        التحقق مسموح بين:{" "}
                        {formatDateTimeEn(result.data.earliestCheckInUtc)} - {formatDateTimeEn(result.data.latestCheckInUtc)}
                      </p>
                    )}
                    {result.data && (
                      <pre className="mt-3 text-xs text-destructive bg-white/50 p-3 rounded overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={`mt-4 ${btnTap}`}
                  onClick={resetAndScanAgain}
                >
                  مسح تذكرة أخرى
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}
    </div>
  )
}
