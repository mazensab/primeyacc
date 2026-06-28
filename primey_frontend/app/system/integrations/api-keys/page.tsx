"use client";

/* ============================================================
   📂 primey_frontend/app/system/integrations/api-keys/page.tsx
   🧩 Mhamcloud — System Integration API Keys
   ------------------------------------------------------------
   ✅ Premium system page foundation
   ✅ Real API only: /api/system/integration-api-keys/
   ✅ List + filters + refresh + print + Excel
   ✅ Disable / enable / revoke / rotate actions
   ✅ One-time rotated secret display
   ✅ Arabic/English via primey-locale
   ✅ sonner toast
   ✅ No fake data
============================================================ */

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_PATHS } from "@/lib/api/endpoints";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type FilterValue = "all" | "ACTIVE" | "DISABLED" | "REVOKED" | "EXPIRED" | "TEST" | "LIVE";

type ApiKeyRow = {
  id: string;
  name: string;
  description: string;
  companyName: string;
  companyCode: string;
  environment: string;
  status: string;
  effectiveStatus: string;
  keyPrefix: string;
  scopes: string[];
  usageCount: number;
  lastUsedAt: string;
  expiresAt: string;
};

const translations = {
  ar: {
    badge: "التكاملات",
    title: "مفاتيح API",
    subtitle:
      "إدارة مفاتيح الربط الخارجي للشركات والجهات المتكاملة مع النظام. إنشاء المفتاح الكامل سيظهر في الخطوة التالية بعد اعتماد الواجهة.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    total: "إجمالي المفاتيح",
    active: "النشطة",
    live: "Live",
    test: "Test",
    revoked: "الملغاة",
    fromLiveApi: "من API حقيقي",
    search: "ابحث بالاسم أو الشركة أو prefix...",
    status: "الحالة",
    environment: "البيئة",
    all: "الكل",
    name: "الاسم",
    company: "الشركة",
    prefix: "Prefix",
    scopes: "الصلاحيات",
    usage: "الاستخدام",
    lastUsed: "آخر استخدام",
    expiresAt: "الانتهاء",
    actions: "الإجراءات",
    enable: "تفعيل",
    disable: "تعطيل",
    revoke: "إلغاء",
    rotate: "تدوير",
    copy: "نسخ",
    secretTitle: "المفتاح السري الجديد",
    secretWarning: "انسخ المفتاح الآن لن يظهر مرة أخرى بعد إغلاق التنبيه.",
    noData: "لا توجد مفاتيح API مطابقة.",
    copied: "تم نسخ المفتاح.",
    updated: "تم تنفيذ العملية.",
    failed: "تعذر تنفيذ العملية.",
    loadError: "تعذر تحميل مفاتيح API.",
    confirmRevoke: "هل تريد إلغاء هذا المفتاح نهائيا لا يمكن التراجع.",
    confirmRotate: "هل تريد تدوير المفتاح سيتم تعطيل المفتاح الحالي وإنشاء مفتاح جديد.",
  },
  en: {
    badge: "Integrations",
    title: "API Keys",
    subtitle:
      "Manage external integration keys for companies and third-party systems. Full key creation UI will be added in the next approved step.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    total: "Total Keys",
    active: "Active",
    live: "Live",
    test: "Test",
    revoked: "Revoked",
    fromLiveApi: "Live API",
    search: "Search by name, company, or prefix...",
    status: "Status",
    environment: "Environment",
    all: "All",
    name: "Name",
    company: "Company",
    prefix: "Prefix",
    scopes: "Scopes",
    usage: "Usage",
    lastUsed: "Last used",
    expiresAt: "Expires",
    actions: "Actions",
    enable: "Enable",
    disable: "Disable",
    revoke: "Revoke",
    rotate: "Rotate",
    copy: "Copy",
    secretTitle: "New Secret Key",
    secretWarning: "Copy this key now. It will not be shown again after closing this alert.",
    noData: "No matching API keys.",
    copied: "Key copied.",
    updated: "Action completed.",
    failed: "Action failed.",
    loadError: "Unable to load API keys.",
    confirmRevoke: "Revoke this key permanently? This cannot be undone.",
    confirmRotate: "Rotate this key? The current key will be disabled and a new key will be created.",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl(): string {
  const value = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");

  if (value.endsWith("/api")) return value.slice(0, -4);
  return value;
}

function makeApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" ? (value as ApiRecord) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return Array.isArray(record.results) ? record.results : [];
}

function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item, "")).filter(Boolean)
    : [];
}

