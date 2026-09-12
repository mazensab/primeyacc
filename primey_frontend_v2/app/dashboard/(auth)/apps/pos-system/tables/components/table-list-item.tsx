"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Armchair } from "lucide-react";

import { useStore, Table } from "../../store";
import { EnumTableStatus, EnumTableStatusColor } from "../../enums";

import { Badge } from "@/components/ui/badge";
import TableDetailDialog from "./table-detail-dialog";

type TableListItem = {
  table: Table;
  categoryName?: string;
};

export default function TableListItem({ table, categoryName }: TableListItem) {
  const [openDialog, setOpenDialog] = React.useState(false);
  const { orders } = useStore();

  const tableOrder = orders.find((t) => t.tableId === table.id);

  if (tableOrder) {
    table.status = EnumTableStatus.OCCUPIED;
  }

  const colors = EnumTableStatusColor[table.status as EnumTableStatus];

  return (
    <>
      <div
        onClick={() => setOpenDialog(true)}
        key={table.id}
        className="bg-card cursor-pointer overflow-hidden rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg border", colors.card)}>
            <Armchair className={cn("size-5", colors.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{table.name}</h3>
            {categoryName && <p className="text-muted-foreground text-xs">{categoryName}</p>}
          </div>
          <Badge variant={colors.badge} className="shrink-0 capitalize">
            {table.status}
          </Badge>
        </div>

        {tableOrder && (
          <div className="mt-3 border-t pt-3">
            <p className="text-sm font-medium">Order #{tableOrder.id.split("-")[1]}</p>
            <p className="text-muted-foreground text-xs">{tableOrder.items.length} items</p>
          </div>
        )}
      </div>

      <TableDetailDialog
        table={table}
        order={tableOrder}
        open={openDialog}
        setOpen={setOpenDialog}
      />
    </>
  );
}
