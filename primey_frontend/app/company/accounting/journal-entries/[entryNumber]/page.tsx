"use client";
import { useParams } from "next/navigation";
import { CompanyJournalEntryDetailPage } from "../../_components/company-journal-entry-detail-page";
export default function CompanyJournalEntryDetailsRoute() {
  const params = useParams<{ entryNumber: string | string[] }>();
  const raw = Array.isArray(params.entryNumber)
    ? params.entryNumber[0]
    : params.entryNumber;
  return (
    <CompanyJournalEntryDetailPage
      entryNumber={decodeURIComponent(raw || "")}
    />
  );
}
