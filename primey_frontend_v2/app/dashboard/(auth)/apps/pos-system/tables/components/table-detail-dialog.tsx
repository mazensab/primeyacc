import React from "react";

import { Order, Table } from "../../store";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type TableDetailDialog = {
  open: boolean;
  setOpen: (e: boolean) => void;
  table: Table;
  order?: Order;
};

export default function TableDetailDialog({ table, order, open, setOpen }: TableDetailDialog) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {table?.name} {order && <>- Order #{order?.id.split("-")[1]}</>}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {order ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="success">{order.items.length} items</Badge>
                <div className="text-muted-foreground text-sm">
                  Created: {order.createdAt.toLocaleString()}
                </div>
              </div>

              <UITable className="[&_td:first-child]:ps-0 [&_td:last-child]:pe-0 [&_th:first-child]:ps-0 [&_th:last-child]:pe-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product.image || "/placeholder.svg"}
                            alt={item.product.name}
                            className="size-10 shrink-0 rounded-lg border object-cover"
                          />
                          <span className="font-medium">{item.product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>

              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    ${(order.total / 1.05).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (5%)</span>
                  <span className="font-medium tabular-nums">
                    ${(order.total - order.total / 1.05).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold tabular-nums">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">There is no order at this table..</div>
          )}
        </div>
        <DialogFooter className="flex-row">
          {table?.status === "occupied" && (
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={() => {
                // clearTable(selectedTable.id);
                setOpen(false);
              }}>
              Clear Table
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
