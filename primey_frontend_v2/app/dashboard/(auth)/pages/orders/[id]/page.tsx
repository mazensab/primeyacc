import Link from "next/link";
import {
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  EditIcon,
  Package,
  Pencil,
  Printer,
  Truck
} from "lucide-react";
import { generateMeta } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerDetailsCard } from "./customer-details-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

type OrderStatus = "processing" | "shipped" | "out-for-delivery" | "delivered";

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: {
    id: number;
    name: string;
    image: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export async function generateMetadata() {
  return generateMeta({
    title: "Order Detail Page",
    description:
      "Manage order details, customer data, and tracking. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/pages/orders/detail"
  });
}

export default function Page() {
  const order: Order = {
    id: "ORD-12345",
    date: "2025-04-15",
    status: "shipped",
    customer: {
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: "+1 701 555 1122",
      address: "123 Main St, Anytown, AN 12345"
    },
    items: [
      {
        id: 1,
        name: "Wireless Headphones",
        image: "/products/01.jpeg",
        quantity: 2,
        price: 25.99
      },
      {
        id: 2,
        name: "Bluetooth Speaker",
        image: "/products/02.jpeg",
        quantity: 1,
        price: 49.99
      }
    ],
    subtotal: 101.97,
    discount: 10.0,
    shipping: 10.0,
    tax: 8.16,
    total: 110.13
  };

  const itemCount = order.items.reduce((count, item) => count + item.quantity, 0);

  const statusSteps: Record<OrderStatus, string> = {
    processing: "Processing",
    shipped: "Shipped",
    "out-for-delivery": "Out for Delivery",
    delivered: "Delivered"
  };

  const currentStep = statusSteps[order.status];
  const currentStepIndex = Object.keys(statusSteps).indexOf(order.status);

  return (
    <div className="mx-auto max-w-5xl space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/dashboard/pages/orders">
            <ChevronLeft />
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer />
            Print
          </Button>
          <Button>
            <Pencil />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order {order.id}</CardTitle>
            <CardAction>
              <span className="text-muted-foreground text-sm">Placed on {order.date}</span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Customer Information</h3>
                <p className="text-muted-foreground text-sm">{order.customer.name}</p>
                <p className="text-muted-foreground text-sm">{order.customer.email}</p>
                <p className="text-muted-foreground text-sm">{order.customer.address}</p>
              </div>
              <div className="bg-muted/50 flex items-center justify-between rounded-md border p-4">
                <div className="space-y-1">
                  <h4 className="font-medium">Payment Method</h4>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <CreditCard className="size-4" /> Visa ending in **** 1234
                  </div>
                </div>
                <Button variant="outline" size="icon">
                  <EditIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>
                Subtotal{" "}
                <span className="text-muted-foreground text-sm">
                  ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
              </span>
              <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-emerald-600 tabular-nums">-${order.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">${order.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Tax <span className="text-muted-foreground text-sm">(8%)</span>
              </span>
              <span className="tabular-nums">${order.tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">Delivery Status</CardTitle>
          <CardAction>
            <div className="text-muted-foreground text-xs">
                <Badge variant="info" className="me-1">
                  {currentStep}
                </Badge>{" "}
                on December 23, 2026
              </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6">
            <div className="mb-2 flex items-center justify-between">
              {Object.keys(statusSteps).map((step, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`mx-auto flex size-10 items-center justify-center rounded-full text-lg lg:size-12 ${index <= currentStepIndex ? "bg-green-500 text-white dark:bg-green-900" : "bg-muted border"} `}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle className="size-4" />
                    ) : (
                      {
                        processing: <Package className="size-4" />,
                        shipped: <Truck className="size-4 " />,
                        "out-for-delivery": <Truck className="size-4" />,
                        delivered: <CheckCircle2 className="size-4" />
                      }[step as OrderStatus]
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{statusSteps[step as OrderStatus]}</div>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <Progress
                className="w-full"
                value={(currentStepIndex / (Object.keys(statusSteps).length - 1)) * 100}
                color="bg-green-200 dark:bg-green-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="min-w-[480px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-24 text-center">Quantity</TableHead>
                  <TableHead className="w-28 text-end">Price</TableHead>
                  <TableHead className="w-28 text-end">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={`/images${item.image}`}
                          width="60px"
                          height="60px"
                          className="size-10 shrink-0 rounded-md object-cover lg:size-12"
                          alt={item.name}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-end tabular-nums">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-end font-medium tabular-nums">
                      ${(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <CustomerDetailsCard customer={order.customer} />
      </div>
    </div>
  );
}
