/* ============================================================
   📂 app/auth/page.tsx
   🧠 PrimeyAcc | Auth Redirect Page — Phase 5.1.2

   ✅ يحول /auth إلى /login
   ✅ يمنع بقاء مسارين مختلفين للدخول
   ✅ يحافظ على Route Structure النظيف

   القاعدة المعتمدة:
   - لا يوجد منطق تسجيل دخول داخل /auth.
   - صفحة الدخول الرسمية هي /login عبر app/(guest)/login/page.tsx.
   - لا يتم إنشاء ملفات backup داخل المشروع.
============================================================ */

import { redirect } from "next/navigation";

export default function AuthPage() {
  redirect("/login");
}