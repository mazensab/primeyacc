"use client";
/* ============================================================
   primey_frontend/app/system/companies/[id]/users/create/page.tsx
   Mhamcloud - System Company User Create Page V1.0
   ------------------------------------------------------------
   - Separate company-user creation page.
   - Does not use /system/users/create.
   - Uses POST /api/system/companies/{company_id}/users/create/.
   - CompanyRole only, not SystemRole.
   - Session + CSRF safe fetch.
   - Arabic/English via primey-locale.
   - ASCII-only source to avoid PowerShell encoding issues.
============================================================ */
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
type Locale = "ar" | "en";
type UnknownRecord = Record<string, unknown>;
type CompanyInfo = {
  id: string;
  name: string;
  companyCode: string;
};
const ROLE_OPTIONS = [
  { value: "OWNER", key: "owner" },
  { value: "ADMIN", key: "admin" },
  { value: "MANAGER", key: "manager" },
  { value: "ACCOUNTANT", key: "accountant" },
  { value: "CASHIER", key: "cashier" },
  { value: "SALES", key: "sales" },
  { value: "INVENTORY", key: "inventory" },
  { value: "HR", key: "hr" },
  { value: "EMPLOYEE", key: "employee" },
  { value: "VIEWER", key: "viewer" },
] as const;
type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];
type FormState = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  password: string;
  phone: string;
  mobile: string;
  whatsapp_number: string;
  role: RoleValue;
  job_title: string;
  department: string;
  notes: string;
};
const initialForm: FormState = {
  email: "",
  username: "",
  first_name: "",
  last_name: "",
  display_name: "",
  password: "",
  phone: "",
  mobile: "",
  whatsapp_number: "",
  role: "ADMIN",
  job_title: "",
  department: "",
  notes: "",
};
const copy = {
  ar: {
    title: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062a\u062e\u062f\u0645 \u0634\u0631\u0643\u0629",
    subtitle:
      "\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062a\u062e\u062f\u0645 \u062f\u0627\u062e\u0644 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0646 \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u062f\u0648\u0646 \u062e\u0644\u0637\u0647 \u0645\u0639 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0646\u0638\u0627\u0645.",
    badge: "\u0645\u0633\u062a\u062e\u062f\u0645 \u0634\u0631\u0643\u0629",
    back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0634\u0631\u0643\u0629",
    companyLoading:
      "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629...",
    companyUnavailable:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629. \u064a\u0645\u0643\u0646\u0643 \u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0631\u0642\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0635\u062d\u064a\u062d\u064b\u0627.",
    accountData: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628",
    accountDesc:
      "\u0627\u0644\u0628\u0631\u064a\u062f \u0648\u0627\u0644\u0627\u0633\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
    membershipData:
      "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0636\u0648\u064a\u0629",
    membershipDesc:
      "\u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0648\u0638\u064a\u0641\u064a \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.",
    email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
    username: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
    lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
    displayName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u0631\u0648\u0636",
    password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
    mobile: "\u0627\u0644\u062c\u0648\u0627\u0644",
    whatsapp: "\u0648\u0627\u062a\u0633\u0627\u0628",
    role:
      "\u062f\u0648\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629",
    jobTitle: "\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064a\u0641\u064a",
    department: "\u0627\u0644\u0642\u0633\u0645",
    notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
    create:
      "\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0634\u0631\u0643\u0629",
    creating: "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...",
    required:
      "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629.",
    created:
      "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u0646\u062c\u0627\u062d.",
    createFailed:
      "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0634\u0631\u0643\u0629.",
    company: "\u0627\u0644\u0634\u0631\u0643\u0629",
    owner: "\u0645\u0627\u0644\u0643",
    admin: "\u0645\u062f\u064a\u0631",
    manager: "\u0645\u0634\u0631\u0641",
    accountant: "\u0645\u062d\u0627\u0633\u0628",
    cashier: "\u0643\u0627\u0634\u064a\u0631",
    sales: "\u0645\u0628\u064a\u0639\u0627\u062a",
    inventory: "\u0645\u062e\u0632\u0648\u0646",
    hr: "\u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629",
    employee: "\u0645\u0648\u0638\u0641",
    viewer: "\u0645\u0634\u0627\u0647\u062f",
  },
  en: {
    title: "Add company user",
    subtitle:
      "Create a user inside this company from the system workspace without mixing it with system users.",
    badge: "Company user",
    back: "Back to company details",
    companyLoading: "Loading company details...",
    companyUnavailable:
      "Could not load company details. You can continue if the company id is correct.",
    accountData: "Account details",
    accountDesc: "Email, name, and password.",
    membershipData: "Membership details",
    membershipDesc: "Company role and work details.",
    email: "Email",
    username: "Username",
    firstName: "First name",
    lastName: "Last name",
    displayName: "Display name",
    password: "Password",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp",
    role: "Company role",
    jobTitle: "Job title",
    department: "Department",
    notes: "Notes",
    create: "Create company user",
    creating: "Creating...",
    required: "Email and password are required.",
    created: "Company user created successfully.",
    createFailed: "Could not create company user.",
    company: "Company",
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    accountant: "Accountant",
    cashier: "Cashier",
    sales: "Sales",
    inventory: "Inventory",
    hr: "HR",
    employee: "Employee",
    viewer: "Viewer",
  },
} as const;
function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return {};
}
function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}
async function readJson(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { message: raw };
  }
}
function normalizeCompany(payload: unknown, fallbackId: string): CompanyInfo {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const company = asRecord(data.company ?? root.company ?? data);
  return {
    id: text(company.id, fallbackId),
    name:
      text(company.display_name) ||
      text(company.name) ||
      text(company.name_ar) ||
      text(company.name_en) ||
      fallbackId,
    companyCode: text(company.company_code) || text(company.code),
  };
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const stored =
    window.localStorage.getItem("primey-locale") ||
    window.localStorage.getItem("locale");
  return stored === "en" ? "en" : "ar";
}
function fieldClassName() {
  return "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
}
function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      <span>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName()}
      />
    </label>
  );
}
export default function SystemCompanyUserCreatePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = React.useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || "";
    }
    return String(raw || "");
  }, [params]);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [company, setCompany] = React.useState<CompanyInfo | null>(null);
  const [companyLoading, setCompanyLoading] = React.useState(true);
  const [companyError, setCompanyError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  React.useEffect(() => {
    setLocale(getInitialLocale());
  }, []);
  React.useEffect(() => {
    let active = true;
    async function loadCompany() {
      if (!companyId) {
        setCompanyLoading(false);
        setCompanyError(true);
        return;
      }
      setCompanyLoading(true);
      setCompanyError(false);
      try {
        const response = await fetch(`/api/system/companies/${companyId}/`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error("COMPANY_LOAD_FAILED");
        }
        if (active) {
          setCompany(normalizeCompany(payload, companyId));
        }
      } catch {
        if (active) {
          setCompanyError(false);
          setCompany({
            id: companyId,
            name: companyId,
            companyCode: "",
          });
        }
      } finally {
        if (active) {
          setCompanyLoading(false);
        }
      }
    }
    void loadCompany();
    return () => {
      active = false;
    };
  }, [companyId]);
  const t = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(
        `/api/system/companies/${companyId}/users/create/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          body: JSON.stringify({
            email: form.email.trim(),
            username: (form.username || form.email).trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            display_name: form.display_name.trim(),
            password: form.password,
            phone: form.phone.trim(),
            mobile: form.mobile.trim(),
            whatsapp_number: form.whatsapp_number.trim(),
            role: form.role,
            status: "ACTIVE",
            job_title: form.job_title.trim(),
            department: form.department.trim(),
            notes: form.notes.trim(),
          }),
        },
      );
      const payload = await readJson(response);
      const root = asRecord(payload);
      if (!response.ok || root.ok === false) {
        throw new Error(text(root.message, t.createFailed));
      }
      toast.success(t.created);
      router.push(`/system/companies/${companyId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.createFailed);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main
      dir={dir}
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        <section className="rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.badge}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {t.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t.subtitle}
                </p>
              </div>
            </div>
            <Link
              href={`/system/companies/${companyId}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>
          </div>
        </section>
        <section className="rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t.company}
                </p>
                {companyLoading ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.companyLoading}
                  </p>
                ) : (
                  <div>
                    <p className="mt-1 text-lg font-semibold">
                      {company?.name || companyId}
                    </p>
                    {company?.companyCode ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {company.companyCode}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {companyError ? (
              <p className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {t.companyUnavailable}
              </p>
            ) : null}
          </div>
        </section>
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t.accountData}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.accountDesc}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label={t.email}
                value={form.email}
                required
                type="email"
                autoComplete="email"
                onChange={(value) => updateField("email", value)}
              />
              <TextField
                label={t.username}
                value={form.username}
                autoComplete="username"
                onChange={(value) => updateField("username", value)}
              />
              <TextField
                label={t.firstName}
                value={form.first_name}
                autoComplete="given-name"
                onChange={(value) => updateField("first_name", value)}
              />
              <TextField
                label={t.lastName}
                value={form.last_name}
                autoComplete="family-name"
                onChange={(value) => updateField("last_name", value)}
              />
              <TextField
                label={t.displayName}
                value={form.display_name}
                onChange={(value) => updateField("display_name", value)}
              />
              <TextField
                label={t.password}
                value={form.password}
                required
                type="password"
                autoComplete="new-password"
                onChange={(value) => updateField("password", value)}
              />
              <TextField
                label={t.phone}
                value={form.phone}
                autoComplete="tel"
                onChange={(value) => updateField("phone", value)}
              />
              <TextField
                label={t.mobile}
                value={form.mobile}
                autoComplete="tel"
                onChange={(value) => updateField("mobile", value)}
              />
              <TextField
                label={t.whatsapp}
                value={form.whatsapp_number}
                autoComplete="tel"
                onChange={(value) => updateField("whatsapp_number", value)}
              />
            </div>
          </section>
          <section className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t.membershipData}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.membershipDesc}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                <span>
                  {t.role}
                  <span className="text-destructive"> *</span>
                </span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    updateField("role", event.target.value as RoleValue)
                  }
                  className={fieldClassName()}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.value} - {t[role.key]}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label={t.jobTitle}
                value={form.job_title}
                onChange={(value) => updateField("job_title", value)}
              />
              <TextField
                label={t.department}
                value={form.department}
                onChange={(value) => updateField("department", value)}
              />
              <label className="block text-sm font-medium">
                <span>{t.notes}</span>
                <textarea
                  value={form.notes}
                  rows={5}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting ? t.creating : t.create}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}