function formatDate(value: string, locale: Locale): string {
  if (!value || value === "—") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeKey(value: unknown): ApiKeyRow {
  const item = asRecord(value);

  return {
    id: text(item.id, ""),
    name: text(item.name),
    description: text(item.description, ""),
    companyName: text(item.company_name),
    companyCode: text(item.company_code, ""),
    environment: text(item.environment),
    status: text(item.status),
    effectiveStatus: text(item.effective_status || item.status),
    keyPrefix: text(item.key_prefix),
    scopes: stringArray(item.scopes),
    usageCount: number(item.usage_count),
    lastUsedAt: text(item.last_used_at, ""),
    expiresAt: text(item.expires_at, ""),
  };
}

async function requestJson<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const method = options.method || "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["X-CSRFToken"] = decodeURIComponent(getCookie("csrftoken"));
  }

  const response = await fetch(makeApiUrl(path), {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    body: method === "GET" ? undefined : JSON.stringify(options.body || {}),
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(text(record.detail || record.message || record.error, "Request failed"));
  }

  return payload as T;
}

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toUpperCase();

  if (normalized === "ACTIVE") return "default";
  if (normalized === "REVOKED" || normalized === "EXPIRED") return "destructive";
  if (normalized === "DISABLED") return "secondary";

  return "outline";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function SystemIntegrationApiKeysPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState("");
  const [secretKey, setSecretKey] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterValue>("all");
  const [environmentFilter, setEnvironmentFilter] = React.useState<FilterValue>("all");

  React.useEffect(() => {
    setLocale(getInitialLocale());
  }, []);

  const t = translations[locale];

  const loadData = React.useCallback(async () => {
    setLoading(true);

    try {
      const payload = await requestJson<unknown>(API_PATHS.systemIntegrationApiKeys.list);
      setRows(asArray(payload).map(normalizeKey));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [row.name, row.companyName, row.companyCode, row.keyPrefix, row.environment, row.effectiveStatus]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" || row.effectiveStatus.toUpperCase() === statusFilter;

      const matchesEnvironment =
        environmentFilter === "all" || row.environment.toUpperCase() === environmentFilter;

      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [environmentFilter, rows, search, statusFilter]);

  const summary = React.useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.effectiveStatus.toUpperCase() === "ACTIVE").length,
      live: rows.filter((row) => row.environment.toUpperCase() === "LIVE").length,
      test: rows.filter((row) => row.environment.toUpperCase() === "TEST").length,
      revoked: rows.filter((row) => row.effectiveStatus.toUpperCase() === "REVOKED").length,
    };
  }, [rows]);

  const runAction = async (row: ApiKeyRow, action: "enable" | "disable" | "revoke" | "rotate") => {
    if (action === "revoke" && !window.confirm(t.confirmRevoke)) return;
    if (action === "rotate" && !window.confirm(t.confirmRotate)) return;

    setBusyId(`${action}-${row.id}`);

    try {
      const endpoint = API_PATHS.systemIntegrationApiKeys[action](row.id);
      const result = await requestJson<ApiRecord>(endpoint, {
        method: "POST",
        body: { reason: action },
      });

      if (action === "rotate") {
        setSecretKey(text(result.secret_key, ""));
      }

      toast.success(t.updated);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyId("");
    }
  };

  const copySecret = async () => {
    if (!secretKey) return;

    try {
      await navigator.clipboard.writeText(secretKey);
      toast.success(t.copied);
    } catch {
      toast.error(t.failed);
    }
  };

  const exportExcel = () => {
    const body = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.companyName)}</td>
            <td>${escapeHtml(row.companyCode)}</td>
            <td>${escapeHtml(row.environment)}</td>
            <td>${escapeHtml(row.effectiveStatus)}</td>
            <td>${escapeHtml(row.keyPrefix)}</td>
            <td>${row.usageCount}</td>
            <td>${escapeHtml(row.lastUsedAt)}</td>
            <td>${escapeHtml(row.expiresAt)}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.company)}</th>
                <th>Code</th>
                <th>${escapeHtml(t.environment)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.prefix)}</th>
                <th>${escapeHtml(t.usage)}</th>
                <th>${escapeHtml(t.lastUsed)}</th>
                <th>${escapeHtml(t.expiresAt)}</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "system-integration-api-keys.xls";
    link.click();

    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: t.total, value: summary.total, icon: KeyRound },
    { label: t.active, value: summary.active, icon: ShieldCheck },
    { label: t.live, value: summary.live, icon: CheckCircle2 },
    { label: t.test, value: summary.test, icon: Sparkles },
    { label: t.revoked, value: summary.revoked, icon: ShieldAlert },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">{t.title}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-sm leading-6">
                {t.subtitle}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.refresh}
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.exportExcel}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 text-3xl font-bold">{card.value}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{t.fromLiveApi}</p>
              </div>
              <span className="rounded-2xl bg-muted p-3">
                <card.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      {secretKey ? (
        <Card className="border-amber-300 bg-amber-50 shadow-sm dark:bg-amber-950/20">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" />
              {t.secretTitle}
            </div>
            <p className="text-sm text-muted-foreground">{t.secretWarning}</p>
            <div className="flex flex-col gap-2 rounded-2xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all text-sm">{secretKey}</code>
              <Button variant="outline" size="sm" onClick={copySecret}>
                <Copy className="h-4 w-4" />
                {t.copy}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                className="ps-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FilterValue)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label={t.status}
            >
              <option value="all">{t.all}</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
              <option value="REVOKED">REVOKED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>

            <select
              value={environmentFilter}
              onChange={(event) => setEnvironmentFilter(event.target.value as FilterValue)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label={t.environment}
            >
              <option value="all">{t.all}</option>
              <option value="TEST">TEST</option>
              <option value="LIVE">LIVE</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t.noData}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.name}</TableHead>
                    <TableHead>{t.company}</TableHead>
                    <TableHead>{t.environment}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.prefix}</TableHead>
                    <TableHead>{t.scopes}</TableHead>
                    <TableHead>{t.usage}</TableHead>
                    <TableHead>{t.lastUsed}</TableHead>
                    <TableHead>{t.expiresAt}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{row.name}</p>
                          {row.description ? <p className="text-xs text-muted-foreground">{row.description}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{row.companyName}</p>
                          <p className="text-xs text-muted-foreground">{row.companyCode}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{row.environment}</Badge></TableCell>
                      <TableCell><Badge variant={badgeVariant(row.effectiveStatus)}>{row.effectiveStatus}</Badge></TableCell>
                      <TableCell><code className="rounded bg-muted px-2 py-1 text-xs">{row.keyPrefix}</code></TableCell>
                      <TableCell>
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {row.scopes.slice(0, 3).map((scope) => (
                            <Badge key={scope} variant="secondary">{scope}</Badge>
                          ))}
                          {row.scopes.length > 3 ? <Badge variant="outline">+{row.scopes.length - 3}</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{row.usageCount}</TableCell>
                      <TableCell>{formatDate(row.lastUsedAt, locale)}</TableCell>
                      <TableCell>{formatDate(row.expiresAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.effectiveStatus.toUpperCase() === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(busyId)}
                              onClick={() => void runAction(row, "disable")}
                            >
                              <XCircle className="h-4 w-4" />
                              {t.disable}
                            </Button>
                          ) : row.effectiveStatus.toUpperCase() === "DISABLED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(busyId)}
                              onClick={() => void runAction(row, "enable")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {t.enable}
                            </Button>
                          ) : null}

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={Boolean(busyId) || row.effectiveStatus.toUpperCase() === "REVOKED"}
                            onClick={() => void runAction(row, "rotate")}
                          >
                            {busyId === `rotate-${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            {t.rotate}
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={Boolean(busyId) || row.effectiveStatus.toUpperCase() === "REVOKED"}
                            onClick={() => void runAction(row, "revoke")}
                          >
                            {busyId === `revoke-${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                            {t.revoke}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
