# منصة قسورة للإعلانات · Qaswarah Ads Hub

منصة الفريق المركزي في قسورة القابضة لمتابعة الحملات الإعلانية والتصاميم والجدولة والإنفاق لكل الشركات، مع تقارير لكل شركة وتقرير موحّد.

> الدليل الكامل بالعربية (حساب الخدمة، مشاركة الشيت، Google OAuth، النشر على Vercel) سيُكتب في المرحلة التاسعة. هذا تشغيل سريع.

## تشغيل سريع (بدون مفاتيح Google)

```bash
npm install
cp .env.example .env.local      # اترك DATA_BACKEND=memory و AUTH_DEV_LOGIN=true
npm run init-sheets             # ينشئ كل الجداول (في ملف .data/db.json)
npm run seed                    # بيانات تجريبية
npm run dev                     # http://localhost:3000
```

ادخل بأحد الحسابات التجريبية من شاشة "دخول تجريبي":
`admin@qaswarah.test` · `manager@qaswarah.test` · `buyer@qaswarah.test` · `designer@qaswarah.test` · `viewer@qaswarah.test`

## التحويل إلى Google Sheets

في `.env.local`:

```
DATA_BACKEND=google
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=...
```

ثم `npm run init-sheets` و `npm run seed`.

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | التشغيل المحلي |
| `npm run build` | بناء نسخة الإنتاج |
| `npm test` | الاختبارات (Vitest) |
| `npm run typecheck` | فحص الأنواع |
| `npm run init-sheets` | إنشاء الجداول والأعمدة الناقصة وتنسيق صف العناوين |
| `npm run seed` | بيانات تجريبية |

## الهيكل

```
app/            الصفحات (App Router)
components/     مكونات الواجهة والتخطيط
lib/sheets/     طبقة Google Sheets (getAll, getById, insert, update, softDelete, bulkInsert, upsertMany)
lib/auth/       الأدوار والصلاحيات
lib/metrics/    حساب المؤشرات (من المجاميع، لا متوسطات)
lib/import/     استيراد ملفات Meta وغيرها
types/          مخططات Zod للجداول
scripts/        init-sheets و seed
messages/       نصوص العربية والإنجليزية
```

لتغيير ألوان الهوية: عدّل القيم في أعلى `app/globals.css`. لتغيير الشعار: استبدل `public/brand/qaswarah-logo.svg`.
