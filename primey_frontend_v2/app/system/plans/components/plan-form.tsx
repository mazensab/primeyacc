"use client";

import * as React from "react";
import {
  Check,
  Layers3,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MoneyValue,
  PLAN_FEATURE_OPTIONS,
  planFeatureLabel,
  type SystemLocale,
  type SystemPlanDetail,
  type SystemPlanMutationInput,
} from "@/lib/system-plans";

export type PlanFormValues = {
  name: string;
  code: string;
  slug: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxUsers: string;
  maxBranches: string;
  maxWarehouses: string;
  maxPos: string;
  features: string[];
  active: boolean;
  public: boolean;
  sortOrder: string;
};

export const emptyPlanFormValues: PlanFormValues = {
  name: "",
  code: "BASIC",
  slug: "",
  description: "",
  monthlyPrice: "0.00",
  yearlyPrice: "0.00",
  maxUsers: "1",
  maxBranches: "1",
  maxWarehouses: "0",
  maxPos: "0",
  features: [],
  active: true,
  public: true,
  sortOrder: "0",
};

export function planToFormValues(plan: SystemPlanDetail): PlanFormValues {
  return {
    name: plan.name,
    code: plan.code,
    slug: plan.slug === "—" ? "" : plan.slug,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    maxUsers: String(plan.maxUsers),
    maxBranches: String(plan.maxBranches),
    maxWarehouses: String(plan.maxWarehouses),
    maxPos: String(plan.maxPos),
    features: [...plan.features],
    active: plan.active,
    public: plan.public,
    sortOrder: String(plan.sortOrder),
  };
}

export function formValuesToMutation(
  values: PlanFormValues,
): SystemPlanMutationInput {
  return {
    name: values.name.trim(),
    code: values.code,
    slug: values.slug.trim(),
    description: values.description.trim(),
    monthly_price: values.monthlyPrice || "0.00",
    yearly_price: values.yearlyPrice || "0.00",
    max_users: Number(values.maxUsers || 0),
    max_branches: Number(values.maxBranches || 0),
    max_warehouses: Number(values.maxWarehouses || 0),
    max_pos: Number(values.maxPos || 0),
    features: Array.from(
      new Set(values.features.map((item) => item.trim()).filter(Boolean)),
    ),
    is_active: values.active,
    is_public: values.public,
    sort_order: Number(values.sortOrder || 0),
  };
}

const PLAN_CODES = [
  "STARTER",
  "BASIC",
  "PROFESSIONAL",
  "ENTERPRISE",
  "CUSTOM",
] as const;

const translations = {
  ar: {
    basicTitle: "البيانات الأساسية",
    basicDesc: "اسم الباقة والكود ومعرف الرابط والوصف وترتيب الظهور.",
    name: "اسم الباقة",
    code: "كود الباقة",
    slug: "معرف الرابط",
    description: "الوصف",
    sortOrder: "ترتيب الظهور",
    pricingTitle: "الأسعار",
    pricingDesc: "السعر الشهري والسنوي بالريال السعودي.",
    monthly: "السعر الشهري",
    yearly: "السعر السنوي",
    limitsTitle: "الحدود التشغيلية",
    limitsDesc: "الحدود القصوى للمستخدمين والفروع والمستودعات ونقاط البيع.",
    users: "المستخدمون",
    branches: "الفروع",
    warehouses: "المستودعات",
    pos: "نقاط البيع",
    featuresTitle: "مميزات الباقة",
    featuresDesc:
      "اختر مجموعات المميزات الجاهزة. يمكن إضافة ميزة مخصصة عند الحاجة بدون كتابة JSON.",
    suggestedFeatures: "المميزات المتاحة",
    selectedFeatures: "المميزات المختارة",
    noFeatures: "لم يتم اختيار أي ميزة بعد.",
    customFeature: "ميزة مخصصة",
    customPlaceholder: "مثال: custom_feature",
    addFeature: "إضافة",
    stateTitle: "الحالة والظهور",
    stateDesc: "تفعيل الباقة وإمكانية ظهورها للاشتراك.",
    active: "مفعلة",
    inactive: "موقفة",
    public: "عامة",
    internal: "داخلية",
    save: "حفظ",
    cancel: "إلغاء",
    requiredName: "اسم الباقة مطلوب.",
    invalidNumber: "القيم الرقمية يجب أن تكون صفرًا أو أكبر.",
  },
  en: {
    basicTitle: "Basic information",
    basicDesc: "Plan name, code, slug, description, and display order.",
    name: "Plan name",
    code: "Plan code",
    slug: "Slug",
    description: "Description",
    sortOrder: "Display order",
    pricingTitle: "Pricing",
    pricingDesc: "Monthly and yearly prices in Saudi Riyal.",
    monthly: "Monthly price",
    yearly: "Yearly price",
    limitsTitle: "Operating limits",
    limitsDesc: "Maximum users, branches, warehouses, and POS terminals.",
    users: "Users",
    branches: "Branches",
    warehouses: "Warehouses",
    pos: "POS",
    featuresTitle: "Plan features",
    featuresDesc:
      "Select available feature groups. Add a custom feature when needed without writing JSON.",
    suggestedFeatures: "Available features",
    selectedFeatures: "Selected features",
    noFeatures: "No features selected yet.",
    customFeature: "Custom feature",
    customPlaceholder: "Example: custom_feature",
    addFeature: "Add",
    stateTitle: "Status & visibility",
    stateDesc: "Plan activation and subscription visibility.",
    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    save: "Save",
    cancel: "Cancel",
    requiredName: "Plan name is required.",
    invalidNumber: "Numeric values must be zero or greater.",
  },
} as const;

