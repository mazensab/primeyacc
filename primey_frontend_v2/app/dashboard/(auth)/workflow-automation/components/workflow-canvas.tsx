"use client";

import "@xyflow/react/dist/style.css";

import * as React from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  type EdgeProps,
  type Connection,
  type OnNodeDrag,
  type ReactFlowInstance
} from "@xyflow/react";
import {
  Pencil,
  Link2,
  Trash2,
  MoreHorizontal,
  Zap,
  Sparkles,
  Mail,
  Sheet,
  Plus,
  Clock,
  FileText,
  Webhook,
  Timer,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useIsTablet } from "@/hooks/use-mobile";

/* ─── Types ─── */

type Side = "left" | "right" | "top" | "bottom";

type PendingAdd =
  | { kind: "side"; sourceId: string; side: Side }
  | { kind: "edge"; edgeId: string; sourceId: string; targetId: string; sourceHandle: string | null; targetHandle: string | null };

type AddNodeCtxValue = {
  openAddModal: (sourceId: string, side: Side) => void;
  openEdgeModal: (edgeId: string, sourceId: string, targetId: string, sourceHandle: string | null, targetHandle: string | null) => void;
  getConnectedHandles: (nodeId: string) => Set<string>;
};

const AddNodeCtx = React.createContext<AddNodeCtxValue>({
  openAddModal: () => {},
  openEdgeModal: () => {},
  getConnectedHandles: () => new Set()
});

/* ─── Node catalog ─── */

type CatalogItem = {
  value: string;
  name: string;
  description: string;
  bg: string;
  label?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  group: "trigger" | "action";
};

const CATALOG: CatalogItem[] = [
  { value: "stripe-payment",  name: "Stripe",        description: "Payment Succeeded",          bg: "bg-violet-500",  label: "S",  group: "trigger" },
  { value: "stripe-checkout", name: "Stripe",        description: "Checkout Session Completed", bg: "bg-violet-500",  label: "S",  group: "trigger" },
  { value: "webhook",         name: "Web hook",      description: "Receive Incoming Webhook",   bg: "bg-orange-500",  Icon: Webhook,  group: "trigger" },
  { value: "schedule",        name: "Schedule",      description: "Run on a Schedule",          bg: "bg-blue-500",    Icon: Clock,    group: "trigger" },
  { value: "form",            name: "Form",          description: "New Form Submission",        bg: "bg-blue-600",    Icon: FileText, group: "trigger" },
  { value: "email-trigger",   name: "Email",         description: "New Email Received",         bg: "bg-sky-500",     Icon: Mail,     group: "trigger" },
  { value: "slack-action",    name: "Slack",         description: "Send Message",               bg: "bg-[#4A154B]",   label: "Sl", group: "action"  },
  { value: "sheets-action",   name: "Google Sheets", description: "Add Row",                    bg: "bg-green-600",   Icon: Sheet,    group: "action"  },
  { value: "hubspot",         name: "HubSpot",       description: "Create/Update Contact",      bg: "bg-orange-600",  label: "HS", group: "action"  },
  { value: "delay",           name: "Delay",         description: "Wait X Minutes",             bg: "bg-purple-600",  Icon: Timer,    group: "action"  },
  { value: "chatgpt-action",  name: "Chatgpt",       description: "Analyse & Generate Output",  bg: "bg-emerald-600", Icon: Sparkles, group: "action"  }
];

/* ─── Handle styles ─── */

const hiddenHs: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "transparent", border: "none", opacity: 0
};

const visibleHs: React.CSSProperties = {
  width: 10, height: 10, borderRadius: "50%",
  background: "var(--card)", border: "2px solid var(--border)",
  cursor: "crosshair"
};

/* ─── Smart handle: visible only when selected + unconnected ─── */

function NodeHandle({ nodeId, selected, type, position, id }: {
  nodeId: string;
  selected: boolean;
  type: "source" | "target";
  position: Position;
  id: string;
}) {
  const { getConnectedHandles } = React.useContext(AddNodeCtx);
  const connected = getConnectedHandles(nodeId);
  const isHandleConnected = connected.has(id);
  const showDot = selected && !isHandleConnected;
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={showDot ? visibleHs : hiddenHs}
    />
  );
}

/* ─── + Button ─── */

