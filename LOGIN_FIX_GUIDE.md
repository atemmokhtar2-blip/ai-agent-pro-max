# دليل إصلاح مشاكل تسجيل الدخول

## المشاكل المكتشفة والحلول

### 🔴 المشكلة 1: عدم تطابق الواجهة الأمامية مع الـ Backend

**الوصف:**
- الواجهة الأمامية تعرض حقل "البريد الإلكتروني أو اسم المستخدم"
- لكن الـ Backend كان يبحث فقط عن البريد الإلكتروني
- إذا أدخل المستخدم اسم المستخدم، يفشل التسجيل بخطأ 401

**الملفات المتأثرة:**
- `artifacts/api-server/src/routes/auth.ts` (السطور 43-46 و 180-198)

**الحل المطبق:**
✅ تم تعديل `loginSchema` لقبول أي نص (بريد أو اسم مستخدم)
✅ تم تعديل استعلام البحث ليشمل البحث عن البريد الإلكتروني **أو** اسم المستخدم
✅ تم تحديث رسائل الخطأ لتكون أكثر وضوحاً

**الكود المعدل:**
```typescript
// قبل:
const loginSchema = z.object({
  email: z.string().email(),  // يقبل بريد فقط
  password: z.string().min(1),
});

// بعد:
const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني أو اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

// البحث - قبل:
const [user] = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email.toLowerCase()))
  .limit(1);

// البحث - بعد:
const [user] = await db
  .select()
  .from(usersTable)
  .where(
    or(
      eq(usersTable.email, email.toLowerCase()),
      eq(usersTable.username, email)
    )
  )
  .limit(1);
```

---

### 🔴 المشكلة 2: متغيرات البيئة الناقصة في الإنتاج

**الوصف:**
- الـ Backend يتطلب متغيرات بيئة معينة للعمل في الإنتاج:
  - `JWT_SECRET` — سر التوقيع للـ Access Tokens
  - `JWT_REFRESH_SECRET` — سر التوقيع للـ Refresh Tokens
- إذا لم تكن هذه المتغيرات معرّفة على الاستضافة، سيرمي الخادم خطأ قاتلاً

**الملفات المتأثرة:**
- `artifacts/api-server/src/lib/auth.ts` (السطور 15-36)

**الحل المطلوب:**
⚠️ **يجب على المستخدم تعيين هذه المتغيرات على منصة الاستضافة:**

**على Vercel:**
1. اذهب إلى صفحة المشروع على Vercel
2. انقر على "Settings" → "Environment Variables"
3. أضف المتغيرات التالية:

```
JWT_SECRET=<random-hex-64-chars>
JWT_REFRESH_SECRET=<random-hex-64-chars>
DATABASE_URL=<your-postgres-url>
OPENROUTER_API_KEY=<your-api-key>
ENCRYPTION_KEY=<random-hex-64-chars>
PROVIDER_ENCRYPTION_KEY=<random-hex-64-chars>
```

**لإنشاء قيم عشوائية آمنة:**
```bash
openssl rand -hex 32  # لـ JWT_SECRET و JWT_REFRESH_SECRET
```

**على منصات أخرى (Railway, Render, إلخ):**
- ابحث عن قسم "Environment Variables" أو "Secrets"
- أضف نفس المتغيرات أعلاه

---

### 🔴 المشكلة 3: رسائل الخطأ غير واضحة

**الوصف:**
- عند فشل التسجيل، كانت الرسالة عامة جداً
- لا توضح ما إذا كان الخطأ في البريد/اسم المستخدم أو كلمة المرور

**الحل المطبق:**
✅ تم تحديث رسائل الخطأ لتكون أكثر وضوحاً وتفصيلاً

---

## خطوات التشخيص

إذا استمرت مشاكل تسجيل الدخول بعد التطبيق:

### 1️⃣ تحقق من متغيرات البيئة
```bash
# على الخادم، تحقق من أن المتغيرات معرّفة:
echo $JWT_SECRET
echo $JWT_REFRESH_SECRET
echo $DATABASE_URL
```

### 2️⃣ افحص سجلات الخادم
- على Vercel: انقر على "Deployments" → اختر الـ deployment → انقر على "Logs"
- ابحث عن أي أخطاء تتعلق بـ JWT أو قاعدة البيانات

### 3️⃣ اختبر الـ API مباشرة
```bash
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 4️⃣ تحقق من قاعدة البيانات
- تأكد من أن المستخدم موجود في الجدول `users`
- تأكد من أن `isActive = true`
- تأكد من أن كلمة المرور مشفرة بشكل صحيح

---

## ملخص التعديلات

| الملف | التعديل | الحالة |
|------|--------|--------|
| `auth.ts` | السماح بالبحث عن البريد أو اسم المستخدم | ✅ تم |
| `auth.ts` | تحديث رسائل الخطأ | ✅ تم |
| `auth.ts` | إضافة استيراد `or` من drizzle-orm | ✅ تم |
| متغيرات البيئة | تعيين `JWT_SECRET` و `JWT_REFRESH_SECRET` | ⚠️ يدوي |

---

## الخطوات التالية

1. **رفع التعديلات إلى GitHub**
   ```bash
   git add .
   git commit -m "fix: allow login with username or email, improve error messages"
   git push
   ```

2. **إعادة نشر على الاستضافة**
   - على Vercel: سيتم إعادة النشر تلقائياً عند الـ push
   - على منصات أخرى: اتبع خطوات النشر الخاصة بك

3. **اختبار التسجيل**
   - جرب تسجيل الدخول باستخدام البريد الإلكتروني
   - جرب تسجيل الدخول باستخدام اسم المستخدم
   - تحقق من رسائل الخطأ

---

## معلومات إضافية

### متغيرات البيئة المطلوبة (من replit.md)

```
DATABASE_URL          — Postgres connection string
OPENROUTER_API_KEY    — LLM API key
JWT_SECRET            — 32-byte hex secret for access tokens
JWT_REFRESH_SECRET    — 32-byte hex secret for refresh tokens
ENCRYPTION_KEY        — 32-byte hex for GitHub OAuth token encryption
PROVIDER_ENCRYPTION_KEY — 32-byte hex for AI provider key encryption
```

### الحسابات الافتراضية

- **Admin**: `atemmokhtar2@gmail.com` (استخدم "نسيت كلمة المرور" لإعادة تعيينها)
- **الدور**: `super_admin`

---

## الدعم

إذا استمرت المشاكل:
1. تحقق من سجلات الخادم
2. تأكد من أن قاعدة البيانات متصلة
3. تأكد من أن جميع متغيرات البيئة معرّفة بشكل صحيح
4. جرب إعادة النشر