export function SystemPlanForm({
  locale,
  initialValues,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  locale: SystemLocale;
  initialValues: PlanFormValues;
  busy: boolean;
  submitLabel?: string;
  onSubmit: (values: PlanFormValues) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [values, setValues] = React.useState<PlanFormValues>(initialValues);
  const [customFeature, setCustomFeature] = React.useState("");
  const [error, setError] = React.useState("");
  const t = translations[locale];

  function update<K extends keyof PlanFormValues>(
    key: K,
    value: PlanFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleFeature(feature: string) {
    setValues((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  }

  function removeFeature(feature: string) {
    setValues((current) => ({
      ...current,
      features: current.features.filter((item) => item !== feature),
    }));
  }

  function addCustomFeature() {
    const feature = customFeature.trim();
    if (!feature) return;

    setValues((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features
        : [...current.features, feature],
    }));
    setCustomFeature("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!values.name.trim()) {
      setError(t.requiredName);
      return;
    }

    const numericValues = [
      values.monthlyPrice,
      values.yearlyPrice,
      values.maxUsers,
      values.maxBranches,
      values.maxWarehouses,
      values.maxPos,
      values.sortOrder,
    ].map((value) => Number(value || 0));

    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      setError(t.invalidNumber);
      return;
    }

    await onSubmit(values);
  }

  const limitFields: Array<
    [
      "maxUsers" | "maxBranches" | "maxWarehouses" | "maxPos",
      string,
    ]
  > = [
    ["maxUsers", t.users],
    ["maxBranches", t.branches],
    ["maxWarehouses", t.warehouses],
    ["maxPos", t.pos],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle icon={Layers3}>{t.basicTitle}</CardTitle>
          <CardDescription>{t.basicDesc}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="plan-name">{t.name}</Label>
            <Input
              id="plan-name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.code}</Label>
            <Select
              value={values.code}
              onValueChange={(value) => update("code", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_CODES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-slug">{t.slug}</Label>
            <Input
              id="plan-slug"
              dir="ltr"
              lang="en"
              value={values.slug}
              onChange={(event) => update("slug", event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2 xl:col-span-3">
            <Label htmlFor="plan-description">{t.description}</Label>
            <Textarea
              id="plan-description"
              rows={4}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-sort">{t.sortOrder}</Label>
            <Input
              id="plan-sort"
              type="number"
              min="0"
              step="1"
              value={values.sortOrder}
              onChange={(event) => update("sortOrder", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={WalletCards}>{t.pricingTitle}</CardTitle>
            <CardDescription>{t.pricingDesc}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-monthly">{t.monthly}</Label>
              <Input
                id="plan-monthly"
                type="number"
                min="0"
                step="0.01"
                value={values.monthlyPrice}
                onChange={(event) => update("monthlyPrice", event.target.value)}
              />
              <div className="text-sm text-muted-foreground">
                <MoneyValue amount={values.monthlyPrice || 0} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-yearly">{t.yearly}</Label>
              <Input
                id="plan-yearly"
                type="number"
                min="0"
                step="0.01"
                value={values.yearlyPrice}
                onChange={(event) => update("yearlyPrice", event.target.value)}
              />
              <div className="text-sm text-muted-foreground">
                <MoneyValue amount={values.yearlyPrice || 0} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Settings2}>{t.limitsTitle}</CardTitle>
            <CardDescription>{t.limitsDesc}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            {limitFields.map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`plan-${key}`}>{label}</Label>
                <Input
                  id={`plan-${key}`}
                  type="number"
                  min="0"
                  step="1"
                  value={values[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Layers3}>{t.featuresTitle}</CardTitle>
          <CardDescription>{t.featuresDesc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t.suggestedFeatures}</Label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {PLAN_FEATURE_OPTIONS.map((feature) => {
                const selected = values.features.includes(feature.key);

                return (
                  <Button
                    key={feature.key}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => toggleFeature(feature.key)}
                  >
                    {selected ? <Check /> : <Plus />}
                    {planFeatureLabel(feature.key, locale)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.selectedFeatures}</Label>
            {values.features.length ? (
              <div className="flex flex-wrap gap-2">
                {values.features.map((feature) => (
                  <Button
                    key={feature}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFeature(feature)}
                  >
                    <X />
                    {planFeatureLabel(feature, locale)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.noFeatures}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-custom-feature">{t.customFeature}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="plan-custom-feature"
                dir="ltr"
                lang="en"
                value={customFeature}
                placeholder={t.customPlaceholder}
                onChange={(event) => setCustomFeature(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomFeature();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addCustomFeature}
                disabled={!customFeature.trim()}
              >
                <Plus />
                {t.addFeature}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={ShieldCheck}>{t.stateTitle}</CardTitle>
          <CardDescription>{t.stateDesc}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t.active}</Label>
            <Select
              value={values.active ? "active" : "inactive"}
              onValueChange={(value) => update("active", value === "active")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t.active}</SelectItem>
                <SelectItem value="inactive">{t.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.public}</Label>
            <Select
              value={values.public ? "public" : "internal"}
              onValueChange={(value) => update("public", value === "public")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t.public}</SelectItem>
                <SelectItem value="internal">{t.internal}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            {t.cancel}
          </Button>
        ) : null}

        <Button type="submit" disabled={busy}>
          <Save />
          {submitLabel || t.save}
        </Button>
      </div>
    </form>
  );
}
