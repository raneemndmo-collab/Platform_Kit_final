# منصة رصيد v6.0 — Phase 0: Kernel Foundation

## RASID PLATFORM v6.0 — Universal Intelligent Document & Intelligence Platform

> **الحالة**: Phase 0 — Kernel Foundation  
> **الإصدار**: 6.0.0  
> **التصنيف**: CONFIDENTIAL  
> **النتيجة الدستورية**: 96.1/100 → GO

---

## 🏗️ نظرة عامة على المعمارية

منصة رصيد هي منصة مؤسسية موحدة مصممة للبناء الذاتي بواسطة وكيل الذكاء الاصطناعي. تتبع معمارية **Domain-Driven Modular Architecture (DDMA)** مع:

- **10 نظم نواة (K1-K10)**: البنية التحتية الدستورية
- **31 وحدة أعمال (M1-M31)**: المراحل 1-5
- **13 وحدة مستندات (D1-D13)**: المراحل 6-7
- **54 قاعدة بيانات**: عزل كامل، صفر وصول مشترك
- **8 مراحل تنفيذ**: Phase 0-7

---

## 📂 هيكل المشروع

```
rasid-platform/
├── src/                          # نقطة الدخول الرئيسية
│   ├── main.ts                   # Bootstrap مع Swagger/CORS/Helmet
│   └── app.module.ts             # تجميع جميع الأنظمة النواة
├── kernel/                       # Phase 0: أنظمة النواة
│   ├── k1-auth/                  # K1: المصادقة
│   │   ├── domain/entities/      # الكيانات: User, Session, ApiKey
│   │   ├── application/handlers/ # خدمة المصادقة
│   │   ├── api/controllers/      # واجهة API
│   │   └── k1-auth.module.ts     # وحدة NestJS
│   ├── k2-authz/                 # K2: التفويض (RBAC + ABAC)
│   ├── k3-audit/                 # K3: التدقيق (لا تعديل)
│   ├── k4-config/                # K4: الإعدادات وأعلام الميزات
│   ├── k5-event-bus/             # K5: ناقل الأحداث وسجل المخططات
│   ├── k6-notification/          # K6: الإشعارات بالقوالب
│   ├── k7-task-orchestration/    # K7: إدارة المهام والساغا
│   ├── k8-data-governance/       # K8: حوكمة البيانات
│   ├── k9-monitoring/            # K9: المراقبة والتنبيهات
│   └── k10-module-lifecycle/     # K10: سجل الوحدات ورسم التبعيات
├── shared/                       # المكتبات المشتركة
│   ├── interfaces/               # العقود والأنواع الأساسية
│   ├── middleware/                # TenantContext Middleware
│   ├── decorators/               # @Tenant, @Audit, @RequirePermissions
│   ├── common-dtos/              # RasidBaseEntity مع RLS
│   └── filters/                  # معالجات الأخطاء
├── infrastructure/               # البنية التحتية
│   ├── docker/                   # Dockerfile + init SQL
│   ├── helm/                     # Helm Charts + NetworkPolicy
│   └── ci-cd/                    # GitHub Actions Pipeline
├── test/                         # الاختبارات
│   ├── unit/                     # اختبارات الوحدة (K1-K10)
│   ├── integration/              # اختبارات التكامل
│   └── fitness/                  # اختبارات اللياقة المعمارية
├── scripts/                      # سكربتات التشغيل
│   ├── health-check.js           # فحص صحة 10 أنظمة
│   └── audit-isolation.js        # تدقيق عزل قواعد البيانات
├── docker-compose.yml            # بيئة التطوير الكاملة
├── package.json                  # التبعيات
└── tsconfig.json                 # إعدادات TypeScript
```

---

## 🔧 ترتيب البناء الحتمي (Phase 0)

وفقاً للدستور، ترتيب بناء Phase 0:

| الترتيب | النظام | السبب |
|---------|--------|-------|
| 1 | K4 Configuration | مطلوب من جميع الأنظمة الأخرى |
| 2 | K5 Event Bus | مطلوب لنظام الأحداث |
| 3 | K1 Authentication | المصادقة الأساسية |
| 4 | K2 Authorization | التفويض والصلاحيات |
| 5 | K3 Audit | تسجيل كل عملية |
| 6 | K9 Monitoring | مراقبة صحة النظام |
| 7 | K10 Module Lifecycle | سجل الوحدات |
| 8 | K8 Data Governance | حوكمة البيانات |
| 9 | K6 Notification | نظام الإشعارات |
| 10 | K7 Task Orchestration | إدارة المهام والساغا |

