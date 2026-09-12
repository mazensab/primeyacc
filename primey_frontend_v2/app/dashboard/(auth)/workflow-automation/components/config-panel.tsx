"use client";

import * as React from "react";
import { Sheet, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/* ─── Field types ─── */

type ConnectionField = { type: "connection"; label: string };
type InputField     = { type: "input";      label: string; defaultValue: string; mono?: boolean };
type ToggleField    = { type: "toggle";     label: string; defaultValue: boolean };
type CurrencyField  = { type: "currency";   label: string; options: string[]; defaultValue: string };
type TextareaField  = { type: "textarea";   label: string; defaultValue: string };

type ConfigField = ConnectionField | InputField | ToggleField | CurrencyField | TextareaField;

type NodeConfig = {
  name: string;
  subtitle: string;
  avatar: React.ReactNode;
  fields: ConfigField[];
};

/* ─── Per-node configurations ─── */

const configs: Record<string, NodeConfig> = {
  stripe: {
    name: "Stripe",
    subtitle: "New Successful Payment",
    avatar: (
      <div className="size-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
        S
      </div>
    ),
    fields: [
      { type: "connection", label: "App Connection" },
      { type: "input",    label: "Event Type",      defaultValue: "Payment Succeeded" },
      { type: "toggle",   label: "Live Mode",       defaultValue: true },
      { type: "currency", label: "Currency",        options: ["USD", "EUR", "GBP"], defaultValue: "USD" },
      { type: "input",    label: "Minimum Amount",  defaultValue: "X >= $200", mono: true }
    ]
  },
  sheets: {
    name: "Google Sheets",
    subtitle: "Add New Row",
    avatar: (
      <div className="size-9 rounded-full bg-green-600 flex items-center justify-center shrink-0">
        <Sheet className="size-4 text-white" />
      </div>
    ),
    fields: [
      { type: "connection", label: "App Connection" },
      { type: "input", label: "Spreadsheet", defaultValue: "Orders 2025" },
      { type: "input", label: "Sheet",        defaultValue: "Sheet1" },
      { type: "input", label: "Row Data",     defaultValue: "{{trigger.data}}", mono: true }
    ]
  },
  chatgpt: {
    name: "Chatgpt",
    subtitle: "Analyse & Generate Output",
    avatar: (
      <div className="size-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
        <Sparkles className="size-4 text-white" />
      </div>
    ),
    fields: [
      { type: "connection", label: "App Connection" },
      { type: "input",    label: "Model",      defaultValue: "gpt-4o" },
      { type: "textarea", label: "Prompt",     defaultValue: "Analyse the following order and generate a summary..." },
      { type: "input",    label: "Max Tokens", defaultValue: "1024", mono: true }
    ]
  },
  email: {
    name: "Email",
    subtitle: "Send Order Receipt",
    avatar: (
      <div className="size-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
        <Mail className="size-4 text-white" />
      </div>
    ),
    fields: [
      { type: "input", label: "To",       defaultValue: "{{customer.email}}", mono: true },
      { type: "input", label: "Subject",  defaultValue: "Your Order Receipt" },
      { type: "input", label: "Template", defaultValue: "Order Confirmation" }
    ]
  },
  slack: {
    name: "Slack",
    subtitle: "Send Notification",
    avatar: (
      <div className="size-9 rounded-full bg-[#4A154B] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="size-4 fill-white">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      </div>
    ),
    fields: [
      { type: "connection", label: "App Connection" },
      { type: "input",    label: "Channel", defaultValue: "#orders" },
      { type: "textarea", label: "Message", defaultValue: "New payment received: {{trigger.amount}}" }
    ]
  }
};

/* ─── Field renderers ─── */

function FieldRenderer({ field }: { field: ConfigField }) {
  const [toggleVal, setToggleVal] = React.useState(
    field.type === "toggle" ? field.defaultValue : false
  );
  const [currencyVal, setCurrencyVal] = React.useState(
    field.type === "currency" ? field.defaultValue : ""
  );

  if (field.type === "connection") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{field.label}</label>
        <div>
          <Badge className="gap-1.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
            <span className="size-1.5 rounded-full bg-green-500 inline-block shrink-0" />
            Connected
          </Badge>
        </div>
      </div>
    );
  }

  if (field.type === "input") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{field.label}</label>
        <Input
          defaultValue={field.defaultValue}
          className={cn("h-8 text-sm", field.mono && "font-mono")}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{field.label}</label>
        <textarea
          defaultValue={field.defaultValue}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{field.label}</label>
        <Switch
          checked={toggleVal}
          onCheckedChange={setToggleVal}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    );
  }

  if (field.type === "currency") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{field.label}</label>
        <div className="flex gap-1.5">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setCurrencyVal(opt)}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-all",
                currencyVal === opt
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Main panel ─── */

type Props = { selectedNodeId: string; nodeData?: Record<string, unknown> | null; onClose?: () => void };

export function ConfigPanel({ selectedNodeId, nodeData, onClose }: Props) {
  const config = configs[selectedNodeId];

  if (!config) {
    const name        = (nodeData?.name        as string | undefined) ?? "Node";
    const description = (nodeData?.description as string | undefined) ?? "";
    const bg          = (nodeData?.bg          as string | undefined) ?? "bg-muted";
    const label       = (nodeData?.label       as string | undefined) ?? name[0];

    return (
      <div className="flex w-[284px] shrink-0 flex-col border-l bg-card">
        <div className="border-b px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">{name}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className={cn("size-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0", bg)}>
              {label}
            </div>
          </div>
        </div>
        <div className="px-4 pt-3 pb-0">
          <Tabs defaultValue="setup" className="gap-0">
            <TabsList variant="line" className="h-8 gap-4 px-0">
              <TabsTrigger value="setup" className="px-0 text-sm">Setup</TabsTrigger>
              <TabsTrigger value="configure" className="px-0 text-sm">Configure</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Separator />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground px-4 text-center">No configuration available for this node.</p>
        </div>
        <div className="border-t px-4 py-3 flex gap-2">
          <Button variant="outline" className="flex-1 h-8 text-sm" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-8 text-sm" onClick={onClose}>Proceed</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[284px] shrink-0 flex-col border-l bg-card">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">{config.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.subtitle}</p>
          </div>
          {config.avatar}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-0">
        <Tabs defaultValue="setup" className="gap-0">
          <TabsList variant="line" className="h-8 gap-4 px-0">
            <TabsTrigger value="setup" className="px-0 text-sm">Setup</TabsTrigger>
            <TabsTrigger value="configure" className="px-0 text-sm">Configure</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Separator />

      {/* Fields — key forces re-mount on node change so defaults reset */}
      <ScrollArea className="flex-1" key={selectedNodeId}>
        <div className="space-y-5 px-4 py-4">
          {config.fields.map((field, i) => (
            <FieldRenderer key={i} field={field} />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex gap-2">
        <Button variant="outline" className="flex-1 h-8 text-sm" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 h-8 text-sm" onClick={onClose}>Proceed</Button>
      </div>
    </div>
  );
}
