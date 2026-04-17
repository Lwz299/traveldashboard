# دليل اتصال لوحة التاجر (Frontend) بالـ API

## عنوان الخادم

- المتغير: **`VITE_API_URL`**
- الافتراضي في الكود: `https://trave-gdb0b6ccfecpbahv.israelcentral-01.azurewebsites.net/api` (انظر `src/config/apiEndpoint.js`)
- عميل axios (`src/api/api.js`) يضيف `baseURL`؛ المسارات في الكود تُكتب **بدون** تكرار `/api` إذا كان `baseURL` ينتهي بـ `/api`.

### أمثلة URL كاملة

| استدعاء في الفرونت | URL الكامل النموذجي |
|--------------------|----------------------|
| `api.post("/super-admin/notifications/broadcast-all", …)` | `{VITE_API_URL}/super-admin/notifications/broadcast-all` |
| `api.post("/notifications/in-app/event/42", …)` | `{VITE_API_URL}/notifications/in-app/event/42` |
| `api.post("/notifications/in-app/organization", …)` | `{VITE_API_URL}/notifications/in-app/organization` |

يعادل ذلك المسارات تحت **`/api/...`** على الخادم عندما تكون البادئة `/api`.

---

## التوثيق (Bearer)

- يُخزَّن التوكن في `localStorage` بعد تسجيل الدخول.
- **اعتراض الطلبات** يضيف تلقائياً: `Authorization: Bearer <token>`

| نوع المستخدم | مسار الدخول في الفرونت | استخدام التوكن |
|----------------|-------------------------|----------------|
| منظمة | `/login` → `POST /organization-accounts/login` | JWT منظمة / `orgId` — مسارات المنظمة والإشعارات in-app |
| سوبر أدمن | `/admin/login` → `POST /super-admin/login` | مسارات `/super-admin/...` بما فيها `broadcast-all` |

عند **401** يُفرَّغ التخزين ويُعاد التوجيه لصفحة الدخول المناسبة.

---

## صفحات الإشعارات في هذا المشروع

| الصفحة | المسار في الفرونت | استدعاءات API |
|--------|-------------------|----------------|
| إشعار جماعي (سوبر أدمن — **كل المنصة**) | `/admin/notifications` | `POST .../super-admin/notifications/broadcast-all` — جسم `{ title, body }`؛ سجلات `UserNotifications`، نوع `platform_announcement` |
| إشعارات للزبائن (منظمة) | `/attendees` | `POST .../notifications/in-app/event/{eventId}` و `POST .../notifications/in-app/organization` — جسم `{ title, body }` |

**لا** يُستدعي هذا المشروع مسارات **`mass-email`**؛ أُزيلت من الـ API (انظر الجدول أدناه).

---

## تنسيق رد الإشعارات

- الملف: `src/utils/notificationResponse.js`
- الدالة: **`formatNotifyResponse(data)`** — تدعم `message` / `Message` و `usersNotified` / `UsersNotified`.

---

## النتيجة العملية (ملخص)

| السابق | الحالي |
|--------|--------|
| مسارات بريد جماعي | **لا توجد** في الـ API لهذا الغرض |
| — | الإرسال للزبائن عبر **`UserNotifications` فقط** (منظمة: حسب فعالية أو كل المنظمة؛ سوبر أدمن: للجميع النشطين) |
| — | **`POST .../notifications/push/{userId}`** ما زال للوج / تمهيد FCM وليس بريداً |

---

## بيئة التطوير

```bash
npm install
npm run dev
```

ضبط `.env` أو `.env.local`:

```env
VITE_API_URL=https://your-api-host/api
```

---

## مستندات إضافية

- `docs/API-REPORT.md` — جدول المسارات والتفاصيل.
- `docs/ORGANIZATION-MINIAPP-INTEGRATION.md` — الميني أب والمنظمة.
- [`docs/SUPER-ADMIN-API-GUIDE.md`](./SUPER-ADMIN-API-GUIDE.md) — دليل API السوبر أدمن (شركاء، تقارير، سحوبات، بث إشعارات، …).
- [`docs/ORGANIZATION-DASHBOARD-API-GUIDE.md`](./ORGANIZATION-DASHBOARD-API-GUIDE.md) — دليل API لوحة المنظمة (JWT، فعاليات، تذاكر، تقارير، محفظة، إشعارات in-app، تحقق QR، …).
