"use client";

import * as React from "react";
import Script from "next/script";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  attachPublicMoyasarPayment,
} from "@/lib/public-registration";


type MoyasarPayment = {
  id?: string;
  status?: string;
};


type MoyasarApi = {
  init: (
    options: Record<string, unknown>,
  ) => void;
};


declare global {
  interface Window {
    Moyasar?: MoyasarApi;
  }
}


type Props = {
  paymentReference: string;
  amount: string;
  currencyCode: string;
  locale: "ar" | "en";
};


const PUBLISHABLE_KEY =
  process.env
    .NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ||
  "";


function toMinorUnits(
  value: string,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return 0;
  }

  return Math.round(
    parsed * 100,
  );
}


export function MoyasarPublicCheckout({
  paymentReference,
  amount,
  currencyCode,
  locale,
}: Props) {
  const initializedRef =
    React.useRef(false);

  const [scriptReady, setScriptReady] =
    React.useState(false);

  const [attaching, setAttaching] =
    React.useState(false);

  const isArabic =
    locale === "ar";

  const minorAmount =
    toMinorUnits(amount);

  const callbackUrl =
    React.useMemo(() => {
      if (
        typeof window === "undefined"
      ) {
        return "";
      }

      const url = new URL(
        "/register/payment-return",
        window.location.origin,
      );

      url.searchParams.set(
        "reference",
        paymentReference,
      );

      return url.toString();
    }, [paymentReference]);


  React.useEffect(() => {
    if (
      !scriptReady ||
      initializedRef.current
    ) {
      return;
    }

    if (
      !PUBLISHABLE_KEY.startsWith(
        "pk_test_",
      ) &&
      !PUBLISHABLE_KEY.startsWith(
        "pk_live_",
      )
    ) {
      return;
    }

    if (!window.Moyasar) {
      return;
    }

    if (!minorAmount) {
      toast.error(
        isArabic
          ? "قيمة الدفع غير صالحة."
          : "Invalid payment amount.",
      );

      return;
    }

    initializedRef.current = true;

    window.Moyasar.init({
      element:
        ".mhamcloud-moyasar-form",

      amount:
        minorAmount,

      currency:
        String(
          currencyCode ||
          "SAR",
        ).toUpperCase(),

      description:
        `Mhamcloud subscription ${paymentReference}`,

      publishable_api_key:
        PUBLISHABLE_KEY,

      callback_url:
        callbackUrl,

      methods: [
        "creditcard",
      ],

      credit_card: {
        save_card: false,
      },

      on_completed:
        async (
          payment: MoyasarPayment,
        ) => {
          const providerId =
            String(
              payment?.id || "",
            ).trim();

          if (!providerId) {
            toast.error(
              isArabic
                ? "لم تُرجع Moyasar رقم عملية الدفع."
                : "Moyasar did not return a payment ID.",
            );

            return;
          }

          try {
            setAttaching(true);

            await attachPublicMoyasarPayment(
              paymentReference,
              providerId,
            );

            toast.success(
              isArabic
                ? "تم استلام عملية الدفع وجاري التحقق منها."
                : "Payment received and is being verified.",
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : isArabic
                  ? "تعذر ربط عملية Moyasar."
                  : "Unable to attach Moyasar payment.";

            toast.error(
              message,
            );

            throw error;
          } finally {
            setAttaching(false);
          }
        },
    });
  }, [
    callbackUrl,
    currencyCode,
    isArabic,
    minorAmount,
    paymentReference,
    scriptReady,
  ]);


  if (
    !PUBLISHABLE_KEY.startsWith(
      "pk_test_",
    ) &&
    !PUBLISHABLE_KEY.startsWith(
      "pk_live_",
    )
  ) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="font-semibold">
              {isArabic
                ? "Moyasar غير مهيأة"
                : "Moyasar is not configured"}
            </p>

            <p className="mt-1 text-sm leading-6">
              {isArabic
                ? "مفتاح Moyasar العام غير موجود. لم يتم بدء أي عملية دفع."
                : "The Moyasar publishable key is missing. No payment has been started."}
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <>
      <Script
        src="https://cdn.moyasar.com/mpf/1.15.0/moyasar.js"
        strategy="afterInteractive"
        onLoad={() =>
          setScriptReady(true)
        }
        onError={() => {
          toast.error(
            isArabic
              ? "تعذر تحميل نموذج Moyasar الآمن."
              : "Unable to load the secure Moyasar form.",
          );
        }}
      />

      <link
        rel="stylesheet"
        href="https://cdn.moyasar.com/mpf/1.15.0/moyasar.css"
      />

      <div className="space-y-4">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <p className="font-semibold">
                {isArabic
                  ? "الدفع الآمن عبر Moyasar"
                  : "Secure payment with Moyasar"}
              </p>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {isArabic
                  ? "بيانات البطاقة تُرسل مباشرة إلى Moyasar ولا تمر عبر خوادم Mhamcloud."
                  : "Card details are sent directly to Moyasar and never pass through Mhamcloud servers."}
              </p>
            </div>
          </div>
        </div>

        {attaching ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />

            {isArabic
              ? "جاري ربط عملية الدفع..."
              : "Attaching payment..."}
          </div>
        ) : null}

        <div className="mhamcloud-moyasar-form rounded-2xl border bg-background p-4" />
      </div>
    </>
  );
}
