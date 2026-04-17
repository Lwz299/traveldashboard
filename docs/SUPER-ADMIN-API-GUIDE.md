# دليل API — المدير العام (Super Admin)

واجهة **إدارة المنصة**: اعتماد الشركاء، التصنيفات، التقارير المركزية، تعديل المنظمات والفعاليات عالمياً، اعتماد السحوبات، وإشعار **جميع** مستخدمي الميني أب.

**مراجع ذات صلة:** `END-USER-API-GUIDE.md` (الميني أب — غالباً خارج هذا المستودع)، [`ORGANIZATION-DASHBOARD-API-GUIDE.md`](./ORGANIZATION-DASHBOARD-API-GUIDE.md) (لوحة المنظمة).

**في هذا المستودع (لوحة الفرونت):** [`API-REPORT.md`](./API-REPORT.md) (إشعارات)، [`FRONTEND-CONNECTION-GUIDE.md`](./FRONTEND-CONNECTION-GUIDE.md) (الاتصال).

---

## 1) مرجع سريع

| العنصر | القيمة |
|--------|--------|
| **Base URL (الواجهة الافتراضية في المشروع)** | `https://trave-gdb0b6ccfecpbahv.israelcentral-01.azurewebsites.net/api` (أو `VITE_API_URL`) |
| **تسجيل الدخول** | `POST /api/super-admin/login` |
| **دور JWT** | `SuperAdmin` |
| **Header** | `Authorization: Bearer <token>` |

لا يوجد `orgId` في توكن السوبر أدمن.

---

## 2) تسجيل الدخول

`POST /api/super-admin/login`

```json
{ "email": "superadmin@system.com", "password": "SuperAdmin123!" }
```

```json
{
  "applicationUserId": 3,
  "email": "superadmin@system.com",
  "displayName": "Super Admin",
  "token": "eyJ..."
}
```

---

## 3) انضمام شريك جديد (من الواجهة العامة — بدون توكن)

`POST /api/partner-applications/apply`

```json
{
  "email": "company@example.com",
  "password": "Password123!",
  "displayName": "مدير الشركة",
  "organizationName": "شركة سياحة XYZ",
  "organizationDescription": "وصف",
  "organizationEmail": "info@company.com",
  "organizationPhone": "+964...",
  "documents": [
    {
      "documentType": "CommercialLicense",
      "fileUrl": "https://...",
      "originalFileName": "license.pdf"
    }
  ]
}
```

```json
{
  "organizationId": 1,
  "status": "Pending",
  "message": "تم إرسال طلبك بنجاح..."
}
```

بعدها السوبر أدمن يعتمد أو يرفض من الأقسام التالية.

---

## 4) إدارة طلبات الشراكة

| المهمة | Method | Endpoint |
|--------|--------|----------|
| المعلقة | GET | `/api/partner-applications/pending` |
| الكل | GET | `/api/partner-applications` |
| تفاصيل | GET | `/api/partner-applications/{organizationId}` |
| اعتماد | POST | `/api/partner-applications/{organizationId}/approve` |
| رفض | POST | `/api/partner-applications/{organizationId}/reject` — Body: `{ "reason": "..." }` |

Auth: `SuperAdmin` للمسارات أعلاه (ما عدا `apply`).

---

## 5) المنظمات

| المهمة | Method | Endpoint |
|--------|--------|----------|
| قائمة كل المنظمات | GET | `/api/super-admin/organizations` |
| **ملخص مالي لكل شركة** (رصيد المحفظة، `commissionRate` الحالية، إجمالي المبيعات، عمولة المنصة من حركات المبيعات، صافي المنظمة من المبيعات) | GET | `/api/super-admin/organizations/financial-overview` |
| تعديل نسبة عمولة المنصة لمنظمة | PUT | `/api/super-admin/organizations/{id}/commission-rate` — Body: `{ "commissionRate": 0.05 }` (القيمة بين 0 و 1، مثلاً `0.03` = 3٪) |
| تعديل بيانات منظمة | PUT | `/api/organizations/{id}` |

**محفظة المنصة (ماركت بليس):** جدول `PlatformWallets` صف واحد (`Id = 1`) يجمع **عمولة/أجور الخدمة** من كل بيع. تُحدَّث تلقائياً مع كل دفع واسترداد.

