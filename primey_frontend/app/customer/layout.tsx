"use client";

/* ============================================================
   📂 app/customer/layout.tsx
   🧭 Primey Care | Customer Unified Workspace Layout
   ------------------------------------------------------------
   ✅ يستخدم نفس Shell النظام الموحد
   ✅ AuthProvider موحد
   ✅ SidebarProvider موحد
   ✅ AppSidebar موحد مع type="customer"
   ✅ SiteHeader الموحد
   ✅ لا ينشئ سايدر أو هيدر خاص بالعميل
   ✅ يترك NavMain/NavUser/AuthProvider يحددون بيانات وروابط العميل
   ✅ متوافق مع فصل المساحات: system / provider / customer / agent
   ✅ بدون html/body لأن RootLayout مسؤول عنها
   ✅ بدون تصميم مستقل
============================================================ */

import type { ReactNode } from "react";
import { useEffect } from "react";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

type AppLocale = "ar" | "en";

function readStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");

    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale) {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";

    if (document.body) {
      document.body.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    }
  } catch {
    // لا نكسر الواجهة بسبب فشل مزامنة اللغة.
  }
}

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readStoredLocale();
      applyDocumentLocale(nextLocale);
    };

    syncLocale();

    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar type="customer" />

        <SidebarInset>
          <SiteHeader />

          <div className="w-full flex-1 space-y-4 p-3 md:p-4 xl:p-5">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}