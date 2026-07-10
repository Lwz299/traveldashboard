# دليل API — لوحة المنظمة (Organization Dashboard)

واجهة **شركة السفر المعتمدة**: فعاليات، أنواع تذاكر، طلبات، تقارير، محفظة، إرسال إشعارات للزبائن، و**التحقق من التذاكر (Check-in)**.

**مراجع ذات صلة:** `END-USER-API-GUIDE.md` (الميني أب)، `SUPER-ADMIN-API-GUIDE.md` (إدارة المنصة والاعتماد).

---

## 1) مرجع سريع

| العنصر | القيمة |
|--------|--------|
| **Base URL (تطوير محلي)** | حسب `VITE_API_URL` أو الافتراضي في `src/config/apiEndpoint.js` |
| **Base URL (إنتاج — هذا المشروع)** | `https://api.altadumntest.com/api` |
| **تسجيل الدخول** | `POST /api/organization-accounts/login` |
| **دور JWT** | `Organization` |
| **Claims** | `orgId` (إلزامي)، `orgRole`: `OrgAdmin` \| `OrgStaff` |

تعديل **بيانات المنظمة** (الاسم، البريد، إلخ) من السوبر أدمن فقط عبر `PUT /api/organizations/{id}`.

> مسارات **قراءة إشعارات الزبون** (`GET /api/notifications/my` وغيرها) تخص **Attendee** في الميني أب — لا تُستخدم بتوكن المنظمة. المنظمة **ترسل** إشعارات للزبائن عبر `POST /api/notifications/in-app/...` أدناه.

---

## 2) المصادقة

### 2.1 تسجيل الدخول

`POST /api/organization-accounts/login`

```json
{ "email": "vendor@test.com", "password": "Password123!" }
```

```json
{
  "applicationUserId": 1,
  "organizationId": 1,
  "email": "vendor@test.com",
  "displayName": null,
  "orgRole": "OrgAdmin",
  "token": "eyJ..."
}
```

يعمل للمنظمات **Approved** فقط؛ Pending/Rejected → 401.

### 2.2 تسجيل (Register) — اختياري حسب المنتج

`POST /api/organization-accounts/register`

```json
{
  "email": "org@example.com",
  "password": "...",
  "displayName": "اسم ظاهر",
  "organizationId": null,
  "organizationName": "...",
  "organizationDescription": "...",
  "organizationEmail": "...",
  "organizationPhone": "..."
}
```

### 2.3 الحساب الحالي

`GET /api/organization-accounts/me` — Auth: `Organization`

---

## 3) بيانات المنظمة وفعالياتي

| المهمة | Method | Endpoint |
|--------|--------|----------|
| بيانات منظمتي (عرض) | GET | `/api/organizations/me` |
| فعالياتي | GET | `/api/events/organization/my-events` |

---

## 4) إدارة الفعاليات

| المهمة | Method | Endpoint |
|--------|--------|----------|
| إنشاء | POST | `/api/events` |
| تعديل | PUT | `/api/events/{id}` |
| حذف | DELETE | `/api/events/{id}` |
| تغيير الحالة | PATCH | `/api/events/{id}/status` — Body: `{ "status": "Published" }` |

### إنشاء فعالية — Body (`CreateEventDto`) مثال

```json
{
  "categoryId": 4,
  "title": "عنوان",
  "description": "اختياري",
  "locationName": "اختياري",
  "startDate": "2026-04-07T08:00:00Z",
  "endDate": "2026-04-07T22:00:00Z",
  "imageUrl": "اختياري",
  "capacity": 80,
  "price": 45000,
  "bookingDeadline": "اختياري"
}
```

---

## 5) Agenda

| المهمة | Method | Endpoint | Auth |
|--------|--------|----------|------|
| قراءة | GET | `/api/events/{id}/agenda` | عادة عام |
| إضافة بند | POST | `/api/events/{id}/agenda` | Organization |

Body إضافة (`CreateAgendaItemDto`):

```json
{
  "title": "التجمع والمغادرة",
  "description": "اختياري",
  "startTime": "2026-04-07T05:00:00Z",
  "endTime": "2026-04-07T05:30:00Z",
  "location": "بغداد"
}
```

---

## 6) أنواع التذاكر (Ticket Types)

| المهمة | Method | Endpoint |
|--------|--------|----------|
| لفعالية | GET | `/api/ticket-types/event/{eventId}` |
| إنشاء | POST | `/api/ticket-types` |
| حذف | DELETE | `/api/ticket-types/{id}` |

### إنشاء — Body مثال

```json
{
  "eventId": 12,
  "name": "عادية",
  "description": "اختياري",
  "price": 45000,
  "capacity": 64,
  "userSegmentId": null
}
```

---

## 7) طلبات المنظمة

`GET /api/orders/organization` — Auth: `Organization` — قائمة الطلبات المرتبطة بفعاليات المنظمة.

`GET /api/orders/organization/{orderId}` — Auth: `Organization` — تفاصيل طلب واحد إذا كان مرتبطاً بفعالية تخص المنظمة (نفس منطق القائمة). **يُستمد `orgId` من التوكن**؛ بدون مطالبة `orgId` يُرجع **403**. طلب غير تابع للمنظمة أو غير موجود → **404**.

> للواجهة: استخدم هذا المسار لحساب المنظمة بدل `GET /api/orders/{id}` (المخصّص لصاحب الطلب فقط).

**تعريف المسار (مرجع خادم):** `[Route("api/orders")]` + `[HttpGet("organization/{orderId:long}")]` → العنوان الكامل **`GET /api/orders/organization/{orderId}`**. نشر قديم بدون هذا المسار → **404**.

