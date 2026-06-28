"use client";

/* ============================================================
   📂 primey_frontend/app/system/integrations/page.tsx
   🧩 Mhamcloud — System Integrations Center
   ------------------------------------------------------------
   ✅ Premium system page foundation
   ✅ Real API only: GET /api/system/integration-api-keys/
   ✅ Arabic/English via primey-locale
   ✅ sonner toast
============================================================ */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { API_PATHS } from "@/lib/api/endpoints";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

const copy = {
  ar: {
    badge: "التكاملات",
    title: "مركز التكاملات",
    subtitle: "وحدة مستقلة لإدارة الربط الخارجي عقود API ومفاتيح التكامل.",
    refresh: "تحديث",
    keys: "مفاتيح API",
    contracts: "عقود API",
    readiness: "جاهزية الإصدار",
    total: "إجمالي المفاتيح",
    active: "المفاتيح النشطة",
    live: "مفاتيح Live",
    test: "مفاتيح Test",
    open: "فتح",
    liveApi: "من API حقيقي",
    failed: "تعذر تحميل بيانات التكاملات.",
  },
  en: {
    badge: "Integrations",
    title: "Integrations Center",
    subtitle: "A dedicated module for external connectivity, API contracts, and integration keys.",
    refresh: "Refresh",
    keys: "API Keys",
    contracts: "API Contracts",
    readiness: "Release Readiness",
    total: "Total Keys",
    active: "Active Keys",
    live: "Live Keys",
    test: "Test Keys",
    open: "Open",
    liveApi: "Live API",
    failed: "Unable to load integrations data.",
  },
} as const;

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function apiBase(): string {
  const value = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" ? (value as ApiRecord) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return Array.isArray(record.results) ? record.results : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(text(asRecord(payload).detail) || "Request failed");
  return payload;
}

export default function SystemIntegrationsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ApiRecord[]>([]);

  React.useEffect(() => setLocale(getLocale()), []);

  const t = copy[locale];

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getJson(API_PATHS.systemIntegrationApiKeys.list);
      setRows(asArray(payload).map(asRecord));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failed);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t.failed]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = React.useMemo(() => {
    const env = (name: string) => rows.filter((row) => text(row.environment).toUpperCase() === name).length;
    const active = rows.filter((row) => text(row.effective_status || row.status).toUpperCase() === "ACTIVE").length;

    return {
      total: rows.length,
      active,
      live: env("LIVE"),
      test: env("TEST"),
    };
  }, [rows]);

  const cards = [
    { label: t.total, value: summary.total, icon: KeyRound },
    { label: t.active, value: summary.active, icon: ShieldCheck },
    { label: t.live, value: summary.live, icon: Sparkles },
    { label: t.test, value: summary.test, icon: FileText },
  ];

  const links = [
    { title: t.keys, href: "/system/integrations/api-keys", icon: KeyRound },
    { title: t.contracts, href: "/system/integrations/api-contracts", icon: FileText },
    { title: t.readiness, href: "/system/release-readiness", icon: ShieldCheck },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">{t.title}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">{t.subtitle}</CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t.refresh}
          </Button>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/70 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 text-3xl font-bold">{card.value}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{t.liveApi}</p>
              </div>
              <span className="rounded-2xl bg-muted p-3">
                <card.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {links.map((item) => (
          <Card key={item.href} className="border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-muted p-3">
                  <item.icon className="h-5 w-5" />
                </span>
                <p className="font-semibold">{item.title}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={item.href}>
                  {t.open}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
