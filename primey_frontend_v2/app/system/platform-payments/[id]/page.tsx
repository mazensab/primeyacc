"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CreditCard,
  FileClock,
  FileText,
  Gauge,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TableProperties,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
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
  MoneyValue,
  readSystemLocale,
} from "@/lib/system-subscriptions";
import {
  fetchSystemPlatformPaymentDetail,
  PlatformPaymentStatusBadge,
  type SystemLocale,
  type SystemPlatformPaymentDetail,
} from "@/lib/system-platform-payments";
import { reconcileSystemPlatformPayment } from "@/lib/system-platform-payment-operations";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const translations = {
  ar: {
    title: "تفاصيل عملية الدفع",
    subtitle:
      "البيانات التشغيلية والمالية للعملية مع الشركة والاشتراك والمزود والأحداث والاستردادات والتعديلات.",
    back: "العودة لمدفوعات المنصة",
    refresh: "تحديث",
    attempt: "رقم المحاولة",
    events: "الأحداث",
    refunds: "الاستردادات",
    adjustments: "التعديلات",
    linkedDesc: "من سجل عملية الدفع الحالية",
    identityTitle: "هوية عملية الدفع",
    identityDesc: "المرجع والحالة والمبلغ والبوابة ومراجع المزود والفوترة.",
    linksTitle: "السجلات المرتبطة",
    linksDesc: "الشركة والاشتراك والباقة ومستندات الفوترة المرتبطة.",
    lifecycleTitle: "دورة حياة الدفع",
    lifecycleDesc: "التواريخ التشغيلية المسجلة للعملية.",
    financialTitle: "الملخص المالي",
    financialDesc:
      "القيمة المدفوعة والاستردادات المحجوزة والناجحة والمتبقي القابل للاسترداد.",
    reference: "مرجع الدفع",
    status: "الحالة",
    amount: "المبلغ",
    gateway: "البوابة",
    method: "طريقة الدفع",
    providerReference: "مرجع المزود",
    transactionReference: "مرجع العملية",
    billingReference: "مرجع الفوترة",
    company: "الشركة",
    subscription: "الاشتراك",
    plan: "الباقة",
    invoice: "الفاتورة",
    receipt: "الإيصال",
    initiatedAt: "بدء العملية",
    processingAt: "بدء المعالجة",
    paidAt: "تاريخ الدفع",
    failedAt: "تاريخ الفشل",
    cancelledAt: "تاريخ الإلغاء",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    failure: "سبب الفشل",
    cancellation: "سبب الإلغاء",
    paidAmount: "قيمة العملية",
    successfulRefunded: "الاسترداد الناجح",
    reservedRefund: "الاسترداد المحجوز",
    remainingRefundable: "المتبقي القابل للاسترداد",
    eventsTitle: "أحداث عملية الدفع",
    eventsDesc: "السجل الزمني التشغيلي الذي أعاده Backend للعملية.",
    eventType: "نوع الحدث",
    transition: "الانتقال",
    message: "الرسالة",
    refundsTitle: "سجل الاستردادات",
    refundsDesc: "الاستردادات المرتبطة بعملية الدفع الحالية.",
    refundReference: "مرجع الاسترداد",
    providerRefund: "مرجع المزود",
    reason: "السبب",
    refundedAt: "تاريخ الاسترداد",
    adjustmentsTitle: "التعديلات المالية",
    adjustmentsDesc: "التعديلات المالية المسجلة على عملية الدفع.",
    adjustmentReference: "مرجع التعديل",
    type: "النوع",
    accountingReference: "المرجع المحاسبي",
    postedAt: "تاريخ الترحيل",
    reversedAt: "تاريخ العكس",
    noEvents: "لا توجد أحداث مسجلة لهذه العملية.",
    noRefunds: "لا توجد استردادات مرتبطة بهذه العملية.",
    noAdjustments: "لا توجد تعديلات مالية مرتبطة بهذه العملية.",
    none: "غير متوفر",
    error: "تعذر تحميل تفاصيل عملية الدفع",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل عملية الدفع.",
    operationsTitle: "إجراءات التشغيل",
    operationsDesc:
      "الإجراءات التشغيلية متاحة فقط لمن يملك صلاحية تحديث الاشتراكات، ويؤكد النظام قبل التنفيذ.",
    reconcile: "تشغيل التسوية",
    reconcileHint:
      "يقارن Backend العملية المحلية مع مزود الدفع ويسجل نتيجة تسوية جديدة.",
    confirmTitle: "تأكيد تشغيل التسوية",
    confirmReconcile:
      "قد يتصل النظام بمزود الدفع ويسجل نتيجة تسوية جديدة لهذه العملية. هل تريد المتابعة؟",
    confirm: "تأكيد",
    backAction: "تراجع",
    reconciled: "تم تشغيل التسوية بنجاح.",
  },
  en: {
    title: "Payment Details",
    subtitle:
      "Operational and financial payment data with company, subscription, provider, events, refunds, and adjustments.",
    back: "Back to platform payments",
    refresh: "Refresh",
    attempt: "Attempt",
    events: "Events",
    refunds: "Refunds",
    adjustments: "Adjustments",
    linkedDesc: "From the current payment record",
    identityTitle: "Payment identity",
    identityDesc:
      "Reference, status, amount, gateway, provider, transaction, and billing references.",
    linksTitle: "Linked records",
    linksDesc: "Linked company, subscription, plan, and billing documents.",
    lifecycleTitle: "Payment lifecycle",
    lifecycleDesc: "Operational timestamps recorded for this payment.",
    financialTitle: "Financial summary",
    financialDesc:
      "Payment value, successful/reserved refunds, and remaining refundable amount.",
    reference: "Payment reference",
    status: "Status",
    amount: "Amount",
    gateway: "Gateway",
    method: "Payment method",
    providerReference: "Provider reference",
    transactionReference: "Transaction reference",
    billingReference: "Billing reference",
    company: "Company",
    subscription: "Subscription",
    plan: "Plan",
    invoice: "Invoice",
    receipt: "Receipt",
    initiatedAt: "Initiated at",
    processingAt: "Processing at",
    paidAt: "Paid at",
    failedAt: "Failed at",
    cancelledAt: "Cancelled at",
    createdAt: "Created at",
    updatedAt: "Updated at",
    failure: "Failure",
    cancellation: "Cancellation",
    paidAmount: "Payment amount",
    successfulRefunded: "Successful refunded",
    reservedRefund: "Reserved refund",
    remainingRefundable: "Remaining refundable",
    eventsTitle: "Payment events",
    eventsDesc: "Operational event history returned by the backend.",
    eventType: "Event type",
    transition: "Transition",
    message: "Message",
    refundsTitle: "Refund history",
    refundsDesc: "Refunds linked to the current payment.",
    refundReference: "Refund reference",
    providerRefund: "Provider reference",
    reason: "Reason",
    refundedAt: "Refunded at",
    adjustmentsTitle: "Financial adjustments",
    adjustmentsDesc: "Financial adjustments recorded against the payment.",
    adjustmentReference: "Adjustment reference",
    type: "Type",
    accountingReference: "Accounting reference",
    postedAt: "Posted at",
    reversedAt: "Reversed at",
    noEvents: "No events are recorded for this payment.",
    noRefunds: "No refunds are linked to this payment.",
    noAdjustments: "No financial adjustments are linked to this payment.",
    none: "Not available",
    error: "Could not load payment details",
    retry: "Try again",
    refreshed: "Payment details refreshed.",
    operationsTitle: "Operational actions",
    operationsDesc:
      "Operational actions are available only to users with subscription update permission and require confirmation.",
    reconcile: "Run reconciliation",
    reconcileHint:
      "The backend compares local payment state with the provider and records a new reconciliation result.",
    confirmTitle: "Confirm reconciliation",
    confirmReconcile:
      "The system may contact the payment provider and record a new reconciliation result. Continue?",
    confirm: "Confirm",
    backAction: "Back",
    reconciled: "Reconciliation completed successfully.",
  },
} as const;

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-end text-sm font-medium">{value}</div>
    </div>
  );
}

