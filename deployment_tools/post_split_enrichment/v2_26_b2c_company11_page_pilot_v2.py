from pathlib import Path
import subprocess,sys,hashlib,shutil,base64
R=Path.cwd();P=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";D=R/"api/system/companies/detail.py";REP=R/"v2_26_b2c_company11_page_pilot_v2.txt"
PS="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770";DS="B8675DAB805AD59BAC8B676010E0FAAA00AC077A12576F2B8A1C54D2E2C0AAC3"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
def one(s,a,b,n):
 if s.count(a)!=1:raise RuntimeError(f"{n} anchor={s.count(a)}")
 return s.replace(a,b,1)
if sha(P)!=PS or sha(D)!=DS:sys.exit("SAFETY STOP source hash")
B=R/"backups/v2_26_b2c_company11_page_pilot_v1";B.mkdir(parents=True,exist_ok=True);shutil.copy2(P,B/"page.tsx");shutil.copy2(D,B/"detail.py")
try:
 s=D.read_text(encoding="utf8");s=one(s,"from subscriptions.models import CompanySubscription\n","from subscriptions.models import CompanySubscription\nfrom business_controls.models import LegacyObjectMap\n","import")
 helper=base64.b64decode("ZGVmIF9sZWdhY3lfc3Vic2NyaXB0aW9uX3BheWxvYWQoc3Vic2NyaXB0aW9uOiBDb21wYW55U3Vic2NyaXB0aW9uKSAtPiBkaWN0W3N0ciwgQW55XSB8IE5vbmU6CiAgICBtYXBwaW5nID0gTGVnYWN5T2JqZWN0TWFwLm9iamVjdHMuZmlsdGVyKAogICAgICAgIGNvbXBhbnk9c3Vic2NyaXB0aW9uLmNvbXBhbnksIHNvdXJjZV9zeXN0ZW09Im1oYW1jbG91ZF92MSIsCiAgICAgICAgc291cmNlX3RhYmxlPSJzdWJzY3JpcHRpb25zIiwgdGFyZ2V0X29iamVjdF9pZD1zdHIoc3Vic2NyaXB0aW9uLnBrKSwKICAgICkub3JkZXJfYnkoIi1pZCIpLmZpcnN0KCkKICAgIGlmIG1hcHBpbmcgaXMgTm9uZToKICAgICAgICByZXR1cm4gTm9uZQogICAgbWV0YWRhdGEgPSBkaWN0KG1hcHBpbmcubWV0YWRhdGEgb3Ige30pCiAgICBsZWdhY3kgPSBtZXRhZGF0YS5nZXQoImxlZ2FjeV9zdWJzY3JpcHRpb24iKQogICAgc2VtYW50aWNzID0gbWV0YWRhdGEuZ2V0KCJsZWdhY3lfcGF5bWVudF9zZW1hbnRpY3MiKQogICAgcmV0dXJuIHsibGVnYWN5X2lkIjogbWFwcGluZy5sZWdhY3lfaWQsICJsZWdhY3lfY29tcGFueV9pZCI6IG1hcHBpbmcubGVnYWN5X2NvbXBhbnlfaWQsCiAgICAgICAgICAgICJzdWJzY3JpcHRpb24iOiBsZWdhY3kgaWYgaXNpbnN0YW5jZShsZWdhY3ksIGRpY3QpIGVsc2Uge30sCiAgICAgICAgICAgICJwYXltZW50X3NlbWFudGljcyI6IHNlbWFudGljcyBpZiBpc2luc3RhbmNlKHNlbWFudGljcywgZGljdCkgZWxzZSB7fX0KCgo=").decode()
 s=one(s,"\ndef _membership_payload(membership: CompanyMembership) -> dict[str, Any]:\n","\n"+helper+"def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:\n","helper")
 old='                "subscriptions": [\n                    _subscription_payload(subscription)\n                    for subscription in subscriptions\n                ],'
 new='                "subscriptions": [\n                    {**_subscription_payload(subscription), "legacy": _legacy_subscription_payload(subscription)}\n                    for subscription in subscriptions\n                ],'
 s=one(s,old,new,"payload");D.write_text(s,encoding="utf8")
 s=P.read_text(encoding="utf8")
 s=one(s,"  isCurrent: boolean;\n};","  isCurrent: boolean;\n  legacyPaidVia: string;\n  legacyTransactionReference: string;\n  legacyStatus: string;\n};","type")
 s=one(s,"    isCurrent: Boolean(record.is_current),\n  };\n}","    isCurrent: Boolean(record.is_current),\n    legacyPaidVia: normalizeText(asRecord(asRecord(record.legacy).subscription).paid_via),\n    legacyTransactionReference: normalizeText(asRecord(asRecord(record.legacy).subscription).payment_transaction_id),\n    legacyStatus: normalizeText(asRecord(asRecord(record.legacy).subscription).status),\n  };\n}","normalize")
 s=one(s,'<DetailRow label={t.subscription} value={fallback(company.subscription)} icon={CheckCircle2} />','<DetailRow label={t.subscription} value={companySubscriptions.find((item) => item.isCurrent)?.planName || companySubscriptions.find((item) => ["ACTIVE", "TRIAL"].includes(item.status))?.planName || fallback(company.subscription)} icon={CheckCircle2} />',"summary")
 s=one(s,'<th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.endDate}</th>','<th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.endDate}</th><th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{locale === "ar" ? "قناة الدفع" : "Payment channel"}</th><th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.reference}</th>',"head")
 s=one(s,'<td className="px-4 py-3 align-middle text-muted-foreground">{formatDateTime(item.endDate)}</td>','<td className="px-4 py-3 align-middle text-muted-foreground">{formatDateTime(item.endDate)}</td><td className="px-4 py-3 align-middle">{item.legacyPaidVia.toLowerCase() === "offline" ? (locale === "ar" ? "خارج البوابة / يدوي" : "Offline / manual") : (item.legacyPaidVia || t.notAvailable)}</td><td className="px-4 py-3 align-middle font-mono text-xs">{item.legacyTransactionReference || t.notAvailable}</td>',"row")
 P.write_text(s,encoding="utf8")
 logs=[]
 for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
  rc,o=run(cmd);logs += [o,f"EXIT={rc}"]
  if rc:raise RuntimeError("verify")
 rc,o=run([str(R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"),"--noEmit"]);logs += [o,f"TSC_EXIT={rc}"]
 baseline_error="app/company/sales/components/company-sales-detail.tsx(35,386): error TS2322: Type 'string' is not assignable to type 'ApiBody'."
 target_errors=[line for line in o.splitlines() if "app/system/companies/[id]/page.tsx" in line]
 unexpected=[line for line in o.splitlines() if "error TS" in line and baseline_error not in line]
 if target_errors or unexpected:raise RuntimeError("target tsc")
 logs += ["TSC_BASELINE_UNRELATED=KNOWN_SALES_DETAIL_ERROR" if rc else "TSC_ALL_CLEAR=PASS","TARGET_PAGE_TSC_ERROR=NO"]
 REP.write_text("\n".join(logs)+f"\nDETAIL_SHA={sha(D)}\nPAGE_SHA={sha(P)}\nRESULT=PASS\n",encoding="utf8")
 print("===== PRIMEYACC V2-26 B2C COMPANY11 PAGE PILOT V2 =====");print(f"REPORT={REP.name}");print(f"DETAIL_SHA={sha(D)}");print(f"PAGE_SHA={sha(P)}");print("TARGET_TSC=PASS");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")
except Exception as e:
 shutil.copy2(B/"page.tsx",P);shutil.copy2(B/"detail.py",D);REP.write_text(f"ERROR={e!r}\nROLLBACK=PASS\nRESULT=FAIL\n",encoding="utf8");raise
