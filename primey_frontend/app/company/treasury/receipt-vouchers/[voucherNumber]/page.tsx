"use client";
import { useParams } from "next/navigation";
import { TreasuryVoucherDetailPage } from "../../_components/treasury-voucher-detail-page";
export default function CompanyReceiptVoucherDetailsRoute() {
  const params = useParams<{ voucherNumber: string | string[] }>();
  const raw = Array.isArray(params.voucherNumber)
    ? params.voucherNumber[0]
    : params.voucherNumber;
  return (
    <TreasuryVoucherDetailPage
      variant="receipt"
      voucherNumber={decodeURIComponent(raw || "")}
    />
  );
}