function LtrValue({ value }: { value: React.ReactNode }) {
  return (
    <span dir="ltr" lang="en" className="tabular-nums">
      {value}
    </span>
  );
}

export default function SystemPlatformPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [detail, setDetail] =
    React.useState<SystemPlatformPaymentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const session = useAuth();
  const canUpdate = hasPermission(
    session,
    PERMISSIONS.SYSTEM_SUBSCRIPTIONS_UPDATE,
  );
  const [reconcileOpen, setReconcileOpen] = React.useState(false);
  const [reconcileBusy, setReconcileBusy] = React.useState(false);
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const sync = () => {
      const next = readSystemLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      if (!id) return;
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const result = await fetchSystemPlatformPaymentDetail(id);
        setDetail(result);
        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  async function executeReconciliation() {
    try {
      setReconcileBusy(true);
      await reconcileSystemPlatformPayment(id);
      toast.success(t.reconciled);
      setReconcileOpen(false);
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setReconcileBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Activity className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  const failureText =
    [detail.failureCode, detail.failureMessage].filter(Boolean).join(" — ") ||
    t.none;

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title}
            </h1>
            <PlatformPaymentStatusBadge
              value={detail.status}
              locale={locale}
            />
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            asChild
          >
            <Link href="/system/platform-payments">
              <BackIcon />
              <span className="hidden lg:inline">{t.back}</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.attempt}
          value={detail.attemptNumber}
          description={t.linkedDesc}
          icon={Gauge}
        />
        <SystemMetricCard
          title={t.events}
          value={detail.events.length}
          description={t.linkedDesc}
          icon={FileClock}
        />
        <SystemMetricCard
          title={t.refunds}
          value={detail.refunds.length}
          description={t.linkedDesc}
          icon={RotateCcw}
        />
        <SystemMetricCard
          title={t.adjustments}
          value={detail.adjustments.length}
          description={t.linkedDesc}
          icon={WalletCards}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={CreditCard}>{t.identityTitle}</CardTitle>
            <CardDescription>{t.identityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t.reference}
              value={<LtrValue value={detail.paymentReference} />}
            />
            <InfoRow
              label={t.status}
              value={
                <PlatformPaymentStatusBadge
                  value={detail.status}
                  locale={locale}
                />
              }
            />
            <InfoRow
              label={t.amount}
              value={
                <MoneyValue
                  amount={detail.amount}
                  currency={detail.currency}
                />
              }
            />
            <InfoRow
              label={t.gateway}
              value={<LtrValue value={detail.gateway} />}
            />
            <InfoRow
              label={t.method}
              value={<LtrValue value={detail.paymentMethod} />}
            />
            <InfoRow
              label={t.providerReference}
              value={<LtrValue value={detail.gatewayPaymentId || t.none} />}
            />
            <InfoRow
              label={t.transactionReference}
              value={
                <LtrValue value={detail.transactionReference || t.none} />
              }
            />
            <InfoRow
              label={t.billingReference}
              value={<LtrValue value={detail.billingReference || t.none} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Building2}>{t.linksTitle}</CardTitle>
            <CardDescription>{t.linksDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t.company}
              value={
                detail.companyId ? (
                  <Link
                    href={`/system/companies/${detail.companyId}`}
                    className="hover:underline"
                  >
                    {detail.companyName}
                  </Link>
                ) : (
                  detail.companyName
                )
              }
            />
            <InfoRow
              label={t.subscription}
              value={
                detail.subscriptionId ? (
                  <Link
                    href={`/system/subscriptions/${detail.subscriptionId}`}
                    className="hover:underline"
                  >
                    <LtrValue value={`#${detail.subscriptionId}`} />
                  </Link>
                ) : (
                  t.none
                )
              }
            />
            <InfoRow
              label={t.plan}
              value={
                detail.planId ? (
                  <Link
                    href={`/system/plans/${detail.planId}`}
                    className="hover:underline"
                  >
                    {detail.planName}
                  </Link>
                ) : (
                  detail.planName
                )
              }
            />
            <InfoRow
              label={t.invoice}
              value={<LtrValue value={detail.invoiceNumber || t.none} />}
            />
            <InfoRow
              label={t.receipt}
              value={<LtrValue value={detail.receiptNumber || t.none} />}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={FileClock}>{t.lifecycleTitle}</CardTitle>
            <CardDescription>{t.lifecycleDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              [t.initiatedAt, detail.initiatedAt],
              [t.processingAt, detail.processingAt],
              [t.paidAt, detail.paidAt],
              [t.failedAt, detail.failedAt],
              [t.cancelledAt, detail.cancelledAt],
              [t.createdAt, detail.createdAt],
              [t.updatedAt, detail.updatedAt],
            ].map(([label, value]) => (
              <InfoRow
                key={String(label)}
                label={String(label)}
                value={
                  <LtrValue
                    value={formatDateTime(
                      typeof value === "string" ? value : null,
                    )}
                  />
                }
              />
            ))}
            {detail.failureCode || detail.failureMessage ? (
              <InfoRow label={t.failure} value={failureText} />
            ) : null}
            {detail.cancellationReason ? (
              <InfoRow
                label={t.cancellation}
                value={detail.cancellationReason}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={WalletCards}>{t.financialTitle}</CardTitle>
            <CardDescription>{t.financialDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              [t.paidAmount, detail.financial.paidAmount],
              [t.successfulRefunded, detail.financial.successfulRefundedAmount],
              [t.reservedRefund, detail.financial.reservedRefundAmount],
              [t.remainingRefundable, detail.financial.remainingRefundableAmount],
            ].map(([label, amount]) => (
              <div key={String(label)} className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="mt-2 text-lg font-semibold">
                  <MoneyValue
                    amount={String(amount)}
                    currency={detail.financial.currency}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck}>{t.operationsTitle}</CardTitle>
            <CardDescription>{t.operationsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setReconcileOpen(true)}>
              <ShieldCheck />
              {t.reconcile}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t.reconcileHint}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle icon={TableProperties}>{t.eventsTitle}</CardTitle>
          <CardDescription>{t.eventsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataRegisterTableFrame>
            <Table className="min-w-[900px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] px-4">{t.eventType}</TableHead>
                  <TableHead className="w-[200px] px-4">{t.transition}</TableHead>
                  <TableHead className="w-[320px] px-4">{t.message}</TableHead>
                  <TableHead className="w-[180px] px-4">{t.createdAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.events.length ? (
                  detail.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="px-4">
                        <LtrValue value={event.eventType} />
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          {event.fromStatus &&
                          event.fromStatus !== "unknown" ? (
                            <PlatformPaymentStatusBadge
                              value={event.fromStatus}
                              locale={locale}
                            />
                          ) : null}
                          <span>→</span>
                          {event.toStatus &&
                          event.toStatus !== "unknown" ? (
                            <PlatformPaymentStatusBadge
                              value={event.toStatus}
                              locale={locale}
                            />
                          ) : (
                            "—"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        {event.message || "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={formatDateTime(event.createdAt)} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t.noEvents}
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
          <CardTitle icon={ReceiptText}>{t.refundsTitle}</CardTitle>
          <CardDescription>{t.refundsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataRegisterTableFrame>
            <Table className="min-w-[1080px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[175px] px-4">
                    {t.refundReference}
                  </TableHead>
                  <TableHead className="w-[120px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[110px] px-4">{t.gateway}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.amount}</TableHead>
                  <TableHead className="w-[175px] px-4">
                    {t.providerRefund}
                  </TableHead>
                  <TableHead className="w-[210px] px-4">{t.reason}</TableHead>
                  <TableHead className="w-[170px] px-4">
                    {t.refundedAt}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.refunds.length ? (
                  detail.refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="px-4">
                        <LtrValue value={refund.reference} />
                      </TableCell>
                      <TableCell className="px-4">
                        <PlatformPaymentStatusBadge
                          value={refund.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={refund.gateway} />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue
                          amount={refund.amount}
                          currency={refund.currency}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={refund.providerRefundId || "—"} />
                      </TableCell>
                      <TableCell className="px-4">
                        {refund.reason || "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={formatDateTime(refund.refundedAt)} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t.noRefunds}
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
          <CardTitle icon={FileText}>{t.adjustmentsTitle}</CardTitle>
          <CardDescription>{t.adjustmentsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataRegisterTableFrame>
            <Table className="min-w-[1100px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] px-4">
                    {t.adjustmentReference}
                  </TableHead>
                  <TableHead className="w-[110px] px-4">{t.type}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.amount}</TableHead>
                  <TableHead className="w-[210px] px-4">{t.reason}</TableHead>
                  <TableHead className="w-[180px] px-4">
                    {t.accountingReference}
                  </TableHead>
                  <TableHead className="w-[170px] px-4">{t.postedAt}</TableHead>
                  <TableHead className="w-[170px] px-4">
                    {t.reversedAt}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.adjustments.length ? (
                  detail.adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="px-4">
                        <LtrValue value={adjustment.reference} />
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={adjustment.type} />
                      </TableCell>
                      <TableCell className="px-4">
                        <PlatformPaymentStatusBadge
                          value={adjustment.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue
                          amount={adjustment.amount}
                          currency={adjustment.currency}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        {adjustment.reason || "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue
                          value={adjustment.accountingReference || "—"}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={formatDateTime(adjustment.postedAt)} />
                      </TableCell>
                      <TableCell className="px-4">
                        <LtrValue value={formatDateTime(adjustment.reversedAt)} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t.noAdjustments}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataRegisterTableFrame>
        </CardContent>
      </Card>

      <AlertDialog
        open={reconcileOpen}
        onOpenChange={(open) => {
          if (!open && !reconcileBusy) setReconcileOpen(false);
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmReconcile}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reconcileBusy}>
              {t.backAction}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reconcileBusy}
              onClick={(event) => {
                event.preventDefault();
                void executeReconciliation();
              }}
            >
              {reconcileBusy ? <Loader2 className="animate-spin" /> : null}
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
