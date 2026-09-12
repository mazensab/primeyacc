"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Printer,
  ReceiptText,
  RefreshCw,
  TableProperties,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { DataRegisterTableFrame } from "@/components/ui/data-register-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BillingDocumentStatusBadge,
  BillingDocumentTypeBadge,
  billingDocumentPdfUrl,
  billingDocumentPrintUrl,
  fetchSystemBillingDocumentDetail,
  type SystemBillingDocumentDetail,
} from "@/lib/system-billing-documents";
import {
  asRecord,
  formatDate,
  formatDateTime,
  MoneyValue,
  readSystemLocale,
  text,
  type SystemLocale,
} from "@/lib/system-subscriptions";

const translations = {
  ar: {
    title: "تفاصيل مستند الفوترة",
    subtitle:
      "بيانات الفاتورة أو الإيصال والقيم المالية والروابط والنسخ الثابتة المسجلة وقت الإصدار.",
    back: "العودة للفواتير والإيصالات",
    refresh: "تحديث",
    print: "طباعة المستند",
    pdf: "فتح PDF",
    total: "الإجمالي",
    paid: "المدفوع",
    balance: "المتبقي",
    tax: "الضريبة",
    identityTitle: "هوية المستند",
    identityDesc:
      "رقم المستند والنوع والحالة والمراجع والتواريخ المسجلة.",
    financialTitle: "القيم المالية",
    financialDesc:
      "المجموع والخصم والخاضع للضريبة والضريبة والمدفوع والمتبقي.",
    linksTitle: "السجلات المرتبطة",
    linksDesc: "الشركة والاشتراك والفاتورة وإيصالات الدفع المرتبطة.",
    immutableTitle: "البيانات الثابتة وقت الإصدار",
    immutableDesc:
      "حقول آمنة مختارة من Snapshots المحفوظة؛ لا نعرض metadata أو payment_snapshot الخام.",
    receiptsTitle: "إيصالات الدفع المرتبطة",
    receiptsDesc: "الإيصالات المرتبطة بهذه الفاتورة حسب Backend.",
    documentNumber: "رقم المستند",
    type: "نوع المستند",
    status: "الحالة",
    issueDate: "تاريخ الإصدار",
    issuedAt: "وقت الإصدار",
    paidAt: "وقت الدفع",
    cancelledAt: "وقت الإلغاء",
    paymentMethod: "طريقة الدفع",
    billingReference: "مرجع الفوترة",
    transactionReference: "مرجع العملية",
    cancellationReason: "سبب الإلغاء",
    notes: "ملاحظات",
    subtotal: "المجموع قبل الخصم",
    discount: "الخصم",
    taxable: "الخاضع للضريبة",
    company: "الشركة",
    companyCode: "رمز الشركة",
    subscription: "الاشتراك",
    plan: "الباقة",
    relatedInvoice: "الفاتورة المرتبطة",
    seller: "البائع",
    buyer: "المشتري",
    name: "الاسم",
    taxNumber: "الرقم الضريبي",
    commercialRegistration: "السجل التجاري",
    email: "البريد الإلكتروني",
    city: "المدينة",
    billingCycle: "دورة الفوترة",
    subscriptionAction: "نوع الاشتراك",
    noReceipts: "لا توجد إيصالات دفع مرتبطة بهذه الفاتورة.",
    none: "غير متوفر",
    error: "تعذر تحميل تفاصيل مستند الفوترة",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل المستند.",
  },
  en: {
    title: "Billing Document Details",
    subtitle:
      "Invoice or receipt identity, financial values, linked records, and immutable issue-time snapshots.",
    back: "Back to invoices & receipts",
    refresh: "Refresh",
    print: "Print document",
    pdf: "Open PDF",
    total: "Total",
    paid: "Paid",
    balance: "Balance",
    tax: "Tax",
    identityTitle: "Document identity",
    identityDesc:
      "Document number, type, status, references, and recorded timestamps.",
    financialTitle: "Financial values",
    financialDesc:
      "Subtotal, discount, taxable amount, tax, paid amount, and balance.",
    linksTitle: "Linked records",
    linksDesc: "Company, subscription, invoice, and linked payment receipts.",
    immutableTitle: "Immutable issue-time data",
    immutableDesc:
      "Allowlisted fields from stored snapshots; raw metadata and payment_snapshot are not displayed.",
    receiptsTitle: "Linked payment receipts",
    receiptsDesc: "Receipts linked to this invoice by the backend.",
    documentNumber: "Document number",
    type: "Document type",
    status: "Status",
    issueDate: "Issue date",
    issuedAt: "Issued at",
    paidAt: "Paid at",
    cancelledAt: "Cancelled at",
    paymentMethod: "Payment method",
    billingReference: "Billing reference",
    transactionReference: "Transaction reference",
    cancellationReason: "Cancellation reason",
    notes: "Notes",
    subtotal: "Subtotal",
    discount: "Discount",
    taxable: "Taxable amount",
    company: "Company",
    companyCode: "Company code",
    subscription: "Subscription",
    plan: "Plan",
    relatedInvoice: "Related invoice",
    seller: "Seller",
    buyer: "Buyer",
    name: "Name",
    taxNumber: "Tax number",
    commercialRegistration: "Commercial registration",
    email: "Email",
    city: "City",
    billingCycle: "Billing cycle",
    subscriptionAction: "Subscription action",
    noReceipts: "No payment receipts are linked to this invoice.",
    none: "Not available",
    error: "Could not load billing document details",
    retry: "Try again",
    refreshed: "Billing document details refreshed.",
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

function AmountCard({
  title,
  amount,
  currency,
  icon: Icon,
}: {
  title: string;
  amount: string;
  currency: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={Icon} iconPosition="opposite">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">
        <MoneyValue amount={amount} currency={currency} />
      </CardContent>
    </Card>
  );
}

function snapshotValue(
  source: Record<string, unknown>,
  keys: string[],
  fallback = "—",
) {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return fallback;
}

export default function SystemBillingDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [detail, setDetail] =
    React.useState<SystemBillingDocumentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
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
        const result = await fetchSystemBillingDocumentDetail(id);
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
          <p className="text-sm text-muted-foreground">{error || t.error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  const doc = detail.document;
  const seller = asRecord(detail.seller);
  const buyer = asRecord(detail.buyer);
  const subscription = asRecord(detail.subscriptionSnapshot);
  const plan = asRecord(detail.planSnapshot);

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ms-2 mb-2 h-8 px-2 text-muted-foreground"
          >
            <Link href="/system/invoices">
              <BackIcon />
              {t.back}
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            {t.refresh}
          </Button>
          {doc.allowedPrint ? (
            <>
              <Button
                variant="outline"
                className={registerOutlineButtonClass}
                onClick={() =>
                  window.open(
                    billingDocumentPdfUrl(doc.id),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <Download />
                {t.pdf}
              </Button>
              <Button
                className={registerBrandButtonClass}
                onClick={() =>
                  window.open(
                    billingDocumentPrintUrl(doc.id),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <Printer />
                {t.print}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <AmountCard
          title={t.total}
          amount={doc.totalAmount}
          currency={doc.currency}
          icon={FileText}
        />
        <AmountCard
          title={t.paid}
          amount={doc.paidAmount}
          currency={doc.currency}
          icon={WalletCards}
        />
        <AmountCard
          title={t.balance}
          amount={doc.balanceAmount}
          currency={doc.currency}
          icon={ReceiptText}
        />
        <AmountCard
          title={t.tax}
          amount={doc.taxAmount}
          currency={doc.currency}
          icon={FileText}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={FileText}>{t.identityTitle}</CardTitle>
            <CardDescription>{t.identityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t.documentNumber}
              value={<LtrValue value={doc.documentNumber} />}
            />
            <InfoRow
              label={t.type}
              value={
                <BillingDocumentTypeBadge
                  value={doc.documentType}
                  locale={locale}
                />
              }
            />
            <InfoRow
              label={t.status}
              value={
                <BillingDocumentStatusBadge
                  value={doc.status}
                  locale={locale}
                />
              }
            />
            <InfoRow
              label={t.issueDate}
              value={<LtrValue value={formatDate(doc.issueDate)} />}
            />
            <InfoRow
              label={t.issuedAt}
              value={<LtrValue value={formatDateTime(doc.issuedAt)} />}
            />
            <InfoRow
              label={t.paidAt}
              value={<LtrValue value={formatDateTime(doc.paidAt)} />}
            />
            <InfoRow
              label={t.paymentMethod}
              value={doc.paymentMethod || t.none}
            />
            <InfoRow
              label={t.billingReference}
              value={<LtrValue value={doc.billingReference || "—"} />}
            />
            <InfoRow
              label={t.transactionReference}
              value={<LtrValue value={doc.transactionReference || "—"} />}
            />
            {doc.cancelledAt ? (
              <InfoRow
                label={t.cancelledAt}
                value={<LtrValue value={formatDateTime(doc.cancelledAt)} />}
              />
            ) : null}
            {doc.cancellationReason ? (
              <InfoRow
                label={t.cancellationReason}
                value={doc.cancellationReason}
              />
            ) : null}
            {doc.notes ? <InfoRow label={t.notes} value={doc.notes} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={WalletCards}>{t.financialTitle}</CardTitle>
            <CardDescription>{t.financialDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              [t.subtotal, doc.subtotal],
              [t.discount, doc.discountAmount],
              [t.taxable, doc.taxableAmount],
              [t.tax, doc.taxAmount],
              [t.total, doc.totalAmount],
              [t.paid, doc.paidAmount],
              [t.balance, doc.balanceAmount],
            ].map(([label, amount]) => (
              <InfoRow
                key={String(label)}
                label={String(label)}
                value={
                  <MoneyValue
                    amount={String(amount)}
                    currency={doc.currency}
                  />
                }
              />
            ))}
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
                doc.companyId ? (
                  <Link
                    href={`/system/companies/${doc.companyId}`}
                    className="hover:underline"
                  >
                    {doc.companyName}
                  </Link>
                ) : (
                  doc.companyName
                )
              }
            />
            <InfoRow
              label={t.companyCode}
              value={<LtrValue value={doc.companyCode} />}
            />
            <InfoRow
              label={t.subscription}
              value={
                doc.subscriptionId ? (
                  <Link
                    href={`/system/subscriptions/${doc.subscriptionId}`}
                    className="hover:underline"
                  >
                    <LtrValue value={`#${doc.subscriptionId}`} />
                  </Link>
                ) : (
                  t.none
                )
              }
            />
            <InfoRow label={t.plan} value={doc.planName} />
            {doc.relatedInvoiceId ? (
              <InfoRow
                label={t.relatedInvoice}
                value={
                  <Link
                    href={`/system/invoices/${doc.relatedInvoiceId}`}
                    className="hover:underline"
                  >
                    {doc.relatedInvoiceNumber || `#${doc.relatedInvoiceId}`}
                  </Link>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={CalendarDays}>{t.immutableTitle}</CardTitle>
            <CardDescription>{t.immutableDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">{t.seller}</p>
              <div className="space-y-2">
                <InfoRow
                  label={t.name}
                  value={snapshotValue(seller, [
                    "name",
                    "company_name",
                    "legal_name",
                    "name_ar",
                    "name_en",
                  ])}
                />
                <InfoRow
                  label={t.taxNumber}
                  value={
                    <LtrValue
                      value={snapshotValue(seller, [
                        "tax_number",
                        "vat_number",
                        "tax_registration_number",
                      ])}
                    />
                  }
                />
                <InfoRow
                  label={t.commercialRegistration}
                  value={
                    <LtrValue
                      value={snapshotValue(seller, [
                        "commercial_registration",
                        "commercial_registration_number",
                        "cr_number",
                      ])}
                    />
                  }
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">{t.buyer}</p>
              <div className="space-y-2">
                <InfoRow
                  label={t.name}
                  value={snapshotValue(buyer, [
                    "name",
                    "company_name",
                    "legal_name",
                    "name_ar",
                    "name_en",
                  ])}
                />
                <InfoRow
                  label={t.taxNumber}
                  value={
                    <LtrValue
                      value={snapshotValue(buyer, [
                        "tax_number",
                        "vat_number",
                        "tax_registration_number",
                      ])}
                    />
                  }
                />
                <InfoRow
                  label={t.email}
                  value={
                    <span dir="ltr" className="break-all">
                      {snapshotValue(buyer, ["email"])}
                    </span>
                  }
                />
                <InfoRow
                  label={t.city}
                  value={snapshotValue(buyer, ["city"])}
                />
              </div>
            </div>

            <div className="space-y-2">
              <InfoRow
                label={t.plan}
                value={snapshotValue(plan, ["name", "plan_name", "title"])}
              />
              <InfoRow
                label={t.billingCycle}
                value={snapshotValue(subscription, [
                  "billing_cycle",
                  "cycle",
                ])}
              />
              <InfoRow
                label={t.subscriptionAction}
                value={snapshotValue(subscription, ["action"])}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {doc.isInvoice ? (
        <Card>
          <CardHeader>
            <CardTitle icon={TableProperties}>{t.receiptsTitle}</CardTitle>
            <CardDescription>{t.receiptsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.paymentReceipts.length ? (
              <DataRegisterTableFrame>
                <Table className="min-w-[820px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">
                        {t.documentNumber}
                      </TableHead>
                      <TableHead className="w-[150px]">{t.status}</TableHead>
                      <TableHead className="w-[150px]">{t.paid}</TableHead>
                      <TableHead className="w-[180px]">
                        {t.paymentMethod}
                      </TableHead>
                      <TableHead className="w-[160px]">{t.issueDate}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.paymentReceipts.map((receipt) => (
                      <TableRow
                        key={receipt.id}
                        href={`/system/invoices/${receipt.id}`}
                      >
                        <TableCell className="font-medium">
                          {receipt.documentNumber}
                        </TableCell>
                        <TableCell>
                          <BillingDocumentStatusBadge
                            value={receipt.status}
                            locale={locale}
                          />
                        </TableCell>
                        <TableCell>
                          <MoneyValue
                            amount={receipt.paidAmount}
                            currency={receipt.currency}
                          />
                        </TableCell>
                        <TableCell>
                          {receipt.paymentMethod || "—"}
                        </TableCell>
                        <TableCell>
                          <LtrValue value={formatDate(receipt.issueDate)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataRegisterTableFrame>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-lg border text-sm text-muted-foreground">
                {t.noReceipts}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
