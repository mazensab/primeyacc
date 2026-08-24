import { PlatformBillingDocumentsClient } from "@/components/system/billing-documents/platform-billing-documents-client";

export default function SystemPlatformInvoicesListPage() {
  return <PlatformBillingDocumentsClient mode="invoices" />;
}