"use client";
/* ============================================================
   ?? primey_frontend/app/company/whatsapp/page.tsx
   ?? Mhamcloud ? Company WhatsApp Workspace Page V1.0
   ------------------------------------------------------------
   ? Company workspace route: /company/whatsapp
   ? Real company API only: /api/company/whatsapp/*
   ? Settings + templates + message logs + manual mock send
   ? No external WhatsApp provider calls from frontend
   ? Session auth + CSRF + credentials include
============================================================ */
import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Settings2,
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
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ViewMode = "send" | "settings" | "templates" | "messages";
type ApiRecord = Record<string, unknown>;
type SettingRow = {
  id: string;
  isEnabled: boolean;
  provider: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  defaultCountryCode: string;
  hasAccessToken: boolean;
  hasWebhookVerifyToken: boolean;
  updatedAt: string;
};
type TemplateRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
  isActive: boolean;
};
type MessageRow = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  messageBody: string;
  status: string;
  direction: string;
  provider: string;
  sourceType: string;
  createdAt: string;
  templateName: string;
  errorMessage: string;
};
type SendForm = {
  recipientName: string;
  recipientPhone: string;
  messageBody: string;
  templateId: string;
  templateVariables: string;
};
const API_ROOT = "/api/company/whatsapp/";
const translations = {
  ar: {
    pageBadge: "?????? ??????",
    pageTitle: "???? ??????",
    pageDescription:
      "????? ??????? ?????? ?????? ???????? ???????? ??? ???????? ?????? ????? ??????? ??? API ??????.",
    mockNotice:
      "??????? ?????? ???? ??????? ?? mock/send ???? ?????? ??? ?????? ???? ?????? ?????.",
    send: "?????",
    settings: "?????????",
    templates: "???????",
    messages: "??? ???????",
    refresh: "?????",
    enabled: "????",
    disabled: "??? ????",
    provider: "??????",
    phone: "??? ??????",
    token: "??????",
    configured: "?????",
    notConfigured: "??? ?????",
    defaultCountry: "??? ??????",
    templateCount: "??? ???????",
    messageCount: "??? ???????",
    activeTemplates: "????? ?????",
    failedMessages: "????? ?????",
    sendTitle: "????? ????? ??????",
    sendDesc: "???? ????? ????? ?? ?????? ?????? ??????. ???? ??????? ?? ??? ???????.",
    recipientName: "??? ???????",
    recipientPhone: "??? ???????",
    messageBody: "?? ???????",
    template: "??????",
    noTemplate: "???? ????",
    variablesJson: "??????? ?????? JSON",
    recipientNamePlaceholder: "????: ????",
    recipientPhonePlaceholder: "????: 0500000000",
    messagePlaceholder: "???? ?? ??????? ???...",
    variablesPlaceholder: "{\"name\":\"Ahmed\"}",
    sendNow: "????? ????",
    sending: "???? ???????...",
    loadError: "???? ????? ?????? ?????? ??????.",
    sendError: "???? ????? ????? ??????.",
    sent: "?? ?????/????? ????? ?????? ?????.",
    phoneRequired: "??? ??????? ?????.",
    bodyOrTemplateRequired: "???? ????? ?? ???? ??????.",
    invalidJson: "???? JSON ????????? ??? ?????.",
    noData: "?? ???? ?????? ??? ????.",
    status: "??????",
    category: "???????",
    language: "?????",
    body: "???????",
    direction: "???????",
    sourceType: "??????",
    createdAt: "????? ???????",
    error: "?????",
    latestMessages: "??? ???????",
    companySettings: "??????? ??????",
    templatesTitle: "????? ??????",
  },
  en: {
    pageBadge: "Company WhatsApp",
    pageTitle: "WhatsApp Center",
    pageDescription:
      "Manage company WhatsApp settings, templates, message logs, and send a manual mock message through the company API.",
    mockNotice:
      "Current sending logs the message as mock/send inside the system and does not call an external WhatsApp provider.",
    send: "Send",
    settings: "Settings",
    templates: "Templates",
    messages: "Message logs",
    refresh: "Refresh",
    enabled: "Enabled",
    disabled: "Disabled",
    provider: "Provider",
    phone: "WhatsApp phone",
    token: "Token",
    configured: "Configured",
    notConfigured: "Not configured",
    defaultCountry: "Default country",
    templateCount: "Templates",
    messageCount: "Messages",
    activeTemplates: "Active templates",
    failedMessages: "Failed messages",
    sendTitle: "Send WhatsApp message",
    sendDesc: "Send a manual message or use an active template. It will be recorded in message logs.",
    recipientName: "Recipient name",
    recipientPhone: "Recipient phone",
    messageBody: "Message body",
    template: "Template",
    noTemplate: "No template",
    variablesJson: "Template variables JSON",
    recipientNamePlaceholder: "Example: Ahmed",
    recipientPhonePlaceholder: "Example: 0500000000",
    messagePlaceholder: "Write the message here...",
    variablesPlaceholder: "{\"name\":\"Ahmed\"}",
    sendNow: "Send now",
    sending: "Sending...",
    loadError: "Could not load company WhatsApp data.",
    sendError: "Could not send WhatsApp message.",
    sent: "WhatsApp message sent/logged successfully.",
    phoneRequired: "Recipient phone is required.",
    bodyOrTemplateRequired: "Write a message or choose a template.",
    invalidJson: "Template variables JSON is invalid.",
    noData: "No data yet.",
    status: "Status",
    category: "Category",
    language: "Language",
    body: "Body",
    direction: "Direction",
    sourceType: "Source",
    createdAt: "Created at",
    error: "Error",
    latestMessages: "Latest messages",
    companySettings: "Company settings",
    templatesTitle: "WhatsApp templates",
  },
} as const;
function normalizeLocale(value?: string | null): Locale {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "ar" || normalized.startsWith("ar-")) return "ar";
  return "en";
}
function readLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return normalizeLocale(window.localStorage.getItem("primey-locale") || "ar");
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] || "") : "";
}
function asRecord(value: unknown): ApiRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ApiRecord;
  }
  return {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function readText(record: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return fallback;
}
function readBool(record: ApiRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}
function extractResults(payload: unknown, fallbackKey: string): ApiRecord[] {
  const record = asRecord(payload);
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }
  const direct = record[fallbackKey];
  if (Array.isArray(direct)) {
    return direct.map(asRecord);
  }
  const results = record.results;
  if (Array.isArray(results)) {
    return results.map(asRecord);
  }
  const data = asRecord(record.data);
  if (Array.isArray(data.results)) {
    return data.results.map(asRecord);
  }
  return [];
}
function extractSetting(payload: unknown): SettingRow | null {
  const record = asRecord(payload);
  const settingRecord = asRecord(record.setting || record.data || payload);
  if (!Object.keys(settingRecord).length) return null;
  return {
    id: readText(settingRecord, ["id"], "setting"),
    isEnabled: readBool(settingRecord, ["is_enabled", "isEnabled"]),
    provider: readText(settingRecord, ["provider"], "MOCK"),
    phoneNumber: readText(settingRecord, ["phone_number", "phoneNumber"]),
    phoneNumberId: readText(settingRecord, ["phone_number_id", "phoneNumberId"]),
    businessAccountId: readText(settingRecord, ["business_account_id", "businessAccountId"]),
    defaultCountryCode: readText(settingRecord, ["default_country_code", "defaultCountryCode"], "+966"),
    hasAccessToken: readBool(settingRecord, ["has_access_token", "hasAccessToken"]),
    hasWebhookVerifyToken: readBool(settingRecord, ["has_webhook_verify_token", "hasWebhookVerifyToken"]),
    updatedAt: readText(settingRecord, ["updated_at", "updatedAt"]),
  };
}
function normalizeTemplate(record: ApiRecord): TemplateRow {
  const variablesValue = record.variables;
  const variables = Array.isArray(variablesValue)
    ? variablesValue.map((item) => String(item))
    : [];
  const status = readText(record, ["status"], "DRAFT").toUpperCase();
  return {
    id: readText(record, ["id"]),
    name: readText(record, ["name"], "Template"),
    code: readText(record, ["code"]),
    status,
    category: readText(record, ["category"], "GENERAL"),
    language: readText(record, ["language"], "ar"),
    body: readText(record, ["body", "message_body", "content"]),
    variables,
    isActive: readBool(record, ["is_active", "isActive"], status === "ACTIVE"),
  };
}
function normalizeMessage(record: ApiRecord): MessageRow {
  const template = asRecord(record.template);
  return {
    id: readText(record, ["id"]),
    recipientName: readText(record, ["recipient_name", "recipientName"]),
    recipientPhone: readText(record, ["recipient_phone", "recipientPhone"]),
    messageBody: readText(record, ["message_body", "messageBody", "body", "content"]),
    status: readText(record, ["status"], "DRAFT").toUpperCase(),
    direction: readText(record, ["direction"], "OUTBOUND"),
    provider: readText(record, ["provider"], "MOCK"),
    sourceType: readText(record, ["source_type", "sourceType"], "MANUAL"),
    createdAt: readText(record, ["created_at", "createdAt"]),
    templateName: readText(template, ["name", "code"]),
    errorMessage: readText(record, ["error_message", "errorMessage"]),
  };
}
function statusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (["ACTIVE", "SENT", "DELIVERED", "READ"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "CANCELLED", "ARCHIVED"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (["QUEUED", "DRAFT", "INACTIVE"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border bg-muted text-muted-foreground";
}
function formatDate(value: string, locale: Locale): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ar" ? "ar-SA" : "en-US");
}
async function ensureCsrf(): Promise<string> {
  await fetch("/api/auth/csrf/", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return getCookie("csrftoken");
}
async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = readText(asRecord(payload), ["message", "detail", "error"], `Request failed with status ${response.status}`);
    throw new Error(message);
  }
  return payload;
}
async function postJson(path: string, payload: ApiRecord): Promise<unknown> {
  const csrfToken = await ensureCsrf();
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = readText(asRecord(data), ["message", "detail", "error"], `Request failed with status ${response.status}`);
    throw new Error(message);
  }
  return data;
}
function KpiCard({
  title,
  value,
  description,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
}) {
  return (
    <Card className="rounded-2xl border-border/80">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
export default function CompanyWhatsAppPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [view, setView] = React.useState<ViewMode>("send");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [setting, setSetting] = React.useState<SettingRow | null>(null);
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [form, setForm] = React.useState<SendForm>({
    recipientName: "",
    recipientPhone: "",
    messageBody: "",
    templateId: "",
    templateVariables: "{}",
  });
  React.useEffect(() => {
    setLocale(readLocale());
  }, []);
  const t = translations[locale];
  const isRtl = locale === "ar";
  const activeTemplates = React.useMemo(
    () => templates.filter((template) => template.status === "ACTIVE" || template.isActive),
    [templates],
  );
  const failedMessages = React.useMemo(
    () => messages.filter((message) => message.status === "FAILED").length,
    [messages],
  );
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsPayload, templatesPayload, messagesPayload] = await Promise.all([
        fetchJson(`${API_ROOT}settings/`),
        fetchJson(`${API_ROOT}templates/?limit=100`),
        fetchJson(`${API_ROOT}messages/?limit=100`),
      ]);
      setSetting(extractSetting(settingsPayload));
      setTemplates(extractResults(templatesPayload, "templates").map(normalizeTemplate));
      setMessages(extractResults(messagesPayload, "messages").map(normalizeMessage));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : t.loadError;
      setError(message);
      toast.error(message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
  React.useEffect(() => {
    void loadData();
  }, [loadData]);
  function updateForm(key: keyof SendForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function handleSend() {
    const recipientPhone = form.recipientPhone.trim();
    const messageBody = form.messageBody.trim();
    const templateId = form.templateId.trim();
    if (!recipientPhone) {
      toast.error(t.phoneRequired);
      return;
    }
    if (!messageBody && !templateId) {
      toast.error(t.bodyOrTemplateRequired);
      return;
    }
    let templateVariables: ApiRecord = {};
    if (templateId) {
      try {
        templateVariables = asRecord(JSON.parse(form.templateVariables || "{}"));
      } catch {
        toast.error(t.invalidJson);
        return;
      }
    }
    const payload: ApiRecord = {
      recipient_phone: recipientPhone,
      recipient_name: form.recipientName.trim(),
      source_type: "MANUAL",
    };
    if (templateId) {
      payload.template_id = Number(templateId);
      payload.template_variables = templateVariables;
    } else {
      payload.message_body = messageBody;
    }
    setSending(true);
    try {
      await postJson(`${API_ROOT}messages/send/`, payload);
      toast.success(t.sent);
      setForm((current) => ({
        ...current,
        messageBody: "",
        templateVariables: "{}",
      }));
      await loadData();
      setView("messages");
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : t.sendError;
      toast.error(message || t.sendError);
    } finally {
      setSending(false);
    }
  }
  const dirClass = isRtl ? "text-right" : "text-left";
  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-6" dir={isRtl ? "rtl" : "ltr"}>
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className={cn("space-y-2", dirClass)}>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <MessageCircle className="me-2 h-3.5 w-3.5" />
              {t.pageBadge}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">{t.pageTitle}</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t.pageDescription}</p>
          </div>
          <Button onClick={() => void loadData()} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
            {t.refresh}
          </Button>
        </div>
        <Card className="rounded-2xl border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t.mockNotice}</p>
          </CardContent>
        </Card>
        {error ? (
          <Card className="rounded-2xl border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.provider}
            value={setting?.provider || "MOCK"}
            description={setting?.isEnabled ? t.enabled : t.disabled}
          />
          <KpiCard
            title={t.templateCount}
            value={templates.length}
            description={`${t.activeTemplates}: ${activeTemplates.length}`}
          />
          <KpiCard
            title={t.messageCount}
            value={messages.length}
            description={`${t.failedMessages}: ${failedMessages}`}
          />
          <KpiCard
            title={t.phone}
            value={setting?.phoneNumber || "-"}
            description={`${t.defaultCountry}: ${setting?.defaultCountryCode || "+966"}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["send", Send, t.send],
            ["settings", Settings2, t.settings],
            ["templates", FileText, t.templates],
            ["messages", MessageCircle, t.messages],
          ] as const).map(([key, Icon, label]) => (
            <Button
              key={key}
              type="button"
              variant={view === key ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setView(key)}
            >
              <Icon className="me-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t.refresh}</span>
            </CardContent>
          </Card>
        ) : null}
        {!loading && view === "send" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.sendTitle}</CardTitle>
              <CardDescription>{t.sendDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.recipientName}</label>
                <Input
                  value={form.recipientName}
                  onChange={(event) => updateForm("recipientName", event.target.value)}
                  placeholder={t.recipientNamePlaceholder}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.recipientPhone}</label>
                <Input
                  value={form.recipientPhone}
                  onChange={(event) => updateForm("recipientPhone", event.target.value)}
                  placeholder={t.recipientPhonePlaceholder}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">{t.template}</label>
                <select
                  value={form.templateId}
                  onChange={(event) => updateForm("templateId", event.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t.noTemplate}</option>
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ? {template.code}
                    </option>
                  ))}
                </select>
              </div>
              {form.templateId ? (
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium">{t.variablesJson}</label>
                  <Input
                    value={form.templateVariables}
                    onChange={(event) => updateForm("templateVariables", event.target.value)}
                    placeholder={t.variablesPlaceholder}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium">{t.messageBody}</label>
                  <textarea
                    value={form.messageBody}
                    onChange={(event) => updateForm("messageBody", event.target.value)}
                    placeholder={t.messagePlaceholder}
                    className="min-h-[140px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
              <div className={cn("lg:col-span-2", isRtl ? "text-left" : "text-right")}>
                <Button onClick={() => void handleSend()} disabled={sending} className="rounded-xl">
                  {sending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
                  {sending ? t.sending : t.sendNow}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {!loading && view === "settings" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.companySettings}</CardTitle>
              <CardDescription>{t.settings}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {setting ? (
                <>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                    <p className="mt-1 font-semibold">
                      {setting.isEnabled ? t.enabled : t.disabled}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">{t.provider}</p>
                    <p className="mt-1 font-semibold">{setting.provider}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">{t.phone}</p>
                    <p className="mt-1 font-semibold">{setting.phoneNumber || "-"}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">{t.token}</p>
                    <p className="mt-1 font-semibold">
                      {setting.hasAccessToken ? t.configured : t.notConfigured}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
        {!loading && view === "templates" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.templatesTitle}</CardTitle>
              <CardDescription>{t.templates}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.length ? (
                templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{template.code}</p>
                      </div>
                      <Badge variant="outline" className={cn("w-fit rounded-full", statusBadgeClass(template.status))}>
                        {template.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <p>{t.category}: {template.category}</p>
                      <p>{t.language}: {template.language}</p>
                      <p>{t.status}: {template.status}</p>
                    </div>
                    <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{template.body || "-"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
        {!loading && view === "messages" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.latestMessages}</CardTitle>
              <CardDescription>{t.messages}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {message.recipientName || message.recipientPhone || "-"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {message.recipientPhone || "-"} ? {formatDate(message.createdAt, locale)}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("w-fit rounded-full", statusBadgeClass(message.status))}>
                        {message.status}
                      </Badge>
                    </div>
                    <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{message.messageBody || "-"}</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                      <p>{t.provider}: {message.provider}</p>
                      <p>{t.direction}: {message.direction}</p>
                      <p>{t.sourceType}: {message.sourceType}</p>
                    </div>
                    {message.errorMessage ? (
                      <p className="mt-2 text-xs text-red-600">{t.error}: {message.errorMessage}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
