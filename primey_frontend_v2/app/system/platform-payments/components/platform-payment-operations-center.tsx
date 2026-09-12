"use client";

import * as React from "react";
import {
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registerOutlineButtonClass } from "@/components/ui/data-register";
import { DataRegisterTableFrame } from "@/components/ui/data-register-table";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatInteger,
  type SystemLocale,
} from "@/lib/system-subscriptions";
import {
  fetchGatewayReadiness,
  fetchReconciliations,
  fetchWebhookEvents,
  reprocessSystemPlatformWebhookEvent,
  type GatewayReadinessResult,
  type ReconciliationRow,
  type WebhookEventRow,
} from "@/lib/system-platform-payment-operations";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const translations = {
  ar: {
    title: "التشغيل والتسويات",
    desc:
      "جاهزية بوابات الدفع، آخر سجلات التسوية، وأحداث Webhook التشغيلية بدون عرض أي قيم أسرار أو بيانات اعتماد.",
    refresh: "تحديث التشغيل",
    gateways: "البوابات",
    ready: "الجاهزة",
    reconciliations: "سجلات التسوية",
    webhooks: "أحداث Webhook",
    gatewayReadiness: "جاهزية بوابات الدفع",
    gatewayReadinessDesc:
      "يعرض حالة الإعداد فقط؛ لا تعرض الواجهة مفاتيح أو أسرار البوابات.",
    readyLabel: "جاهزة",
    notReadyLabel: "غير جاهزة",
    configuredChecks: "فحوصات مكتملة",
    totalChecks: "إجمالي الفحوصات",
    reconciliationTitle: "آخر سجلات التسوية",
    reconciliationDesc:
      "آخر عمليات مقارنة حالة الدفع المحلية مع مزود الدفع.",
    payment: "مرجع الدفع",
    gateway: "البوابة",
    status: "الحالة",
    localStatus: "الحالة المحلية",
    providerStatus: "حالة المزود",
    differences: "الفروقات",
    warnings: "التنبيهات",
    reconciledAt: "وقت التسوية",
    webhookTitle: "آخر أحداث Webhook",
    webhookDesc:
      "السجل التشغيلي المستلم من البوابات؛ Payload وHeaders لا تعرض في هذه الصفحة.",
    providerEvent: "مرجع الحدث",
    eventType: "نوع الحدث",
    attempts: "المحاولات",
    duplicates: "التكرارات",
    receivedAt: "وقت الاستلام",
    processedAt: "وقت المعالجة",
    noReconciliations: "لا توجد سجلات تسوية حتى الآن.",
    noWebhooks: "لا توجد أحداث Webhook حتى الآن.",
    loadError: "تعذر تحميل جزء من بيانات التشغيل.",
    refreshed: "تم تحديث بيانات التشغيل.",
    actions: "الإجراءات",
    reprocess: "إعادة معالجة",
    confirmTitle: "تأكيد إعادة المعالجة",
    confirmWebhook:
      "سيطلب النظام من Backend إعادة معالجة حدث Webhook مرة أخرى. قد يؤدي ذلك إلى تحديث حالة الدفع المرتبطة إذا نجحت المعالجة. هل تريد المتابعة؟",
    confirm: "تأكيد",
    back: "تراجع",
    reprocessed: "تمت إعادة معالجة حدث Webhook بنجاح.",
  },
  en: {
    title: "Operations & Reconciliation",
    desc:
      "Gateway readiness, recent reconciliation records, and operational webhook events without exposing credential values.",
    refresh: "Refresh operations",
    gateways: "Gateways",
    ready: "Ready",
    reconciliations: "Reconciliations",
    webhooks: "Webhook events",
    gatewayReadiness: "Payment gateway readiness",
    gatewayReadinessDesc:
      "Shows configuration state only; gateway keys and secrets are never displayed.",
    readyLabel: "Ready",
    notReadyLabel: "Not ready",
    configuredChecks: "Configured checks",
    totalChecks: "Total checks",
    reconciliationTitle: "Recent reconciliations",
    reconciliationDesc:
      "Recent comparisons between local payment state and provider state.",
    payment: "Payment reference",
    gateway: "Gateway",
    status: "Status",
    localStatus: "Local status",
    providerStatus: "Provider status",
    differences: "Discrepancies",
    warnings: "Warnings",
    reconciledAt: "Reconciled at",
    webhookTitle: "Recent webhook events",
    webhookDesc:
      "Operational gateway events; payload and headers are not displayed on this page.",
    providerEvent: "Provider event",
    eventType: "Event type",
    attempts: "Attempts",
    duplicates: "Duplicates",
    receivedAt: "Received at",
    processedAt: "Processed at",
    noReconciliations: "No reconciliation records yet.",
    noWebhooks: "No webhook events yet.",
    loadError: "Some operations data could not be loaded.",
    refreshed: "Operations data refreshed.",
    actions: "Actions",
    reprocess: "Reprocess",
    confirmTitle: "Confirm reprocess",
    confirmWebhook:
      "The backend will reprocess this webhook event. This may update the linked payment state when processing succeeds. Continue?",
    confirm: "Confirm",
    back: "Back",
    reprocessed: "Webhook event reprocessed successfully.",
  },
} as const;

