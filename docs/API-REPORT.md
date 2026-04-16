# تقرير مسارات API — الإشعارات داخل التطبيق فقط

هذا الملف يلخص ما تعنيه **واجهة لوحة التاجر (هذا المشروع)** عند الاتصال بالخادم. المسارات الكاملة تفترض بادئة `VITE_API_URL` الافتراضية التي تنتهي بـ `/api` (مثل `https://host/api`).

---

## 1) سوبر أدمن — إشعار لجميع مستخدمي المنصة

| الغرض | Method | المسار النسبي للـ axios | الجسم |
|--------|--------|-------------------------|--------|
| بث لجميع المستخدمين **النشطين** في جدول `Users`؛ تُنشأ سجلات في **`UserNotifications`** (نوع **`platform_announcement`**) | `POST` | `/super-admin/notifications/broadcast-all` | `{ "title", "body" }` |

- **التوثيق:** `Authorization: Bearer <token>` بعد تسجيل دخول السوبر أدمن (`POST /super-admin/login`).
- **الواجهة في هذا الفرونت:** `/admin/notifications`.
- **صفحة اختبار اختيارية على الخادم:** `wwwroot/super-admin/index.html` — لا تُستخدم من هذا المستودع إذا كان الفرونت منفصلاً.

---

## 2) منظمة (شركة السفر) — إشعار للزبائن حسب التذاكر

| الغرض | Method | المسار النسبي | الجسم |
|--------|--------|----------------|--------|
| من **لديهم تذكرة** لفعالية محددة | `POST` | `/notifications/in-app/event/{eventId}` | `{ "title", "body" }` |
| من **اشترَوا** من أي فعالية تابعة للمنظمة | `POST` | `/notifications/in-app/organization` | `{ "title", "body" }` |

- **التوثيق:** `Authorization: Bearer <token>` لحساب المنظمة (JWT يحتوي **`orgId`**؛ التحقق من ملكية الفعالية كما في السابق).
- **الرد الشائع:** `{ "message", "usersNotified" }` (قد يُرجَع **PascalCase** من ASP.NET).
- **الواجهة في هذا الفرونت:** صفحة **المسافرون** (`/attendees`) — بطاقتان (رحلة / منظمة كاملة).

**خلفية الخادم (مرجعية):** تخزين عبر **`UserNotifications`**؛ منطق التجميع يعتمد على **`ITicketRepository`** (من اشترى لفعالية / لمنظمة) ويمكن البث لمجموعة معرفات عبر **`UserNotificationRepository`** (مثل `BroadcastToUserIdsAsync` حسب تنفيذ الخادم).

---

## 3) إلغاء البريد — ما لم يعد موجوداً

| السابق | الحالي |
|--------|--------|
| مسارات بريد جماعي (حتى لو كانت تُسجَّل في اللوج فقط) | **لا توجد** مسارات بريد في الـ API لهذا الغرض |
| `POST .../notifications/mass-email/{eventId}` | **محذوف** |
| `POST .../notifications/mass-email/organization` | **محذوف** |
| `SendEmailAsync` / `SendMassEmailAsync` في خدمة الإشعارات | **مُزالان** من العقد والتنفيذ |
| `GetDistinctPurchaserEmailsForOrganizationAsync` في مستودع التذاكر | **مُزال** (كان للبريد فقط) |

الاعتماد **فقط** على **`UserNotifications`**؛ العرض للمستخدم النهائي في **الميني أب** (وليس بريداً من هذه المسارات).

---

## 4) أخرى (خادم)

- **`POST /api/notifications/push/{userId}`** — ما زال **placeholder / لوج**؛ تمهيد **FCM** لاحقاً؛ **ليس** إرسال بريد.

---

## 5) مراجع المشروع

| الملف | المحتوى |
|-------|---------|
| [`docs/SUPER-ADMIN-API-GUIDE.md`](./SUPER-ADMIN-API-GUIDE.md) | دليل API المدير العام (سوبر أدمن) بالكامل |
| [`docs/ORGANIZATION-DASHBOARD-API-GUIDE.md`](./ORGANIZATION-DASHBOARD-API-GUIDE.md) | دليل API لوحة المنظمة (فعاليات، طلبات، تقارير، إشعارات، Check-in، …) |
| `docs/ORGANIZATION-MINIAPP-INTEGRATION.md` | ربط المنظمة + الميني أب |
| `docs/FRONTEND-CONNECTION-GUIDE.md` | عنوان الخادم، Bearer، جدول الصفحات |
| `src/utils/notificationResponse.js` | تنسيق `message` / `usersNotified` من الرد |
