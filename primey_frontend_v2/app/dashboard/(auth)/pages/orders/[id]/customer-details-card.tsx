"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerDetailsCardProps {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied to clipboard`);
      }}>
      <span className="sr-only">Copy {label.toLowerCase()}</span>
      <CopyIcon />
    </Button>
  );
}

export function CustomerDetailsCard({ customer }: CustomerDetailsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">Customer name</span>
          <span className="font-medium">{customer.name}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">Email</span>
          <span className="flex min-w-0 items-center gap-1">
            <a
              href={`mailto:${customer.email}`}
              className="text-primary truncate text-sm font-medium hover:underline">
              {customer.email}
            </a>
            <CopyButton value={customer.email} label="Email" />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">Phone</span>
          <span className="flex items-center gap-1">
            <a
              href={`tel:${customer.phone.replace(/\s/g, "")}`}
              className="text-primary text-sm font-medium whitespace-nowrap hover:underline">
              {customer.phone}
            </a>
            <CopyButton value={customer.phone} label="Phone" />
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground text-sm">Address</span>
          <span className="text-end text-sm font-medium">{customer.address}</span>
        </div>
      </CardContent>
    </Card>
  );
}
