import { PlatformBillingDocumentsClient } from "@/components/system/billing-documents/platform-billing-documents-client";

export default function SystemPlatformReceiptsPage() {
  return <PlatformBillingDocumentsClient mode="receipts" />;
}