| المهمة | Method | Endpoint |
|--------|--------|----------|
| رصيد محفظة الماركت بليس + مطابقة مجموع الحركات | GET | `/api/super-admin/platform-wallet` |
| حركات محفظة المنصة (مع `organizationId` لمعرفة مصدر العمولة) | GET | `/api/super-admin/platform-wallet/transactions?skip=&take=` |

في `financial-overview` الحقل **`marketplacePlatformFeeAccrued`** = صافي عمولة المنصة المسجّلة لهذه الشركة في محفظة الماركت بليس.

لا حاجة لإنشاء محفظة يدوياً: محفظة كل شركة (`OrganizationWallet`) تُنشأ عند أول دفع ناجح؛ محفظة المنصة تُبنى بالترحيل + أول عملية دفع. **رصيد شركة السفر** قد يقل عن صافي المبيعات بسبب السحوبات.

---

## 6) التصنيفات (عالمية)

| المهمة | Method | Endpoint |
|--------|--------|----------|
| القائمة (بما فيها المعطّلة) | GET | `/api/super-admin/categories` |
| إنشاء | POST | `/api/super-admin/categories` |
| تعديل | PUT | `/api/super-admin/categories/{id}` |
| حذف | DELETE | `/api/super-admin/categories/{id}` |

> قد تتوفر مسارات مكررة تحت `/api/categories` لدور SuperAdmin — راجع الكود عند التنفيذ.

---

## 7) التقارير المركزية

| المهمة | Method | Endpoint |
|--------|--------|----------|
| ملخص المنصة | GET | `/api/super-admin/reports/global-summary` |
| مقارنة المنظمين | GET | `/api/super-admin/reports/organization-comparison` |
| ملخص منظمة محددة | GET | `/api/reports/organization-summary?organizationId={id}` |

---

## 8) الرقابة على الفعاليات (أي منظمة)

| المهمة | Method | Endpoint |
|--------|--------|----------|
| تعديل فعالية | PUT | `/api/events/{id}` |
| حالة الفعالية | PATCH | `/api/events/{id}/status` |
| حذف | DELETE | `/api/events/{id}` |

---

## 9) الإشراف المالي (السحوبات)

| المهمة | Method | Endpoint |
|--------|--------|----------|
| الطلبات المعلقة | GET | `/api/payouts/pending` |
| اعتماد سحب | POST | `/api/payouts/approve/{id}` |

---

## 10) إشعار لجميع مستخدمي الميني أب

`POST /api/super-admin/notifications/broadcast-all`

Body:

```json
{ "title": "عنوان", "body": "نص الإشعار" }
```

يُنشئ إشعارات in-app لجميع المستخدمين النشطين (تظهر في `GET /api/notifications/my` للزبون).

---

## 11) تدفق المنصة

```
شركة جديدة → POST .../partner-applications/apply  (Pending)
       ↓
Super Admin → login → pending → approve / reject
       ↓
Approved → المنظمة تسجّل دخول Organization → تدير الفعاليات
```

---

## 12) حسابات تجريبية (مثال — راجع `seed-credentials` في المشروع)

| الدور | البريد | كلمة المرور |
|------|--------|-------------|
| منظمة | vendor@test.com | Password123! |
| Super Admin | superadmin@system.com | SuperAdmin123! |

لا تُرفع أسرار الإنتاج إلى المستودع.

---

## 13) CORS والتوكن

- خزّن التوكن بعد تسجيل الدخول.
- أرفق `Authorization: Bearer` على كل طلب محمٍ.

---

## 14) خارطة صلاحيات المدير العام (مرجع)

| المجال | أمثلة |
|--------|--------|
| الشركاء | مراجعة الطلبات، الاعتماد/الرفض |
| المحتوى | تصنيفات، تعديل/حذف فعاليات أي منظمة |
| المالي | اعتماد طلبات السحب، ملخص مالي للشركات، تعديل نسبة العمولة، محفظة المنصة وحركاتها |
| التحليلات | تقارير مركزية ومقارنة المنظمين |
| الإشعارات | بث عام لجميع مستخدمي الميني أب |