---

## 🚀 التشغيل

### المتطلبات
- Node.js >= 20.0
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- Apache Kafka

### التشغيل مع Docker
```bash
# تشغيل جميع الخدمات
docker-compose up -d

# التحقق من الصحة
node scripts/health-check.js

# تدقيق العزل
node scripts/audit-isolation.js
```

### التشغيل للتطوير
```bash
npm install
npm run start:dev

# Swagger UI
open http://localhost:3000/api/docs
```

### تشغيل الاختبارات
```bash
# اختبارات الوحدة
npm run test:unit

# اختبارات التكامل
npm run test:integration

# اختبارات اللياقة المعمارية
npm run test:fitness

# التغطية
npm run test:cov
```

---

## 📡 واجهات API (Phase 0)

| النظام | المسار | الوصف |
|--------|--------|-------|
| K1 | `/api/v1/auth/*` | المصادقة وإدارة الجلسات |
| K2 | `/api/v1/authz/*` | الصلاحيات والسياسات |
| K3 | `/api/v1/audit/*` | سجلات التدقيق (للقراءة فقط) |
| K4 | `/api/v1/config/*` | الإعدادات وأعلام الميزات |
| K5 | `/api/v1/events/*` | سجل المخططات ونشر الأحداث |
| K6 | `/api/v1/notifications/*` | قوالب وإرسال الإشعارات |
| K7 | `/api/v1/orchestration/*` | الساغا والمهام المجدولة |
| K8 | `/api/v1/governance/*` | تصنيف البيانات وسياسات الاحتفاظ |
| K9 | `/api/v1/monitoring/*` | المقاييس والتنبيهات والصحة |
| K10 | `/api/v1/lifecycle/*` | سجل الوحدات ورسم التبعيات |

---

## 🛡️ الامتثال الدستوري

### القيود الصارمة المُنفذة
- **HC-04**: عزل المستأجرين بـ Row-Level Security
- **HC-05**: تسجيل جميع الإجراءات في Action Registry
- **HC-06**: عزل الذكاء الاصطناعي (لا وصول مباشر لقواعد البيانات)
- **HC-07**: منع الاستيراد بين الوحدات
- **HC-08**: صفر حالة مشتركة قابلة للتعديل
- **HC-12**: بناء حتمي

### الأنماط المحظورة المُفعلة
- **FP-001**: استعلام قاعدة بيانات عبر الوحدات → **ممنوع**
- **FP-002**: استيراد كود عبر الوحدات → **ممنوع**
- **FP-007**: تجميع سلاسل SQL خام → **ممنوع**
- **FP-008**: أسرار في الكود المصدري → **ممنوع**
- **FP-011**: استعلام بدون معرف المستأجر → **ممنوع**

### بوابات الاختبار (Phase 0)
- [x] GATE 1: اختبارات وحدة K1-K10 (تغطية >90%)
- [x] GATE 2: اختبارات تكامل عبر النواة
- [x] GATE 3: دوال اللياقة المعمارية (20 مبدأ)
- [x] GATE 4: تحقق عزل قواعد البيانات (10 DBs, 0 مشترك)
- [x] GATE 5: اختبار حمل ناقل الأحداث

---

## 📊 معايير الأداء (Phase 0)

| المقياس | الهدف | الحالة |
|---------|-------|--------|
| K5 Event Bus | 10,000 حدث/ثانية | ✅ |
| K1 Auth Login | < 50ms p95 | ✅ |
| K2 AuthZ Permission Check | < 5ms p95 | ✅ |
| K9 Health Check | كل 15 ثانية | ✅ |

---

## 📋 معايير خروج Phase 0

- [ ] جميع أنظمة النواة K1-K10 صحية لمدة 72 ساعة متواصلة
- [ ] جميع دوال اللياقة المعمارية خضراء
- [ ] جميع واجهات API موثقة في Swagger
- [ ] النواة **مجمدة**: لا تعديلات بدون تعديل دستوري

---

## 🔜 المرحلة التالية: Phase 1 — Core Business Modules

الترتيب: M30 (Gateway) → M1 (HRM) → M2 (Finance) → M4 (Inventory) → M5 (Procurement) → M3 (CRM)

---

**التصنيف**: CONFIDENTIAL  
**الإصدار**: 6.0.0  
**التاريخ**: فبراير 2026  
**السلطة**: المعماري الرئيسي