function AddBtn({ nodeId, side }: { nodeId: string; side: Side }) {
  const { openAddModal } = React.useContext(AddNodeCtx);
  return (
    <button
      className={cn(
        "nodrag nopan absolute size-5 rounded-full",
        "border-2 border-border bg-card shadow-sm",
        "flex items-center justify-center",
        "hover:border-primary hover:bg-primary hover:text-primary-foreground",
        "transition-colors z-10",
        side === "left"   && "-left-[11px] top-1/2 -translate-y-1/2",
        side === "right"  && "-right-[11px] top-1/2 -translate-y-1/2",
        side === "top"    && "-top-[11px] left-1/2 -translate-x-1/2",
        side === "bottom" && "-bottom-[11px] left-1/2 -translate-x-1/2"
      )}
      onClick={(e) => { e.stopPropagation(); openAddModal(nodeId, side); }}
    >
      <Plus className="size-2.5" strokeWidth={2.5} />
    </button>
  );
}

/* ─── Edge with + button at midpoint ─── */

function ButtonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, source, target, sourceHandleId, targetHandleId }: EdgeProps) {
  const { openEdgeModal } = React.useContext(AddNodeCtx);
  const [hovered, setHovered] = React.useState(false);
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      {/* Visible path */}
      <path d={edgePath} fill="none" className="react-flow__edge-path" style={style} />
      {/* Wide transparent path for reliable hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        {hovered && (
          <button
            style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}
            className="nodrag nopan absolute size-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors pointer-events-auto"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => { e.stopPropagation(); openEdgeModal(id, source, target, sourceHandleId ?? null, targetHandleId ?? null); }}
          >
            <Plus className="size-2.5" strokeWidth={2.5} />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

/* ─── Shared hook for + button visibility ─── */

function useAddBtns(id: string, selected: boolean, handles: Side[]) {
  const { getConnectedHandles } = React.useContext(AddNodeCtx);
  if (!selected) return [];
  const connected = getConnectedHandles(id);
  return handles.filter((s) => !connected.has(s));
}

/* ─── Node components ─── */

function StripeNode({ id, selected }: NodeProps) {
  const freeSides = useAddBtns(id, selected, ["left", "right", "bottom"]);
  return (
    <div className={cn(
      "relative w-[272px] rounded-xl border bg-card shadow-sm p-3 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">S</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none">Stripe</p>
          <p className="text-xs text-muted-foreground mt-0.5">New Successful Payment</p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 shrink-0">
          <Zap className="size-3" />Trigger
        </Badge>
      </div>
      <div className="mt-2.5 pt-2.5 border-t flex items-start gap-1.5">
        <Zap className="size-3 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">Fires when a customer completes a purchase.</p>
      </div>
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
    </div>
  );
}

function SheetsNode({ id, selected }: NodeProps) {
  const freeSides = useAddBtns(id, selected, ["left", "right", "top", "bottom"]);
  return (
    <div className={cn(
      "relative w-[240px] rounded-xl border bg-card shadow-sm p-3 flex items-center gap-2.5 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Top}    id="top"    />
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
      <div className="size-8 rounded-full bg-green-600 flex items-center justify-center shrink-0"><Sheet className="size-3.5 text-white" /></div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">Google Sheets</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">Add New Row</p>
      </div>
    </div>
  );
}

function ChatGPTNode({ id, selected }: NodeProps) {
  const freeSides = useAddBtns(id, selected, ["left", "right", "top", "bottom"]);
  return (
    <div className={cn(
      "relative w-[210px] rounded-xl border bg-card shadow-sm p-3 flex items-center gap-2.5 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Top}    id="top"    />
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
      <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"><Sparkles className="size-3.5 text-white" /></div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">Chatgpt</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">Analyse & Generate Output</p>
      </div>
    </div>
  );
}

function EmailNode({ id, selected }: NodeProps) {
  const freeSides = useAddBtns(id, selected, ["left", "right", "top", "bottom"]);
  return (
    <div className={cn(
      "relative w-[240px] rounded-xl border bg-card shadow-sm p-3 flex items-center gap-2.5 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Top}    id="top"    />
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
      <div className="size-8 rounded-full bg-red-500 flex items-center justify-center shrink-0"><Mail className="size-3.5 text-white" /></div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">Email</p>
        <p className="text-xs text-muted-foreground mt-0.5">Send Order Receipt</p>
      </div>
    </div>
  );
}

function SlackNode({ id, selected }: NodeProps) {
  const freeSides = useAddBtns(id, selected, ["left", "right", "top", "bottom"]);
  return (
    <div className={cn(
      "relative w-[240px] rounded-xl border bg-card shadow-sm p-3 flex items-center gap-2.5 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Top}    id="top"    />
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
      <div className="size-8 rounded-full bg-[#4A154B] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="size-3.5 fill-white"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">Slack</p>
        <p className="text-xs text-muted-foreground mt-0.5">Send Notification</p>
      </div>
    </div>
  );
}

/* ─── Generic node (for newly added nodes) ─── */

type GenericData = {
  name: string;
  description: string;
  bg: string;
  label?: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

function GenericNode({ id, data, selected }: NodeProps) {
  const d = data as GenericData;
  const Icon = d.Icon;
  const freeSides = useAddBtns(id, selected, ["left", "right", "top", "bottom"]);
  return (
    <div className={cn(
      "relative w-[240px] rounded-xl border bg-card shadow-sm p-3 flex items-center gap-2.5 transition-all cursor-pointer",
      selected ? "border-blue-400 ring-1 ring-blue-400/30" : "border-border hover:shadow-md"
    )}>
      {freeSides.map((s) => <AddBtn key={s} nodeId={id} side={s} />)}
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Top}    id="top"    />
      <NodeHandle nodeId={id} selected={!!selected} type="target" position={Position.Left}   id="left"   />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Right}  id="right"  />
      <NodeHandle nodeId={id} selected={!!selected} type="source" position={Position.Bottom} id="bottom" />
      <div className={cn("size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", d.bg)}>
        {Icon ? <Icon className="size-3.5 text-white" /> : d.label}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">{d.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.description}</p>
      </div>
    </div>
  );
}

/* ─── Static data ─── */

const nodeTypes = {
  stripe: StripeNode,
  sheets: SheetsNode,
  chatgpt: ChatGPTNode,
  email: EmailNode,
  slack: SlackNode,
  generic: GenericNode
};

const edgeTypes = { button: ButtonEdge };

const edgeStyle: React.CSSProperties = { stroke: "var(--border)", strokeWidth: 1.5 };

const initialNodes: Node[] = [
  { id: "stripe",  type: "stripe",  position: { x: 0,   y: 0   }, data: {} },
  { id: "sheets",  type: "sheets",  position: { x: 16,  y: 168 }, data: {} },
  { id: "chatgpt", type: "chatgpt", position: { x: 322, y: 168 }, data: {} },
  { id: "email",   type: "email",   position: { x: 16,  y: 292 }, data: {} },
  { id: "slack",   type: "slack",   position: { x: 16,  y: 416 }, data: {} }
];

const initialEdges: Edge[] = [
  { id: "e1", source: "stripe",  sourceHandle: "bottom", target: "sheets",  targetHandle: "top",  type: "button", style: edgeStyle },
  { id: "e2", source: "sheets",  sourceHandle: "right",  target: "chatgpt", targetHandle: "left", type: "button", style: edgeStyle },
  { id: "e3", source: "sheets",  sourceHandle: "bottom", target: "email",   targetHandle: "top",  type: "button", style: edgeStyle },
  { id: "e4", source: "email",   sourceHandle: "bottom", target: "slack",   targetHandle: "top",  type: "button", style: edgeStyle }
];

/* ─── Alignment snap + proximity helpers ─── */

const SNAP_THRESHOLD = 8;
const MIN_DISTANCE   = 150;
const PROX_EDGE_ID   = "__proximity_temp__";

function nodeRect(n: Node) {
  const w = n.measured?.width  ?? 240;
  const h = n.measured?.height ?? 56;
  return { l: n.position.x, r: n.position.x + w, cx: n.position.x + w / 2,
           t: n.position.y, b: n.position.y + h,  cy: n.position.y + h / 2 };
}

/* ─── Main canvas ─── */

type Props = {
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null, data?: Record<string, unknown>) => void;
  toolbarSlot?: React.ReactNode;
};

export function WorkflowCanvas({ selectedNodeId, onNodeSelect, toolbarSlot }: Props) {
  const isMobile = useIsTablet();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const rfInstanceRef = React.useRef<ReactFlowInstance | null>(null);

  const [pending, setPending] = React.useState<PendingAdd | null>(null);

  const openAddModal = React.useCallback(
    (sourceId: string, side: Side) => setPending({ kind: "side", sourceId, side }),
    []
  );

  const openEdgeModal = React.useCallback(
    (edgeId: string, sourceId: string, targetId: string, sourceHandle: string | null, targetHandle: string | null) =>
      setPending({ kind: "edge", edgeId, sourceId, targetId, sourceHandle, targetHandle }),
    []
  );

  const getConnectedHandles = React.useCallback(
    (nodeId: string) => {
      const handles = new Set<string>();
      edges.forEach((e) => {
        if (e.source === nodeId && e.sourceHandle) handles.add(e.sourceHandle);
        if (e.target === nodeId && e.targetHandle) handles.add(e.targetHandle);
      });
      return handles;
    },
    [edges]
  );

  const ctxValue = React.useMemo(
    () => ({ openAddModal, openEdgeModal, getConnectedHandles }),
    [openAddModal, openEdgeModal, getConnectedHandles]
  );

  /* Sync external selection */
  React.useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === selectedNodeId })));
  }, [selectedNodeId, setNodes]);

  /* Horizontal auto-layout (BFS column assignment) */
  const autoLayoutHorizontal = React.useCallback(() => {
    const GAP_X = 80;
    const GAP_Y = 40;
    const realEdges = edges.filter((e) => e.id !== PROX_EDGE_ID);

    const children: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    nodes.forEach((n) => { children[n.id] = []; inDegree[n.id] = 0; });
    realEdges.forEach((e) => {
      children[e.source]?.push(e.target);
      inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
    });

    /* BFS from roots */
    const col: Record<string, number> = {};
    const queue: string[] = nodes.filter((n) => (inDegree[n.id] ?? 0) === 0).map((n) => n.id);
    queue.forEach((id) => { col[id] = 0; });

    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      (children[id] || []).forEach((childId) => {
        const next = (col[id] ?? 0) + 1;
        if (col[childId] === undefined || col[childId] < next) {
          col[childId] = next;
          queue.push(childId);
        }
      });
    }
    /* Isolated nodes go in last column */
    const maxCol = Math.max(0, ...Object.values(col));
    nodes.forEach((n) => { if (col[n.id] === undefined) col[n.id] = maxCol + 1; });

    /* Group by column */
    const byCol: Record<number, string[]> = {};
    nodes.forEach((n) => {
      const c = col[n.id];
      if (!byCol[c]) byCol[c] = [];
      byCol[c].push(n.id);
    });

    /* Column X positions */
    const colX: Record<number, number> = {};
    let curX = 0;
    Object.keys(byCol).map(Number).sort((a, b) => a - b).forEach((c) => {
      colX[c] = curX;
      const maxW = Math.max(...byCol[c].map((id) => {
        const nd = nodes.find((n) => n.id === id);
        return nd?.measured?.width ?? 240;
      }));
      curX += maxW + GAP_X;
    });

    /* Node positions */
    setNodes((nds) => nds.map((n) => {
      const c      = col[n.id] ?? 0;
      const colIds = byCol[c] ?? [];
      const idx    = colIds.indexOf(n.id);
      const nodeH  = n.measured?.height ?? 56;
      const totalH = colIds.length * nodeH + (colIds.length - 1) * GAP_Y;
      return {
        ...n,
        position: { x: colX[c] ?? 0, y: -totalH / 2 + idx * (nodeH + GAP_Y) }
      };
    }));

    /* Re-wire edge handles to match layout direction */
    setEdges((eds) => eds.map((e) => {
      if (e.id === PROX_EDGE_ID) return e;
      const srcCol = col[e.source] ?? 0;
      const tgtCol = col[e.target] ?? 0;
      if (srcCol === tgtCol) {
        return { ...e, sourceHandle: "bottom", targetHandle: "top" };
      }
      return { ...e, sourceHandle: "right", targetHandle: "left" };
    }));

    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.35 }), 50);
  }, [nodes, edges, setNodes]);

  /* Proximity connect — uses nodes array directly (no store API needed) */
  const getClosestEdge = React.useCallback(
    (node: Node): Edge | null => {
      let closestId: string | null = null;
      let minDist = MIN_DISTANCE;

      nodes.forEach((n) => {
        if (n.id === node.id) return;
        const dx = n.position.x - node.position.x;
        const dy = n.position.y - node.position.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) { minDist = d; closestId = n.id; }
      });

      if (!closestId) return null;
      const closest = nodes.find((n) => n.id === closestId)!;

      const dx = closest.position.x - node.position.x;
      const dy = closest.position.y - node.position.y;

      let source: string, sourceHandle: string, target: string, targetHandle: string;

      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) { source = node.id; sourceHandle = "right"; target = closestId; targetHandle = "left"; }
        else         { source = closestId; sourceHandle = "right"; target = node.id;    targetHandle = "left"; }
      } else {
        if (dy > 0) { source = node.id; sourceHandle = "bottom"; target = closestId; targetHandle = "top"; }
        else         { source = closestId; sourceHandle = "bottom"; target = node.id;    targetHandle = "top"; }
      }

      return {
        id: PROX_EDGE_ID,
        source, sourceHandle, target, targetHandle,
        type: "smoothstep",
        style: { stroke: "var(--border)", strokeWidth: 1.5, strokeDasharray: "6 3", opacity: 0.6 }
      };
    },
    [nodes]
  );

  const onNodeDrag = React.useCallback<OnNodeDrag>(
    (_, node) => {
      const closeEdge = getClosestEdge(node);
      setEdges((eds) => {
        const without = eds.filter((e) => e.id !== PROX_EDGE_ID);
        return closeEdge ? [...without, closeEdge] : without;
      });
    },
    [getClosestEdge, setEdges]
  );

  /* Create edge by dragging from handle to handle */
  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "button", style: edgeStyle }, eds));
    },
    [setEdges]
  );

  /* Magnetic snap + commit proximity edge on drop */
  const onNodeDragStop = React.useCallback<OnNodeDrag>(
    (_, dragged) => {
      /* 1 — magnetic position snap */
      const d = nodeRect(dragged);
      let snapX = dragged.position.x;
      let snapY = dragged.position.y;
      const dW = d.r - d.l, dH = d.b - d.t;

      nodes.forEach((n) => {
        if (n.id === dragged.id) return;
        const s = nodeRect(n);
        if (Math.abs(d.l  - s.l)  < SNAP_THRESHOLD) snapX = s.l;
        if (Math.abs(d.cx - s.cx) < SNAP_THRESHOLD) snapX = s.cx - dW / 2;
        if (Math.abs(d.r  - s.r)  < SNAP_THRESHOLD) snapX = s.r - dW;
        if (Math.abs(d.t  - s.t)  < SNAP_THRESHOLD) snapY = s.t;
        if (Math.abs(d.cy - s.cy) < SNAP_THRESHOLD) snapY = s.cy - dH / 2;
        if (Math.abs(d.b  - s.b)  < SNAP_THRESHOLD) snapY = s.b - dH;
      });

      if (snapX !== dragged.position.x || snapY !== dragged.position.y) {
        setNodes((nds) => nds.map((n) =>
          n.id === dragged.id ? { ...n, position: { x: snapX, y: snapY } } : n
        ));
      }

      /* 2 — commit proximity edge (or discard if no longer close) */
      const closeEdge = getClosestEdge(dragged);
      setEdges((eds) => {
        const without = eds.filter((e) => e.id !== PROX_EDGE_ID);
        if (!closeEdge) return without;
        const duplicate = without.some(
          (e) => e.source === closeEdge.source && e.target === closeEdge.target &&
                 e.sourceHandle === closeEdge.sourceHandle && e.targetHandle === closeEdge.targetHandle
        );
        if (duplicate) return without;
        return [...without, {
          ...closeEdge,
          id: `e-prox-${Date.now()}`,
          style: edgeStyle
        }];
      });
    },
    [nodes, setNodes, getClosestEdge, setEdges]
  );

  /* Add node from command palette */
  const handleAddNode = React.useCallback(
    (item: CatalogItem) => {
      if (!pending) return;
      const newId   = `node-${Date.now()}`;
      const newData = { name: item.name, description: item.description, bg: item.bg, label: item.label, Icon: item.Icon };

      if (pending.kind === "edge") {
        /* Insert between source and target */
        const src = nodes.find((n) => n.id === pending.sourceId);
        const tgt = nodes.find((n) => n.id === pending.targetId);
        if (!src || !tgt) return;
        const newNode: Node = {
          id: newId, type: "generic",
          position: { x: (src.position.x + tgt.position.x) / 2, y: (src.position.y + tgt.position.y) / 2 },
          data: newData
        };
        const sh = pending.sourceHandle ?? "bottom";
        const th = pending.targetHandle ?? "top";
        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: n.id === newId })), newNode]);
        setEdges((eds) => [
          ...eds.filter((e) => e.id !== pending.edgeId),
          { id: `e-${pending.sourceId}-${newId}`, source: pending.sourceId, sourceHandle: sh, target: newId,           targetHandle: th, type: "button", style: edgeStyle },
          { id: `e-${newId}-${pending.targetId}`, source: newId,           sourceHandle: sh, target: pending.targetId, targetHandle: th, type: "button", style: edgeStyle }
        ]);
        onNodeSelect(newId, newData as Record<string, unknown>);
        setPending(null);
        return;
      }

      /* Append from + button on node side */
      const source = nodes.find((n) => n.id === pending.sourceId);
      if (!source) return;

      const srcW = source.measured?.width  ?? 240;
      const srcH = source.measured?.height ?? 60;
      const gap  = 72;
      let newX = source.position.x, newY = source.position.y;
      let edgeSrc = pending.sourceId, edgeTgt = newId;
      let srcHandle = "right", tgtHandle = "left";

      switch (pending.side) {
        case "right":  newX = source.position.x + srcW + gap; srcHandle = "right";  tgtHandle = "left"; edgeSrc = pending.sourceId; edgeTgt = newId; break;
        case "left":   newX = source.position.x - 240  - gap; srcHandle = "right";  tgtHandle = "left"; edgeSrc = newId; edgeTgt = pending.sourceId; break;
        case "bottom": newY = source.position.y + srcH + gap; srcHandle = "bottom"; tgtHandle = "top";  edgeSrc = pending.sourceId; edgeTgt = newId; break;
        case "top":    newY = source.position.y - 60   - gap; srcHandle = "bottom"; tgtHandle = "top";  edgeSrc = newId; edgeTgt = pending.sourceId; break;
      }

      const newNode: Node = { id: newId, type: "generic", position: { x: newX, y: newY }, data: newData };
      const newEdge: Edge = { id: `e-${edgeSrc}-${edgeTgt}`, source: edgeSrc, sourceHandle: srcHandle, target: edgeTgt, targetHandle: tgtHandle, type: "button", style: edgeStyle };

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: n.id === newId })), newNode]);
      setEdges((eds) => [...eds, newEdge]);
      onNodeSelect(newId, newData as Record<string, unknown>);
      setPending(null);
    },
    [pending, nodes, setNodes, setEdges, onNodeSelect]
  );

  const triggers = CATALOG.filter((c) => c.group === "trigger");
  const actions  = CATALOG.filter((c) => c.group === "action");

  return (
    <AddNodeCtx.Provider value={ctxValue}>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b bg-card px-3 py-2 shrink-0">
          {toolbarSlot}
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={autoLayoutHorizontal} title="Auto layout">
            <Network className="size-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"><Link2 className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"><Trash2 className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"><MoreHorizontal className="size-3.5" /></Button>
        </div>

        {/* React Flow */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(instance) => { rfInstanceRef.current = instance; }}
            onNodeClick={(_, node) => onNodeSelect(node.id, node.data as Record<string, unknown>)}
            onPaneClick={() => onNodeSelect(null)}
            onConnect={onConnect}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            snapToGrid
            snapGrid={[8, 8]}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            minZoom={isMobile ? 0.4 : 1}
            maxZoom={1}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--border)" />
          </ReactFlow>
        </div>
      </div>

      {/* Add Node Command Dialog */}
      <CommandDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title="Add Node"
        description="Select a trigger or action to add to the canvas"
        showCloseButton={false}
      >
        <CommandInput placeholder="Search nodes..." />
        <CommandList className="max-h-[360px]">
          <CommandEmpty>No nodes found.</CommandEmpty>
          <CommandGroup heading="Triggers">
            {triggers.map((item) => {
              const Icon = item.Icon;
              return (
                <CommandItem
                  key={item.value}
                  value={`${item.name} ${item.description}`}
                  onSelect={() => handleAddNode(item)}
                  className="gap-3"
                >
                  <div className={cn("size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", item.bg)}>
                    {Icon ? <Icon className="size-4! text-white" /> : item.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            {actions.map((item) => {
              const Icon = item.Icon;
              return (
                <CommandItem
                  key={item.value}
                  value={`${item.name} ${item.description}`}
                  onSelect={() => handleAddNode(item)}
                  className="gap-3"
                >
                  <div className={cn("size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", item.bg)}>
                    {Icon ? <Icon className="size-4! text-white" /> : item.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </AddNodeCtx.Provider>
  );
}
