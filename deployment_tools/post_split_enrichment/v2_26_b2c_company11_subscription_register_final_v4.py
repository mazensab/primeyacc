from pathlib import Path
import subprocess,sys,hashlib,shutil,base64
R=Path.cwd();P=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";REP=R/"v2_26_b2c_company11_subscription_register_final_v4.txt"
EXPECTED="C8451F68452BA5D93324D085D3E30C9C8FF37DBC83D7849A9A595A408823000C"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,cwd=R,t=300):
 q=subprocess.run(a,cwd=cwd,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
if sha(P)!=EXPECTED:sys.exit("SAFETY STOP: page differs from uploaded Company Detail source")
B=R/"backups/v2_26_b2c_company11_subscription_register_final_v4";B.mkdir(parents=True,exist_ok=True);shutil.copy2(P,B/"page.tsx")
try:
 probe="import os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');import django;django.setup();from django.db import transaction;from companies.models import Company;from business_controls.models import LegacyObjectMap\nwith transaction.atomic():\n c=Company.objects.select_for_update().get(pk=11)\n assert c.company_code=='LEGACY-652'\n if not c.commercial_registration:c.commercial_registration='656565'\n if not c.tax_number:c.tax_number='555656'\n c.full_clean();c.save()\n m=LegacyObjectMap.objects.get(company_id=11,source_system='mhamcloud_v1',source_table='business_locations',legacy_id='833')\n md=dict(m.metadata or {});md['legal_identity_ui_verified']={'commercial_registration':'656565','tax_number':'555656','source':'MHAMCLOUD_BL0001_EDIT_UI_VERIFIED'};m.metadata=md;m.save(update_fields=['metadata','updated_at'])\n print('COMPANY_CR='+c.commercial_registration);print('COMPANY_TAX='+c.tax_number)"
 rc,o=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],R,60)
 if rc:raise RuntimeError(o)
 s=P.read_text(encoding="utf8")
 hs=72148;he=75149;bs=75151;be=81011
 if s[hs:he].count("تفاصيل الدفع التاريخي")!=1:raise RuntimeError("historical range guard")
 if s[bs:be].count("{t.companyBillingDocs}")!=1:raise RuntimeError("billing range guard")
 s=s[:bs]+s[be:]
 s=s[:hs]+s[he:]
 old=base64.b64decode("ICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9InB4LTQgcHktMyBhbGlnbi1taWRkbGUiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIGFzQ2hpbGQgc2l6ZT0ic20iIHZhcmlhbnQ9Im91dGxpbmUiIGNsYXNzTmFtZT17cmVnaXN0ZXJPdXRsaW5lQnV0dG9uQ2xhc3N9PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMaW5rIGhyZWY9e2Avc3lzdGVtL3N1YnNjcmlwdGlvbnMvJHtpdGVtLmlkfWB9PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEV4dGVybmFsTGluayBjbGFzc05hbWU9ImgtMy41IHctMy41IiAvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Qub3BlbkRldGFpbHN9CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9MaW5rPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0J1dHRvbj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+").decode()
 new=base64.b64decode("ICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9InB4LTQgcHktMyBhbGlnbi1taWRkbGUiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8RHJvcGRvd25NZW51PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEcm9wZG93bk1lbnVUcmlnZ2VyIGFzQ2hpbGQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIHR5cGU9ImJ1dHRvbiIgdmFyaWFudD0ib3V0bGluZSIgc2l6ZT0iaWNvbiIgYXJpYS1sYWJlbD17bG9jYWxlID09PSAiYXIiID8gItil2KzYsdin2KHYp9iqINin2YTYp9i02KrYsdin2YMiIDogIlN1YnNjcmlwdGlvbiBhY3Rpb25zIn0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNb3JlVmVydGljYWwgLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvRHJvcGRvd25NZW51VHJpZ2dlcj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8RHJvcGRvd25NZW51Q29udGVudCBhbGlnbj17bG9jYWxlID09PSAiYXIiID8gInN0YXJ0IiA6ICJlbmQifT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEcm9wZG93bk1lbnVJdGVtIGFzQ2hpbGQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMaW5rIGhyZWY9e2Avc3lzdGVtL3N1YnNjcmlwdGlvbnMvJHtpdGVtLmlkfWB9PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9jYWxlID09PSAiYXIiID8gItiq2YHYp9i12YrZhCDYp9mE2KfYtNiq2LHYp9mDIiA6ICJTdWJzY3JpcHRpb24gZGV0YWlscyJ9CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvTGluaz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvRHJvcGRvd25NZW51SXRlbT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEcm9wZG93bk1lbnVJdGVtIG9uQ2xpY2s9eygpID0+IHByaW50TGVnYWN5U3Vic2NyaXB0aW9uUmVjZWlwdChpdGVtKX0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQcmludGVyIC8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtsb2NhbGUgPT09ICJhciIgPyAi2LfYqNin2LnYqSDZhdiz2KrZhtivINin2YTYp9i02KrYsdin2YMiIDogIlByaW50IHN1YnNjcmlwdGlvbiBkb2N1bWVudCJ9CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0Ryb3Bkb3duTWVudUl0ZW0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ecm9wZG93bk1lbnVDb250ZW50PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0Ryb3Bkb3duTWVudT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+").decode()
 if s.count(old)!=1:raise RuntimeError(f"subscription action anchor={s.count(old)}")
 s=s.replace(old,new,1)
 if "MoreVertical" not in s.split("export default")[0]:
  if "  ExternalLink,\n" not in s:raise RuntimeError("MoreVertical import anchor")
  s=s.replace("  ExternalLink,\n","  ExternalLink,\n  MoreVertical,\n",1)
 dd='import {\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuTrigger,\n} from "@/components/ui/dropdown-menu";'
 if 'from "@/components/ui/dropdown-menu"' not in s:
  anchor='import { Skeleton } from "@/components/ui/skeleton";'
  if anchor not in s:raise RuntimeError("Dropdown import anchor")
  s=s.replace(anchor,anchor+"\n"+dd,1)
 P.write_text(s,encoding="utf8")
 logs=[o]
 for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
  rc,x=run(cmd,R);logs += ["$ "+" ".join(cmd),x,f"EXIT={rc}"]
  if rc:raise RuntimeError("backend verification")
 rc,x=run([str(R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"),"--noEmit"],R/"primey_frontend_v2");logs += ["===== REAL TSC =====",x,f"EXIT={rc}"]
 errors=[z for z in x.splitlines() if "error TS" in z];bad=[z for z in errors if "app/company/sales/components/company-sales-detail.tsx(35,386)" not in z]
 if bad:raise RuntimeError("unexpected TSC: "+" | ".join(bad))
 f=P.read_text(encoding="utf8");checks={"HISTORICAL_CARD_REMOVED":"تفاصيل الدفع التاريخي" not in f,"BILLING_CARD_REMOVED":"{t.companyBillingDocs}" not in f,"COMPANIES_ACTION_STYLE":'variant="outline" size="icon" aria-label={locale === "ar" ? "إجراءات الاشتراك"' in f,"DETAIL_ACTION":"تفاصيل الاشتراك" in f,"PRINT_ACTION":"printLegacySubscriptionReceipt(item)" in f}
 if not all(checks.values()):raise RuntimeError("contract "+repr(checks))
 REP.write_text("\n".join(logs)+f"\nPAGE_SHA={sha(P)}\nCOMPANY11_CR=656565\nCOMPANY11_TAX=555656\n"+("\n".join(k+"=PASS" for k in checks))+"\nRESULT=PASS\n",encoding="utf8")
 print("===== PRIMEYACC V2-26 B2C COMPANY11 SUBSCRIPTION REGISTER FINAL V4 =====");print(f"REPORT={REP.name}");print(f"PAGE_SHA={sha(P)}");print("COMPANY11_CR=656565");print("COMPANY11_TAX=555656");print("HISTORICAL_CARD_REMOVED=PASS");print("BILLING_CARD_REMOVED=PASS");print("COMPANIES_ACTION_STYLE=PASS");print("DETAIL_ACTION=PASS");print("PRINT_ACTION=PASS");print("REAL_TSC_TARGET=PASS");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")
except Exception as e:
 shutil.copy2(B/"page.tsx",P);REP.write_text(f"ERROR={e!r}\nCODE_ROLLBACK=PASS\nRESULT=FAIL\n",encoding="utf8");raise
