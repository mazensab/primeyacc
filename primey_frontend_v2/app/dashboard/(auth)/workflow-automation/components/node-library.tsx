"use client";

import * as React from "react";
import {
  Search,
  Star,
  ChevronUp,
  ChevronDown,
  Clock,
  FileText,
  Mail,
  Webhook,
  Timer,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NodeItem {
  id: string;
  name: string;
  description: string;
  bg: string;
  text: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const triggers: NodeItem[] = [
  { id: "stripe-1", name: "Stripe", description: "Payment Succeeded", bg: "bg-violet-500", text: "text-white", label: "S" },
  { id: "stripe-2", name: "Stripe", description: "Checkout Session Completed", bg: "bg-violet-500", text: "text-white", label: "S" },
  { id: "webhook", name: "Web hook", description: "Receive Incoming Webhook", bg: "bg-orange-500", text: "text-white", icon: Webhook },
  { id: "schedule", name: "Schedule", description: "Run on a Schedule", bg: "bg-blue-500", text: "text-white", icon: Clock },
  { id: "form", name: "Form", description: "New Form Submission", bg: "bg-blue-600", text: "text-white", icon: FileText },
  { id: "email", name: "Email", description: "New Email Received", bg: "bg-sky-500", text: "text-white", icon: Mail }
];

const actions: NodeItem[] = [
  { id: "slack", name: "Slack", description: "Send Message", bg: "bg-[#4A154B]", text: "text-white", label: "Sl" },
  { id: "sheets", name: "Google Sheets", description: "Add Row", bg: "bg-green-600", text: "text-white", label: "GS" },
  { id: "hubspot", name: "HubSpot", description: "Create/Update Contact", bg: "bg-orange-600", text: "text-white", label: "HS" },
  { id: "delay", name: "Delay", description: "Wait X Minutes", bg: "bg-purple-600", text: "text-white", icon: Timer },
  { id: "chatgpt", name: "Chatgpt", description: "Analyse & Generate Output", bg: "bg-emerald-600", text: "text-white", icon: Sparkles }
];

function NodeIcon({ item }: { item: NodeItem }) {
  const Icon = item.icon;
  return (
    <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", item.bg, item.text)}>
      {Icon ? <Icon className="size-3.5 text-white" /> : item.label}
    </div>
  );
}

function NodeRow({ item }: { item: NodeItem }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted/70 cursor-grab active:cursor-grabbing group transition-colors">
      <NodeIcon item={item} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
      </div>
      <Star className="size-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
    </div>
  );
}

function Section({ title, items }: { title: string; items: NodeItem[] }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="space-y-0.5 px-1">
          {items.map((item) => (
            <NodeRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodeLibrary() {
  const [search, setSearch] = React.useState("");

  const filteredTriggers = triggers.filter(
    (n) =>
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );
  const filteredActions = actions.filter(
    (n) =>
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-r bg-card">
      <div className="border-b px-3 pt-3 pb-3 space-y-3">
        <h2 className="text-sm font-semibold">Node Library</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search Nodes..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2 space-y-1">
          {(search === "" || filteredTriggers.length > 0) && (
            <Section title="Triggers" items={filteredTriggers} />
          )}
          {(search === "" || filteredActions.length > 0) && (
            <Section title="Actions" items={filteredActions} />
          )}
          {search !== "" && filteredTriggers.length === 0 && filteredActions.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No nodes found.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
