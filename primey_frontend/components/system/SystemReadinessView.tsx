/* ============================================================
   📂 components/system/SystemReadinessView.tsx
   🧠 Mhamcloud | System Dashboard + Release Readiness — Phase 5.2.2

   ✅ لوحة النظام الحقيقية
   ✅ صفحة Release Readiness
   ✅ صفحة API Contracts
   ✅ يعتمد على backend release readiness فقط
   ✅ يستخدم lib/api.ts و sonner
   ✅ لا يلمس Phase 5.1 auth/layout/guard

   القاعدة المعتمدة:
   - لا نضيف باكند جديد.
   - لا نكرر منطق الجاهزية في الفرونت.
   - لا نكسر WorkspaceRouteGuard أو DashboardFrame.
============================================================ */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCcw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/lib/api";

type ViewMode = "dashboard" | "readiness" | "contracts";
type AnyRecord = Record<string, unknown>;

type CheckRow = {
  key: string;
  name: string;
  scope: string;
  status: string;
  message: string;
  passed: boolean;
};

type ContractRow = {
  key: string;
  name: string;
  scope: string;
  method: string;
  path: string;
  status: string;
  version: string;
};

const READINESS_ENDPOINTS = [
  "/api/system/release-readiness/",
  "/api/system/release_readiness/",
  "/api/system/release-readiness/summary/",
];

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as AnyRecord[]
    : [];
}

function text(value: unknown, fallback = "—") {
  const output = String(value ?? "").trim();
  return output || fallback;
}

function statusIsReady(status: string, explicit?: unknown) {
  if (explicit === true) return true;
  if (explicit === false) return false;

  return ["ok", "ready", "passed", "pass", "healthy", "success", "registered"].includes(
    status.toLowerCase(),
  );
}

