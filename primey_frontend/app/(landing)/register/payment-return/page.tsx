"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ChatWidget } from "@/components/chat-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type PublicPaymentVerificationResult,
  verifyPublicRegistrationPayment,
} from "@/lib/public-registration";


type ViewState =
  | "loading"
  | "paid"
  | "pending"
  | "failed"
  | "error";


function Money({
  value,
}: {
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        dir="ltr"
        lang="en"
        className="font-semibold tabular-nums"
      >
        {Number(value || 0).toLocaleString(
          "en-US",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}
      </span>

      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={16}
        height={16}
        className="h-4 w-4 shrink-0"
      />
    </span>
  );
}


export default function PublicPaymentReturnPage() {
  const searchParams = useSearchParams();

  const reference = String(
    searchParams.get("reference") || "",
  ).trim();

  // These are informational only.
  // They never decide whether the payment succeeded.
  const browserResult = String(
    searchParams.get("result") || "",
  ).trim();

  const [state, setState] =
    React.useState<ViewState>("loading");

  const [data, setData] =
    React.useState<
      PublicPaymentVerificationResult | null
    >(null);

  const [message, setMessage] =
    React.useState("");

  const verify = React.useCallback(
    async () => {
      if (!reference) {
        setMessage(
          "مرجع الدفع غير موجود.",
        );

        setState("error");
        return;
      }

      try {
        setState("loading");
        setMessage("");

        const verified =
          await verifyPublicRegistrationPayment(
            reference,
          );

        setData(verified);

        const paymentStatus =
          String(
            verified.payment.status || "",
          ).toUpperCase();

        const subscriptionStatus =
          String(
            verified.subscription.status || "",
          ).toUpperCase();

        if (
          paymentStatus === "PAID" &&
          ["ACTIVE", "TRIAL"].includes(
            subscriptionStatus,
          )
        ) {
          setState("paid");
          return;
        }

        if (
          [
            "FAILED",
            "CANCELLED",
            "CANCELED",
            "EXPIRED",
          ].includes(paymentStatus)
        ) {
          setState("failed");
          return;
        }

        setState("pending");
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "تعذر التحقق من عملية الدفع.";

        setMessage(text);
        setState("error");

        toast.error(text);
      }
    },
    [reference],
  );


  React.useEffect(() => {
    void verify();
  }, [verify]);


  const isPaid =
    state === "paid";

  const isPending =
    state === "pending";

  const isFailed =
    state === "failed";


  return (
    <main
      dir="rtl"
      lang="ar"
      className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[78vh] max-w-3xl items-center justify-center">
        <Card className="w-full border-primary/15 bg-background/95 shadow-xl">
          <CardHeader className="items-center text-center">
            {state === "loading" ? (
              <span className="flex size-16 items-center justify-center rounded-full border bg-primary/5 text-primary">
                <Loader2 className="size-8 animate-spin" />
              </span>
            ) : isPaid ? (
              <span className="flex size-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </span>
            ) : isPending ? (
              <span className="flex size-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                <Clock3 className="size-8" />
              </span>
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
                <CircleAlert className="size-8" />
              </span>
            )}

            <CardTitle className="mt-3 text-3xl">
              {state === "loading"
                ? "جاري التحقق من عملية الدفع"
                : isPaid
                  ? "تم تأكيد الدفع"
                  : isPending
                    ? "الدفع قيد التحقق"
                    : isFailed
                      ? "لم تكتمل عملية الدفع"
                      : "تعذر التحقق من الدفع"}
            </CardTitle>

            <CardDescription className="max-w-xl text-sm leading-7">
              {state === "loading"
                ? "نتحقق من حالة العملية مباشرة من مزود الدفع."
                : isPaid
                  ? "تم التحقق من الدفع من الخادم وتحديث الاشتراك."
                  : isPending
                    ? "لم يعتبر النظام العملية مدفوعة بعد. يمكنك إعادة التحقق."
                    : isFailed
                      ? "أكد مزود الدفع أن العملية لم تكتمل."
                      : message ||
                        "تعذر الوصول إلى الحالة المؤكدة لعملية الدفع."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />

                <p className="text-sm leading-7">
                  نتيجة المتصفح
                  {browserResult
                    ? ` (${browserResult})`
                    : ""}
                  {" "}
                  ليست مصدر الحقيقة. الحالة المعروضة هنا تعتمد على تحقق الخادم من مزود الدفع.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  مرجع الدفع
                </p>

                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 break-all font-semibold tabular-nums"
                >
                  {reference || "—"}
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  حالة الدفع
                </p>

                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 font-semibold tabular-nums"
                >
                  {data?.payment.status || "—"}
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  حالة الاشتراك
                </p>

                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 font-semibold tabular-nums"
                >
                  {data?.subscription.status || "—"}
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  المبلغ
                </p>

                <div className="mt-2 font-semibold">
                  {data?.payment.amount ? (
                    <Money
                      value={data.payment.amount}
                    />
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {!isPaid ? (
                <Button
                  type="button"
                  size="lg"
                  variant="brand"
                  disabled={state === "loading"}
                  className="rounded-2xl"
                  onClick={() => {
                    void verify();
                  }}
                >
                  {state === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}

                  إعادة التحقق
                </Button>
              ) : null}

              <Button
                type="button"
                size="lg"
                variant={isPaid ? "brand" : "outline"}
                className="rounded-2xl"
                onClick={() => {
                  window.location.assign(
                    "/login",
                  );
                }}
              >
                <LogIn className="size-4" />
                تسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChatWidget />
    </main>
  );
}