function statusVariant(value: string) {
  const key = value.toLowerCase();
  if (["matched", "processed", "succeeded", "success", "ready"].includes(key)) {
    return "success";
  }
  if (["pending", "received", "processing", "retry"].includes(key)) {
    return "warning";
  }
  if (["failed", "error", "discrepancy"].includes(key)) {
    return "destructive";
  }
  return "outline";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge variant={statusVariant(value) as any}>
      {value ? value.replaceAll("_", " ") : "—"}
    </Badge>
  );
}

export function PlatformPaymentOperationsCenter({
  locale,
}: {
  locale: SystemLocale;
}) {
  const [readiness, setReadiness] =
    React.useState<GatewayReadinessResult | null>(null);
  const [reconciliations, setReconciliations] = React.useState<
    ReconciliationRow[]
  >([]);
  const [reconciliationCount, setReconciliationCount] = React.useState(0);
  const [webhooks, setWebhooks] = React.useState<WebhookEventRow[]>([]);
  const [webhookCount, setWebhookCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [partialError, setPartialError] = React.useState(false);

  const t = translations[locale];
  const session = useAuth();
  const canUpdate = hasPermission(
    session,
    PERMISSIONS.SYSTEM_SUBSCRIPTIONS_UPDATE,
  );
  const [pendingWebhookId, setPendingWebhookId] =
    React.useState<string | null>(null);
  const [mutationBusy, setMutationBusy] = React.useState(false);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setPartialError(false);

        const [gatewayResult, reconciliationResult, webhookResult] =
          await Promise.allSettled([
            fetchGatewayReadiness(),
            fetchReconciliations(),
            fetchWebhookEvents(),
          ]);

        if (gatewayResult.status === "fulfilled") {
          setReadiness(gatewayResult.value);
        } else {
          setReadiness(null);
          setPartialError(true);
        }

        if (reconciliationResult.status === "fulfilled") {
          setReconciliations(reconciliationResult.value.rows);
          setReconciliationCount(reconciliationResult.value.count);
        } else {
          setReconciliations([]);
          setReconciliationCount(0);
          setPartialError(true);
        }

        if (webhookResult.status === "fulfilled") {
          setWebhooks(webhookResult.value.rows);
          setWebhookCount(webhookResult.value.count);
        } else {
          setWebhooks([]);
          setWebhookCount(0);
          setPartialError(true);
        }

        if (silent) toast.success(t.refreshed);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  async function executeWebhookReprocess() {
    if (!pendingWebhookId) return;

    try {
      setMutationBusy(true);
      await reprocessSystemPlatformWebhookEvent(pendingWebhookId);
      toast.success(t.reprocessed);
      setPendingWebhookId(null);
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setMutationBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4 lg:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          {partialError ? (
            <p className="mt-1 text-xs text-destructive">{t.loadError}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className={registerOutlineButtonClass}
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          <span className="hidden lg:inline">{t.refresh}</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.gateways}
          value={readiness?.gatewayCount ?? 0}
          description={t.gatewayReadiness}
          icon={Gauge}
        />
        <SystemMetricCard
          title={t.ready}
          value={readiness?.readyCount ?? 0}
          description={t.gatewayReadiness}
          icon={CheckCircle2}
        />
        <SystemMetricCard
          title={t.reconciliations}
          value={reconciliationCount}
          description={t.reconciliationTitle}
          icon={ShieldCheck}
        />
        <SystemMetricCard
          title={t.webhooks}
          value={webhookCount}
          description={t.webhookTitle}
          icon={Webhook}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Gauge}>{t.gatewayReadiness}</CardTitle>
          <CardDescription>{t.gatewayReadinessDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {(readiness?.gateways ?? []).map((gateway) => {
            const completed = gateway.checks.filter(
              (check) => check.configured && check.valid,
            ).length;
            return (
              <div
                key={gateway.gateway}
                className="rounded-lg border p-4 !shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span dir="ltr" lang="en" className="font-semibold">
                    {gateway.gateway}
                  </span>
                  <Badge variant={gateway.ready ? "success" : "destructive"}>
                    {gateway.ready ? t.readyLabel : t.notReadyLabel}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t.configuredChecks}
                    </p>
                    <p
                      dir="ltr"
                      lang="en"
                      className="mt-1 font-semibold tabular-nums"
                    >
                      {formatInteger(completed)}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t.totalChecks}
                    </p>
                    <p
                      dir="ltr"
                      lang="en"
                      className="mt-1 font-semibold tabular-nums"
                    >
                      {formatInteger(gateway.checks.length)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck}>{t.reconciliationTitle}</CardTitle>
            <CardDescription>{t.reconciliationDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataRegisterTableFrame>
              <Table className="min-w-[1060px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[175px] px-4">
                      {t.payment}
                    </TableHead>
                    <TableHead className="w-[105px] px-4">
                      {t.gateway}
                    </TableHead>
                    <TableHead className="w-[120px] px-4">
                      {t.status}
                    </TableHead>
                    <TableHead className="w-[135px] px-4">
                      {t.localStatus}
                    </TableHead>
                    <TableHead className="w-[135px] px-4">
                      {t.providerStatus}
                    </TableHead>
                    <TableHead className="w-[90px] px-4">
                      {t.differences}
                    </TableHead>
                    <TableHead className="w-[90px] px-4">
                      {t.warnings}
                    </TableHead>
                    <TableHead className="w-[175px] px-4">
                      {t.reconciledAt}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.length ? (
                    reconciliations.map((row) => (
                      <TableRow
                        key={row.id}
                        href={
                          row.paymentId
                            ? `/system/platform-payments/${row.paymentId}`
                            : undefined
                        }
                      >
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en" className="font-medium">
                            {row.paymentReference}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en">{row.gateway}</span>
                        </TableCell>
                        <TableCell className="px-4">
                          <StatusBadge value={row.status} />
                        </TableCell>
                        <TableCell className="px-4">
                          <StatusBadge value={row.localStatus} />
                        </TableCell>
                        <TableCell className="px-4">
                          <StatusBadge value={row.providerStatus} />
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en" className="tabular-nums">
                            {formatInteger(row.discrepancyCount)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en" className="tabular-nums">
                            {formatInteger(row.warningCount)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span
                            dir="ltr"
                            lang="en"
                            className="tabular-nums text-muted-foreground"
                          >
                            {formatDateTime(row.reconciledAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {t.noReconciliations}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DataRegisterTableFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Webhook}>{t.webhookTitle}</CardTitle>
            <CardDescription>{t.webhookDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataRegisterTableFrame>
              <Table className="min-w-[1050px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] px-4">
                      {t.providerEvent}
                    </TableHead>
                    <TableHead className="w-[105px] px-4">
                      {t.gateway}
                    </TableHead>
                    <TableHead className="w-[170px] px-4">
                      {t.eventType}
                    </TableHead>
                    <TableHead className="w-[120px] px-4">
                      {t.status}
                    </TableHead>
                    <TableHead className="w-[120px] px-4">
                      {t.attempts}
                    </TableHead>
                    <TableHead className="w-[100px] px-4">
                      {t.duplicates}
                    </TableHead>
                    <TableHead className="w-[170px] px-4">
                      {t.receivedAt}
                    </TableHead>
                    <TableHead className="w-[170px] px-4">
                      {t.processedAt}
                    </TableHead>
                    {canUpdate ? (
                      <TableHead className="w-[150px] px-4">
                        {t.actions}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.length ? (
                    webhooks.map((row) => (
                      <TableRow
                        key={row.id}
                        href={
                          row.paymentId
                            ? `/system/platform-payments/${row.paymentId}`
                            : undefined
                        }
                      >
                        <TableCell className="px-4">
                          <span
                            dir="ltr"
                            lang="en"
                            className="block truncate font-medium"
                          >
                            {row.providerEventId}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en">{row.gateway}</span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en">{row.eventType}</span>
                        </TableCell>
                        <TableCell className="px-4">
                          <StatusBadge value={row.status} />
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en" className="tabular-nums">
                            {formatInteger(row.attemptCount)} /{" "}
                            {formatInteger(row.maxAttempts)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span dir="ltr" lang="en" className="tabular-nums">
                            {formatInteger(row.duplicateCount)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span
                            dir="ltr"
                            lang="en"
                            className="tabular-nums text-muted-foreground"
                          >
                            {formatDateTime(row.receivedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <span
                            dir="ltr"
                            lang="en"
                            className="tabular-nums text-muted-foreground"
                          >
                            {formatDateTime(row.processedAt)}
                          </span>
                        </TableCell>
                        {canUpdate ? (
                          <TableCell className="px-4">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={registerOutlineButtonClass}
                              onClick={() => setPendingWebhookId(row.id)}
                            >
                              <RotateCcw />
                              {t.reprocess}
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={canUpdate ? 9 : 8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {t.noWebhooks}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DataRegisterTableFrame>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(pendingWebhookId)}
        onOpenChange={(open) => {
          if (!open && !mutationBusy) setPendingWebhookId(null);
        }}
      >
        <AlertDialogContent dir={locale === "ar" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmWebhook}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutationBusy}>
              {t.back}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutationBusy}
              onClick={(event) => {
                event.preventDefault();
                void executeWebhookReprocess();
              }}
            >
              {mutationBusy ? <Loader2 className="animate-spin" /> : null}
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