**مطالبة `orgId`:** تُضاف عند توليد التوكن مع `organizationId`؛ توكن الميني أب أو السوبر أدمن عادة بلا `orgId` → **403** على مسارات المنظمة.

### استكشاف أخطاء تفاصيل الطلب (`GET .../organization/{id}`)

| السبب | ماذا يحدث عادة |
|--------|----------------|
| **404** على مسار المنظمة | المسار غير منشور على الخادم الذي يضربه الفرونت، أو الطلب غير موجود / غير تابع للمنظمة. |
| **403** | التوكن لا يحتوي مطالبة `orgId` كما يتوقع الـ API، أو سياسة الصلاحيات ترفض الطلب. |
| **خطأ شبكة** | عنوان الـ API خاطئ، CORS، أو الخادم لا يعمل. |
| **200** لكن جسم فارغ / غير مفهوم | الاستجابة لا تطابق الشكل الذي يطبّعه `normalizeOrderDetailPayload` على الفرونت (نادر إذا كان الـ DTO سليماً). |

---

## 8) Check-in (التحقق من التذكرة)

`POST /api/tickets/verify/{qrCode}?eventId=`

Auth: `Organization`

- **Query اختياري:** `eventId` — يرفض التذكرة إن كانت لفعالية أخرى (`wrong_event`).
- النافذة الزمنية: من `StartDate - EarlyWindowMinutes` إلى `EndDate + LateGraceMinutes` (إعدادات `CheckIn` في `appsettings.json`).

### نجاح (200)

```json
{
  "success": true,
  "code": "ok",
  "message": "تم تسجيل الدخول بنجاح.",
  "checkedInAtUtc": "2026-04-07T06:30:00Z",
  "eventId": 2,
  "eventTitle": "..."
}
```

### أسباب فشل شائعة (`code`)

`ticket_not_found`, `wrong_organization`, `wrong_event`, `already_used`, `too_early`, `too_late`

> حالياً التحقق على مستوى **الفعالية** وليس جلسة منفصلة لكل بند agenda.

---

## 9) التقارير

| المهمة | Method | Endpoint |
|--------|--------|----------|
| ملخص المنظمة | GET | `/api/reports/organization-summary` |
| أداء فعالية | GET | `/api/reports/event-performance/{eventId}` |

للسوبر أدمن يمكن تمرير `?organizationId=` على ملخص المنظمة؛ للمنظمة يُستمد `orgId` من التوكن.

---

## 10) إشعارات — إرسال للزبائن (وليس قراءة قائمة الزبون)

### إرسال in-app (حسب تذاكر)

| المهمة | Method | Endpoint |
|--------|--------|----------|
| لحاجزي فعالية | POST | `/api/notifications/in-app/event/{eventId}` |
| لكل من اشترى من المنظمة | POST | `/api/notifications/in-app/organization` |

Body (`OrganizerBroadcastDto`):

```json
{ "title": "عنوان", "body": "نص" }
```

- **Header:** `Content-Type: application/json`
- **Auth:** `Organization` (يُستمد `orgId` من التوكن) أو `SuperAdmin`؛ عند السوبر أدمن أضف في الـ body: `"organizationId": <رقم المنظمة>` لمسار `/in-app/organization` فقط.

### Push لمستخدم محدد (اختياري — قد يكون لوج فقط)

`POST /api/notifications/push/{userId}` — Body: `{ "title", "message" }`

---

## 11) المحفظة والسحوبات

| المهمة | Method | Endpoint |
|--------|--------|----------|
| محفظتي (رصيد + حركات أخيرة؛ `commissionRate` = نسبة الاستقطاع وقت البيع) | GET | `/api/payouts/my-wallet` |
| حركات مترقمة | GET | `/api/payouts/wallet-transactions?skip=&take=&type=` |
| **ربح كل تذكرة** (سعر التذكرة، نسبة الاستقطاع، عمولة المنصة، صافي شركة السفر) | GET | `/api/payouts/ticket-earnings?skip=&take=` |
| طلب سحب | POST | `/api/payouts/request` — Body: `{ "amount": 100.5 }` |
| السجل | GET | `/api/payouts/history` |

> **تنفيذ الفرونت:** `wallet-transactions` و`ticket-earnings` في `src/api/financial.js` وصفحة `Wallet` عند توفر المسارات على الخادم؛ وإلا تُصفّى حركات `recentTransactions` من `my-wallet` عميلياً.

---

## 12) مستخدمو المنظمة

| المهمة | Method | Endpoint | ملاحظة |
|--------|--------|----------|--------|
| قائمة المستخدمين | GET | `/api/organization-accounts/organization/users` | |
| دعوة | POST | `/api/organization-accounts/invite` | غالباً **OrgAdmin** |
| إزالة | DELETE | `/api/organization-accounts/users/{applicationUserId}` | **OrgAdmin** |

Body دعوة مثال:

```json
{
  "email": "staff@example.com",
  "password": "اختياري_للمستخدم_الجديد",
  "displayName": "اختياري",
  "role": "OrgStaff"
}
```

---

## 13) Endpoints عامة (بدون توكن) — مرجع للواجهة

| المهمة | Method | Endpoint |
|--------|--------|----------|
| التصنيفات | GET | `/api/categories` |
| كل الفعاليات | GET | `/api/events` |
| تفاصيل فعالية | GET | `/api/events/{id}` |
| أنواع تذاكر | GET | `/api/ticket-types/event/{eventId}` |

---

## 14) تدفق مختصر

```
طلب شريك (عام) → اعتماد Super Admin → login منظمة → نشر فعاليات →
زبائن الميني أب يحجزون → طلبات المنظمة + تقارير + إشعارات مرسلة + Check-in
```
