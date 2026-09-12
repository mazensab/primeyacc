import { type LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableHeader } from "@/components/table-filter-helpers";

export type ReportsData = {
  id: string;
  date: string;
  department: string;
  amount: number;
  paymentMethod: string;
  status: "Paid" | "Pending" | "Overdue";
};

export const statusConfig: Record<
  ReportsData["status"],
  { variant: "success" | "warning" | "destructive"; dot: string }
> = {
  Paid: { variant: "success", dot: "bg-emerald-500" },
  Pending: { variant: "warning", dot: "bg-amber-500" },
  Overdue: { variant: "destructive", dot: "bg-rose-500" }
};

// Create mock data
export const reportsData: ReportsData[] = [
  {
    id: "1",
    date: "2026-08-01",
    department: "Emergency",
    amount: 1500,
    paymentMethod: "Credit Card",
    status: "Paid"
  },
  {
    id: "2",
    date: "2026-08-03",
    department: "Cardiology",
    amount: 2200,
    paymentMethod: "Insurance",
    status: "Pending"
  },
  {
    id: "3",
    date: "2026-08-05",
    department: "Pediatrics",
    amount: 800,
    paymentMethod: "Cash",
    status: "Paid"
  },
  {
    id: "4",
    date: "2026-08-07",
    department: "Orthopedics",
    amount: 3000,
    paymentMethod: "Insurance",
    status: "Overdue"
  },
  {
    id: "5",
    date: "2026-08-09",
    department: "Neurology",
    amount: 2500,
    paymentMethod: "Credit Card",
    status: "Paid"
  },
  {
    id: "6",
    date: "2026-08-11",
    department: "Oncology",
    amount: 4000,
    paymentMethod: "Insurance",
    status: "Pending"
  },
  {
    id: "7",
    date: "2026-08-13",
    department: "Radiology",
    amount: 1800,
    paymentMethod: "Cash",
    status: "Paid"
  },
  {
    id: "8",
    date: "2026-08-15",
    department: "Surgery",
    amount: 5500,
    paymentMethod: "Insurance",
    status: "Overdue"
  },
  {
    id: "9",
    date: "2026-08-17",
    department: "Dermatology",
    amount: 1200,
    paymentMethod: "Credit Card",
    status: "Paid"
  },
  {
    id: "10",
    date: "2026-08-19",
    department: "Psychiatry",
    amount: 950,
    paymentMethod: "Cash",
    status: "Pending"
  }
];

// Define table columns
export const columns: ColumnDef<ReportsData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40
  },
  {
    accessorKey: "date",
    size: 140,
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(row.getValue("date")), "MMM d, yyyy")}
      </span>
    )
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <div className="truncate font-medium">{row.getValue("department")}</div>
  },
  {
    accessorKey: "amount",
    size: 120,
    header: ({ column }) => <SortableHeader column={column}>Amount</SortableHeader>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);
      return <div className="font-medium tabular-nums">{formatted}</div>;
    }
  },
  {
    accessorKey: "paymentMethod",
    size: 160,
    header: "Payment Method",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("paymentMethod")}</span>
    )
  },
  {
    accessorKey: "status",
    size: 110,
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ReportsData["status"];
      return <Badge variant={statusConfig[status].variant}>{status}</Badge>;
    }
  }
];
