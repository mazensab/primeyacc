/**
 * 📂 path: primey_frontend/app/company/profile/page.tsx
 * 📌 page: Company profile legacy redirect
 * ✅ Redirects old /company/profile links to the real company settings profile page
 * ✅ Prevents 404 from older bookmarks or stale links
 */
import { redirect } from "next/navigation";
export default function CompanyProfileLegacyRedirectPage() {
  redirect("/company/settings/company-profile");
}
