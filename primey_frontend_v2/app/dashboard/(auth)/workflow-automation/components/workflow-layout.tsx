"use client";

import * as React from "react";
import { Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NodeLibrary } from "./node-library";
import { WorkflowCanvas } from "./workflow-canvas";
import { ConfigPanel } from "./config-panel";
import { useIsTablet } from "@/hooks/use-mobile";

export function WorkflowLayout() {
  const isMobile = useIsTablet();
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = React.useState<Record<string, unknown> | null>(null);
  const [configOpen, setConfigOpen] = React.useState(false);

  const handleNodeSelect = React.useCallback(
    (id: string | null, data?: Record<string, unknown>) => {
      setSelectedNodeData(data ?? null);
      if (!id) {
        setSelectedNodeId(null);
        setConfigOpen(false);
        return;
      }
      // On mobile the first tap only selects the node so its connect buttons
      // stay visible; tapping the selected node again opens its settings.
      setConfigOpen(!isMobile || selectedNodeId === id);
      setSelectedNodeId(id);
    },
    [isMobile, selectedNodeId]
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="hidden h-full shrink-0 lg:flex">
        <NodeLibrary />
      </div>
      <WorkflowCanvas
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        toolbarSlot={
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="me-1.5 h-7 lg:hidden">
                <Blocks /> Nodes
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px]! p-0">
              <SheetTitle className="sr-only">Node library</SheetTitle>
              <NodeLibrary />
            </SheetContent>
          </Sheet>
        }
      />
      {selectedNodeId && configOpen && (
        <div className="flex h-full shrink-0 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-10 max-lg:shadow-xl">
          <ConfigPanel
            selectedNodeId={selectedNodeId}
            nodeData={selectedNodeData}
            onClose={() => handleNodeSelect(null)}
          />
        </div>
      )}
    </div>
  );
}
