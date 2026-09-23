from pathlib import Path
import json,hashlib,sys
R=Path.cwd(); CACHE=R/"_audit/phase49j_general_apply/source_cache"
OUT=R/"v2_26_b2c_legal_identity_d2_branch_invoice_layout_audit_v1.txt"
TARGETS={478:[578,579,580,581,582,583,584,585,717,718],88:[106,752,107,751,108,753,735,739],195:[227,228,229,230,231,232,416],556:[676,677,678,706,778,779,781],174:[197,207,208,209,210],290:[353,354,355,356,357],299:[367,368,369],76:[92]}
def clean(v): return "" if v is None else str(v).strip()
def load(bid):
 p=CACHE/f"company_{bid}.json"
 if not p.exists(): return None,str(p)
 try:return json.loads(p.read_text(encoding="utf-8-sig")).get("payload",{}),str(p)
 except Exception as e:return {"__error__":repr(e)},str(p)
def find_layout(payload,lid):
 if lid is None:return None
 for key in ("invoice_layouts","invoiceLayouts","layouts"):
  rows=payload.get(key) or []
  if isinstance(rows,list):
   for x in rows:
    if isinstance(x,dict) and clean(x.get("id"))==clean(lid):return x
 return None
lines=["===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D2 BRANCH/INVOICE-LAYOUT AUDIT V1 =====",
       f"CACHE={CACHE}","MODE=READ_ONLY","DATABASE_WRITES=NO","SOURCE_WRITES=NO"]
missing=[]; rows=[]
for bid,branch_ids in TARGETS.items():
 payload,path=load(bid)
 if payload is None or "__error__" in payload:
  missing.append((bid,path,payload));continue
 company=payload.get("company") or payload.get("business") or {}
 branches=payload.get("branches") or payload.get("business_locations") or []
 for branch_id in branch_ids:
  br=next((x for x in branches if isinstance(x,dict) and clean(x.get("id"))==str(branch_id)),None)
  if not br:
   rows.append({"legacy_company_id":bid,"legacy_branch_id":branch_id,"status":"BRANCH_NOT_FOUND"});continue
  layout_id=br.get("invoice_layout_id")
  lay=find_layout(payload,layout_id)
  row={
   "legacy_company_id":bid,"legacy_company_name":company.get("name"),
   "legacy_branch_id":branch_id,"location_id":br.get("location_id"),"branch_name":br.get("name"),
   "invoice_layout_id":layout_id,
   "company_tax_number_1":company.get("tax_number_1"),"company_tax_label_1":company.get("tax_label_1"),
   "company_tax_number_2":company.get("tax_number_2"),"company_tax_label_2":company.get("tax_label_2"),
   "layout_found":bool(lay),
   "layout_name":(lay or {}).get("name"),"layout_tax_number":(lay or {}).get("tax_number"),
   "layout_tax_number2":(lay or {}).get("tax_number2"),
   "layout_commercial_register":(lay or {}).get("commercial_register"),
   "branch_city":br.get("city"),"branch_state":br.get("state"),"branch_country":br.get("country"),
   "branch_zip_code":br.get("zip_code"),"branch_mobile":br.get("mobile"),
   "branch_email":br.get("email"),"branch_website":br.get("website"),
  }
  # Also expose any legal-looking scalar keys actually present on branch/layout without guessing semantics.
  for prefix,obj in (("branch",br),("layout",lay or {})):
   for k,v in obj.items():
    kl=str(k).lower()
    if not isinstance(v,(dict,list)) and any(t in kl for t in ("tax","vat","commercial","register","cr_")):
     row[f"{prefix}_raw_{k}"]=v
  rows.append(row)
lines += ["MISSING_CACHE_COUNT="+str(len(missing))]
for x in missing:lines.append("MISSING_CACHE="+json.dumps(x,ensure_ascii=False,default=str))
lines += ["ROW_COUNT="+str(len(rows)),"ROWS_BEGIN"]
lines += [json.dumps(x,ensure_ascii=False,default=str,sort_keys=True) for x in rows]
lines += ["ROWS_END"]
nonempty_layout_tax=sum(bool(clean(x.get("layout_tax_number"))) for x in rows)
nonempty_layout_cr=sum(bool(clean(x.get("layout_commercial_register"))) for x in rows)
nonempty_company_tax=sum(bool(clean(x.get("company_tax_number_1")) or clean(x.get("company_tax_number_2"))) for x in rows)
lines += [f"NONEMPTY_LAYOUT_TAX={nonempty_layout_tax}",f"NONEMPTY_LAYOUT_CR={nonempty_layout_cr}",f"NONEMPTY_COMPANY_TAX={nonempty_company_tax}",
          "MUTATION_PERFORMED=NO","RESULT=PASS" if not missing else "RESULT=PASS_WITH_MISSING_CACHE"]
OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
h=hashlib.sha256(OUT.read_bytes()).hexdigest().upper()
print(lines[0]);print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={h}")
print(f"ROW_COUNT={len(rows)}");print(f"NONEMPTY_LAYOUT_TAX={nonempty_layout_tax}");print(f"NONEMPTY_LAYOUT_CR={nonempty_layout_cr}");print(f"NONEMPTY_COMPANY_TAX={nonempty_company_tax}")
print("MUTATION_PERFORMED=NO");print(lines[-1])
