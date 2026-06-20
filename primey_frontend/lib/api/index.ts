/* ============================================================
   📂 lib/api/index.ts
   Primey Care - API Public Exports
   ------------------------------------------------------------
   ✅ تصدير موحد لكل أدوات API
   ✅ بدون أسماء Types مكسورة
   ✅ متوافق مع client / http / endpoints
   ✅ يدعم الاستيراد من @/lib/api مباشرة
============================================================ */

export * from "./client";
export * from "./http";
export * from "./errors";
export * from "./endpoints";

export type * from "@/lib/types/api";