function getRoot(payload: AnyRecord | null) {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

function normalizeChecks(root: AnyRecord): CheckRow[] {
  return asArray(root.checks).map((item, index) => {
    const status = text(
      item.status ?? item.state ?? item.result,
      item.passed === false ? "failed" : "unknown",
    );

    return {
      key: text(item.key ?? item.code ?? item.name, `check-${index}`),
      name: text(item.name ?? item.title ?? item.check ?? item.code, `Check ${index + 1}`),
      scope: text(item.scope ?? item.group ?? item.category, "system"),
      status,
      message: text(item.message ?? item.description ?? item.detail, "لا توجد تفاصيل إضافية."),
      passed: statusIsReady(status, item.passed),
    };
  });
}

function normalizeContracts(root: AnyRecord): ContractRow[] {
  const rows = new Map<string, ContractRow>();

  const addContract = (item: AnyRecord, index: number, forcedScope?: string) => {
    const method = text(item.method ?? item.http_method, "GET").toUpperCase();
    const path = text(item.path ?? item.url ?? item.endpoint, "—");
    const scope = forcedScope || text(item.scope ?? item.workspace ?? item.module, "system");
    const name = text(item.name ?? item.title ?? item.code ?? item.key, path);

    const row: ContractRow = {
      key: `${scope}:${method}:${path}:${name}:${index}`,
      name,
      scope,
      method,
      path,
      status: text(item.status ?? item.state, "registered"),
      version: text(item.version ?? item.api_version, "v1"),
    };

    rows.set(row.key, row);
  };

  asArray(root.contracts).forEach((item, index) => addContract(item, index));

  Object.entries(asRecord(root.contracts_by_scope)).forEach(([scope, value]) => {
    asArray(value).forEach((item, index) => addContract(item, index, scope));
  });

  return Array.from(rows.values());
}

function badgeClass(status: string) {
  const value = status.toLowerCase();

  if (["ok", "ready", "passed", "pass", "healthy", "success", "registered"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (["warning", "partial", "degraded"].includes(value)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (["failed", "error", "critical", "blocked"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }

  return "border-muted bg-muted/40 text-muted-foreground";
}

function statusLabel(status: string) {
  const value = status.toLowerCase();

  if (["ok", "ready", "passed", "pass", "healthy", "success"].includes(value)) return "جاهز";
  if (["warning", "partial", "degraded"].includes(value)) return "يحتاج مراجعة";
  if (["failed", "error", "critical", "blocked"].includes(value)) return "غير جاهز";

  return status === "unknown" ? "غير معروف" : status;
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${badgeClass(status)}`}>
      {label || statusLabel(status)}
    </span>
  );
}

export function SystemReadinessView({ mode }: { mode: ViewMode }) {
  const [payload, setPayload] = useState<AnyRecord | null>(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    for (const endpoint of READINESS_ENDPOINTS) {
      const result = await apiRequest<AnyRecord>(endpoint, {
        method: "GET",
        showToast: false,
      });

      if (result.ok) {
        setPayload(result.data);
        setSource(endpoint);
        setLoading(false);
        return;
      }
    }

    const message = "تعذر قراءة بيانات Release Readiness من الباكند.";
    setPayload(null);
    setSource("");
    setError(message);
    setLoading(false);
    toast.error(message);
  }

  useEffect(() => {
    void load();
  }, []);

  const root = useMemo(() => getRoot(payload), [payload]);
  const checks = useMemo(() => normalizeChecks(root), [root]);
  const contracts = useMemo(() => normalizeContracts(root), [root]);

  const releaseStatus = text(
    root.status ?? root.release_status,
    checks.length > 0 && checks.every((check) => check.passed) ? "ready" : "unknown",
  );

  const passedChecks = checks.filter((check) => check.passed).length;
  const scopes = new Set(contracts.map((contract) => contract.scope).filter(Boolean));

  const copy = {
    dashboard: {
      eyebrow: "Mhamcloud System",
      title: "لوحة النظام",
      description:
        "لوحة تشغيل حقيقية مبنية فوق Release Readiness و API Contracts القادمة من الباكند.",
    },
    readiness: {
      eyebrow: "Release Readiness",
      title: "جاهزية الإصدار",
      description:
        "عرض مباشر لفحوصات جاهزية الإصدار بدون تكرار منطق الباكند داخل الفرونت.",
    },
    contracts: {
      eyebrow: "API Contracts",
      title: "عقود API",
      description:
        "استعراض عقود API المسجلة في الباكند حسب النطاق والمسار والحالة.",
    },
  }[mode];

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-muted-foreground">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
                {copy.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusBadge status={releaseStatus} />
                {source ? (
                  <span className="rounded-full border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                    Source: {source}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center rounded-2xl border bg-background px-4 py-2 text-sm font-bold shadow-sm transition hover:bg-accent disabled:opacity-60"
              >
                <RefreshCcw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </button>

              <Link
                href="/system/release-readiness"
                className="inline-flex items-center rounded-2xl border bg-background px-4 py-2 text-sm font-bold shadow-sm transition hover:bg-accent"
              >
                <ClipboardList className="me-2 h-4 w-4" />
                الجاهزية
              </Link>

              <Link
                href="/system/api-contracts"
                className="inline-flex items-center rounded-2xl border bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <FileText className="me-2 h-4 w-4" />
                العقود
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <h2 className="font-black">تعذر التحميل</h2>
                <p className="mt-1 text-sm">{error}</p>
                <p className="mt-2 text-xs opacity-80">
                  Endpoints: {READINESS_ENDPOINTS.join(" | ")}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl border bg-card" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="حالة الإصدار" value={statusLabel(releaseStatus)} />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="فحوصات ناجحة" value={`${passedChecks}/${checks.length}`} />
              <StatCard icon={<FileText className="h-5 w-5" />} label="عقود API" value={String(contracts.length)} />
              <StatCard icon={<Server className="h-5 w-5" />} label="النطاقات" value={String(scopes.size)} />
            </div>

            {mode === "dashboard" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="آخر فحوصات الجاهزية" href="/system/release-readiness">
                  <ChecksTable checks={checks.slice(0, 6)} compact />
                </Panel>
                <Panel title="عقود API" href="/system/api-contracts">
                  <ContractsTable contracts={contracts.slice(0, 6)} compact />
                </Panel>
              </div>
            ) : null}

            {mode === "readiness" ? (
              <Panel title="فحوصات جاهزية الإصدار">
                <ChecksTable checks={checks} />
              </Panel>
            ) : null}

            {mode === "contracts" ? (
              <Panel title="عقود API المسجلة">
                <ContractsTable contracts={contracts} />
              </Panel>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-background text-primary">
        {icon}
      </div>
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="rounded-full border bg-background px-3 py-1 text-xs font-bold hover:bg-accent"
          >
            عرض الكل
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ChecksTable({
  checks,
  compact = false,
}: {
  checks: CheckRow[];
  compact?: boolean;
}) {
  if (!checks.length) {
    return (
      <div className="rounded-2xl border bg-background p-6 text-center text-sm text-muted-foreground">
        لا توجد فحوصات في payload الحالي.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-black">الفحص</th>
              <th className="px-4 py-3 text-start font-black">النطاق</th>
              <th className="px-4 py-3 text-start font-black">الحالة</th>
              {!compact ? <th className="px-4 py-3 text-start font-black">التفاصيل</th> : null}
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.key} className="border-t">
                <td className="px-4 py-3 font-bold">{check.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{check.scope}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={check.status} label={check.passed ? "ناجح" : statusLabel(check.status)} />
                </td>
                {!compact ? (
                  <td className="px-4 py-3 leading-6 text-muted-foreground">{check.message}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContractsTable({
  contracts,
  compact = false,
}: {
  contracts: ContractRow[];
  compact?: boolean;
}) {
  if (!contracts.length) {
    return (
      <div className="rounded-2xl border bg-background p-6 text-center text-sm text-muted-foreground">
        لا توجد عقود API في payload الحالي.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-black">العقد</th>
              <th className="px-4 py-3 text-start font-black">Method</th>
              <th className="px-4 py-3 text-start font-black">Path</th>
              {!compact ? <th className="px-4 py-3 text-start font-black">Status</th> : null}
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.key} className="border-t">
                <td className="px-4 py-3">
                  <p className="font-bold">{contract.name}</p>
                  {!compact ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contract.scope} · {contract.version}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex min-w-16 justify-center rounded-full border bg-background px-2.5 py-1 text-xs font-black">
                    {contract.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{contract.path}</td>
                {!compact ? (
                  <td className="px-4 py-3">
                    <StatusBadge status={contract.status} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}