/* ============================================================
   primey_frontend/app/(landing)/layout.tsx
   Mhamcloud — Landing Layout
   ------------------------------------------------------------
   Approved landing layout wrapper.
   Preserves Navbar locale initialization.
   Preserves ar/en locale and rtl/ltr direction handling.
   No design or routing changes.
============================================================ */
import { cookies } from "next/headers";

import { Navbar } from "@/components/layout/navbar";

/* =========================================================
   Types
========================================================= */
type AppLocale = "ar" | "en";

/* =========================================================
   Locale Helper
========================================================= */
function normalizeLocale(value?: string | null): AppLocale {
  const normalized = (value || "").trim().toLowerCase();

  if (
    normalized === "ar" ||
    normalized.startsWith("ar-") ||
    normalized.startsWith("ar_")
  ) {
    return "ar";
  }

  return "en";
}

async function getLandingLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();

  const cookieLocale =
    cookieStore.get("lang")?.value ||
    cookieStore.get("locale")?.value ||
    cookieStore.get("NEXT_LOCALE")?.value ||
    "";

  return normalizeLocale(cookieLocale);
}
/* =========================================================
   Landing Layout
========================================================= */
export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLandingLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      lang={locale}
      dir={dir}
      className="min-h-screen bg-background text-foreground"
      suppressHydrationWarning
    >
      <Navbar initialLocale={locale} />

      <div className="relative z-0">{children}</div>
    </div>
  );
}