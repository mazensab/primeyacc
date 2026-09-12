import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Kind = "companies" | "users" | "subscriptions" | "payments";

type Props = {
  locale?: "ar" | "en";
  title: string;
  description?: string;
  rows: Record<string, any>[];
  kind: Kind;
  href: string;
  labels: { viewAll: string; noData: string; sar: string };
  badgeValue?: string | number;
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function nested(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return text(row.name || row.title || row.display_name || row.full_name || row.username);
}
function money(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(parsed) ? parsed : 0,
  );
}

function cleanSecondary(value: unknown) {
  const raw = text(value);
  if (!raw) return "—";
  const key = raw.toLowerCase();
  return ["none", "null", "undefined", "n/a", "na"].includes(key) ? "—" : raw;
}

function statusLabel(value: unknown, locale: "ar" | "en") {
  const raw = text(value);
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (locale === "ar") {
    const labels: Record<string, string> = {
      active: "نشط",
      inactive: "غير نشط",
      trial: "تجريبي",
      pending: "معلق",
      pending_payment: "بانتظار الدفع",
      processing: "قيد المعالجة",
      paid: "مدفوع",
      failed: "فشل",
      cancelled: "ملغي",
      canceled: "ملغي",
      expired: "منتهي",
      suspended: "موقوف",
      refunded: "مسترد",
      past_due: "متأخر السداد",
    };
    return labels[key] ?? raw;
  }
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusVariant(value: unknown) {
  const key = text(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (["active", "paid", "confirmed", "completed", "success", "succeeded", "ready"].includes(key)) {
    return "success";
  }

  if (["trial", "new", "new_order"].includes(key)) {
    return "info";
  }

  if (["expired", "cancelled", "canceled", "failed", "suspended", "blocked", "refunded", "partially_refunded"].includes(key)) {
    return "destructive";
  }

  if (["pending", "pending_payment", "payment_pending", "awaiting_payment", "processing", "processing_payment", "past_due", "overdue", "draft"].includes(key)) {
    return "warning";
  }

  return "outline";
}

export function SystemRecentCard({ locale = "en", title, description, rows, kind, href, labels, badgeValue }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {badgeValue !== undefined ? <Badge variant="outline">{badgeValue}</Badge> : null}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={href}>{labels.viewAll}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map((row, index) => {
            const company = row.company || {};
            const plan = row.plan || {};
            const primary =
              kind === "companies"
                ? text(row.name || row.display_name)
                : kind === "users"
                  ? text(row.full_name || row.name || row.username || row.email)
                  : text(row.company_name) || nested(company);
            const secondary =
              kind === "companies"
                ? text(row.company_code || row.code || row.status)
                : kind === "users"
                  ? text(row.system_role || row.role || row.email)
                  : kind === "subscriptions"
                    ? text(row.plan_name) || nested(plan)
                    : text(row.gateway || row.payment_method || row.payment_reference);
            const secondaryDisplay = cleanSecondary(secondary);
            const status = text(row.status);
            const amount = kind === "payments" ? row.amount ?? row.total_amount : null;
            return (
              <div key={String(row.id ?? index)} className="hover:bg-muted flex items-center justify-between gap-3 rounded-md border px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{primary || "—"}</div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">{secondaryDisplay}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {amount !== null ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <Image src="/currency/sar.svg" width={13} height={13} alt={labels.sar} />
                      {money(amount)}
                    </span>
                  ) : null}
                  {status ? <Badge variant={statusVariant(status) as any}>{statusLabel(status, locale)}</Badge> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">{labels.noData}</div>
        )}
      </CardContent>
    </Card>
  );
}
