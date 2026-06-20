/* ============================================================
   📂 app/system/page.tsx
   🧠 PrimeyAcc | System Entry Page — Phase 5.1.2

   ✅ مدخل النظام بعد تسجيل الدخول الحقيقي
   ✅ صفحة نظيفة فوق DashboardFrame
   ✅ لا تضيف API جديد ولا تكرر منطق الباكند

   القاعدة المعتمدة:
   - /system هو مدخل النظام المحمي.
   - الصفحات التفصيلية تبنى في مراحل لاحقة.
   - لا يتم إنشاء ملفات backup.
============================================================ */

import Link from "next/link";

const entryCards = [
  {
    title: "Platform Control",
    label: "System",
    description:
      "مدخل إدارة المنصة الشركات الاشتراكات المستخدمين ومراقبة جاهزية التشغيل.",
    href: "/system",
  },
  {
    title: "Company Workspace",
    label: "Company",
    description:
      "مساحة عمليات الشركة ستبنى فوق عقود API الجاهزة بدون تكرار منطق الباكند.",
    href: "/company",
  },
  {
    title: "Agent Workspace",
    label: "Agent",
    description:
      "مساحة الوكلاء والمبيعات والعمولات سيتم تفعيلها ضمن مراحل الواجهات القادمة.",
    href: "/agent",
  },
];

export default function SystemPage() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">PrimeyAcc</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            System Workspace
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            تم تجهيز مدخل النظام ليعمل فوق تسجيل الدخول الحقيقي وجلسة الباكند.
            هذه الصفحة هي نقطة الدخول النظيفة قبل بناء صفحات النظام التفصيلية في
            المراحل التالية.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {entryCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-3xl border bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-accent hover:shadow-md"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                {card.label}
              </p>
              <h2 className="mt-2 text-xl font-bold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {card.description}
              </p>
              <span className="mt-5 inline-flex text-sm font-bold text-foreground">
                فتح المساحة
                <span className="ms-2 transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold">Phase 5.1 Status</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            تسجيل الدخول الحقيقي مفعل عبر /api/auth/csrf/ ثم /api/auth/login/
            ثم /api/auth/whoami/. مدخل /system محمي الآن بحارس مساحة العمل
            system.
          </p>
        </div>
      </section>
    </main>
  );
}