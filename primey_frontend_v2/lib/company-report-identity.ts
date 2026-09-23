"use client";

import * as React from "react";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AuthProvider";

type Rec = Record<string, unknown>;
export type CompanyReportIdentity = {
  companyName?: string;
  tradeName?: string;
  branchName?: string;
  taxNumber?: string;
  commercialRegistration?: string;
  logoUrl?: string;
};
function obj(v: unknown): Rec { return v && typeof v === "object" && !Array.isArray(v) ? v as Rec : {}; }
function txt(v: unknown): string { return v == null ? "" : String(v).trim(); }
function unwrap(v: unknown): Rec { const root=obj(v),data=obj(root.data); return Object.keys(data).length ? data : root; }

export function useCompanyReportIdentity(options?: { branchName?: string; allBranches?: boolean; locale?: "ar"|"en" }) {
  const session=useAuth();
  const [profile,setProfile]=React.useState<Rec>({});
  React.useEffect(()=>{
    let active=true;
    void apiRequest<unknown>("/api/company/profile/",{method:"GET",credentials:"include",cache:"no-store",headers:{"X-Requested-With":"XMLHttpRequest"}})
      .then(result=>{if(active&&result.ok)setProfile(unwrap(result.data));})
      .catch(()=>undefined);
    return()=>{active=false};
  },[session.company_id]);
  return React.useMemo<CompanyReportIdentity>(()=>{
    const profileCompany=obj(profile.company),sessionCompany=obj(session.current_company||session.company);
    const company=Object.keys(profileCompany).length?profileCompany:sessionCompany;
    const defaultBranch=obj(profile.default_branch),membership=obj(session.current_membership);
    const sessionBranch=obj(membership.last_active_branch||membership.default_branch||sessionCompany.active_branch||sessionCompany.default_branch);
    const explicitBranch=txt(options?.branchName),allLabel=options?.locale==="en"?"All branches":"جميع الفروع";
    const branchName=options?.allBranches?allLabel:explicitBranch||txt(sessionBranch.name||sessionBranch.display_name)||txt(defaultBranch.name||defaultBranch.display_name);
    return {
      companyName:txt(company.name||company.display_name),
      tradeName:txt(company.trade_name),
      branchName,
      taxNumber:txt(company.tax_number||company.vat_number||company.tax_registration_number),
      commercialRegistration:txt(company.commercial_registration),
      logoUrl:txt(company.logo_url||company.logo),
    };
  },[options?.allBranches,options?.branchName,options?.locale,profile,session.company,session.current_company,session.current_membership]);
}
