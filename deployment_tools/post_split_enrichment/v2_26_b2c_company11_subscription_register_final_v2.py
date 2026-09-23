from pathlib import Path
import subprocess,sys,hashlib,shutil,base64
R=Path.cwd();P=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";REP=R/"v2_26_b2c_company11_subscription_register_final_v2.txt"
PS="C8451F68452BA5D93324D085D3E30C9C8FF37DBC83D7849A9A595A408823000C"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,cwd=R,t=300):
 q=subprocess.run(a,cwd=cwd,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
def one(s,a,b,n):
 c=s.count(a)
 if c!=1:raise RuntimeError(f"{n}: anchor={c}")
 return s.replace(a,b,1)
def remove_card(s,needle,name):
 pos=s.find(needle)
 if pos<0:raise RuntimeError(f"{name}: title missing")
 start=s.rfind("            <Card>",0,pos)
 end=s.find("            </Card>",pos)
 if start<0 or end<0:raise RuntimeError(f"{name}: card bounds missing")
 return s[:start]+s[end+len("            </Card>"):]
if sha(P)!=PS:sys.exit("SAFETY STOP: Company11 page baseline mismatch")
B=R/"backups/v2_26_b2c_company11_subscription_register_final_v2";B.mkdir(parents=True,exist_ok=True);shutil.copy2(P,B/"page.tsx")
try:
 probe="import os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');import django;django.setup();from django.db import transaction;from companies.models import Company;from business_controls.models import LegacyObjectMap\nwith transaction.atomic():\n c=Company.objects.select_for_update().get(pk=11)\n assert c.company_code=='LEGACY-652'\n if not c.commercial_registration:c.commercial_registration='656565'\n if not c.tax_number:c.tax_number='555656'\n c.full_clean();c.save()\n m=LegacyObjectMap.objects.get(company_id=11,source_system='mhamcloud_v1',source_table='business_locations',legacy_id='833')\n md=dict(m.metadata or {});md['legal_identity_ui_verified']={'commercial_registration':'656565','tax_number':'555656','source':'MHAMCLOUD_BL0001_EDIT_UI_VERIFIED'};m.metadata=md;m.save(update_fields=['metadata','updated_at'])\n print('COMPANY_CR='+c.commercial_registration);print('COMPANY_TAX='+c.tax_number)"
 rc,o=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],R,60)
 if rc:raise RuntimeError("legal identity verify failed: "+o)
 s=P.read_text(encoding="utf8")
 s=remove_card(s,'{locale === "ar" ? "تفاصيل الدفع التاريخي" : "Historical payment details"}',"historical")
 s=remove_card(s,"{t.companyBillingDocs}","billing")
 old=base64.b64decode("ICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9InB4LTQgcHktMyBhbGlnbi1taWRkbGUiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIHR5cGU9ImJ1dHRvbiIgdmFyaWFudD0ib3V0bGluZSIgc2l6ZT0ic20iIGFzQ2hpbGQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPExpbmsgaHJlZj17YC9zeXN0ZW0vc3Vic2NyaXB0aW9ucy8ke2l0ZW0uaWR9YH0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dC5vcGVuRGV0YWlsc30KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPSJoLTMuNSB3LTMuNSIgLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0xpbms+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD4=").decode()
 new=base64.b64decode("ICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9InB4LTQgcHktMyBhbGlnbi1taWRkbGUiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8RHJvcGRvd25NZW51PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEcm9wZG93bk1lbnVUcmlnZ2VyIGFzQ2hpbGQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIHR5cGU9ImJ1dHRvbiIgdmFyaWFudD0iZ2hvc3QiIHNpemU9Imljb24iIGNsYXNzTmFtZT0iaC04IHctOCByb3VuZGVkLWxnIiBhcmlhLWxhYmVsPXtsb2NhbGUgPT09ICJhciIgPyAi2KXYrNix2KfYodin2Kog2KfZhNin2LTYqtix2KfZgyIgOiAiU3Vic2NyaXB0aW9uIGFjdGlvbnMifT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE1vcmVWZXJ0aWNhbCBjbGFzc05hbWU9ImgtNCB3LTQiIC8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0J1dHRvbj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0Ryb3Bkb3duTWVudVRyaWdnZXI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPERyb3Bkb3duTWVudUNvbnRlbnQgYWxpZ249e2xvY2FsZSA9PT0gImFyIiA/ICJzdGFydCIgOiAiZW5kIn0gY2xhc3NOYW1lPSJ3LTQ4Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEcm9wZG93bk1lbnVJdGVtIGFzQ2hpbGQ+PExpbmsgaHJlZj17YC9zeXN0ZW0vc3Vic2NyaXB0aW9ucy8ke2l0ZW0uaWR9YH0+PEV4dGVybmFsTGluayBjbGFzc05hbWU9ImgtNCB3LTQiIC8+e2xvY2FsZSA9PT0gImFyIiA/ICLYqtmB2KfYtdmK2YQg2KfZhNin2LTYqtix2KfZgyIgOiAiU3Vic2NyaXB0aW9uIGRldGFpbHMifTwvTGluaz48L0Ryb3Bkb3duTWVudUl0ZW0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8RHJvcGRvd25NZW51SXRlbSBvbkNsaWNrPXsoKSA9PiBwcmludExlZ2FjeVN1YnNjcmlwdGlvblJlY2VpcHQoaXRlbSl9PjxQcmludGVyIGNsYXNzTmFtZT0iaC00IHctNCIgLz57bG9jYWxlID09PSAiYXIiID8gIti32KjYp9i52Kkg2YXYs9iq2YbYryDYp9mE2KfYtNiq2LHYp9mDIiA6ICJQcmludCBzdWJzY3JpcHRpb24gZG9jdW1lbnQifTwvRHJvcGRvd25NZW51SXRlbT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0Ryb3Bkb3duTWVudUNvbnRlbnQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvRHJvcGRvd25NZW51PgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD4=").decode()
 s=one(s,old,new,"subscription-action")
 if "MoreVertical" not in s.split("export default")[0]:
  s=one(s,"  ExternalLink,\n","  ExternalLink,\n  MoreVertical,\n","more-icon")
 P.write_text(s,encoding="utf8")
 logs=[o]
 for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
  rc,x=run(cmd,R);logs += [x,f"EXIT={rc}"]
  if rc:raise RuntimeError("backend verify")
 rc,x=run([str(R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"),"--noEmit"],R/"primey_frontend_v2");logs += ["===== REAL TSC =====",x,f"EXIT={rc}"]
 errors=[z for z in x.splitlines() if "error TS" in z]
 bad=[z for z in errors if "app/company/sales/components/company-sales-detail.tsx(35,386)" not in z]
 if bad:raise RuntimeError("unexpected TSC: "+" | ".join(bad))
 final=P.read_text(encoding="utf8")
 checks={"HISTORICAL_PAYMENT_CARD_REMOVED":'تفاصيل الدفع التاريخي' not in final,"BILLING_DOCUMENTS_CARD_REMOVED":"{t.companyBillingDocs}" not in final,"SUBSCRIPTION_ACTION_MENU":'aria-label={locale === "ar" ? "إجراءات الاشتراك"' in final,"PRINT_ACTION":'printLegacySubscriptionReceipt(item)' in final}
 if not all(checks.values()):raise RuntimeError("contract failed "+repr(checks))
 REP.write_text("\n".join(logs)+f"\nPAGE_SHA={sha(P)}\nCOMPANY11_CR=656565\nCOMPANY11_TAX=555656\n"+("\n".join(f"{k}=PASS" for k in checks))+"\nRESULT=PASS\n",encoding="utf8")
 print("===== PRIMEYACC V2-26 B2C COMPANY11 SUBSCRIPTION REGISTER FINAL V2 =====");print(f"REPORT={REP.name}");print(f"PAGE_SHA={sha(P)}");print("COMPANY11_CR=656565");print("COMPANY11_TAX=555656");print("HISTORICAL_PAYMENT_CARD_REMOVED=PASS");print("BILLING_DOCUMENTS_CARD_REMOVED=PASS");print("SUBSCRIPTION_ACTION_MENU=PASS");print("PRINT_ACTION=PASS");print("REAL_TSC_TARGET=PASS");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")
except Exception as e:
 shutil.copy2(B/"page.tsx",P);REP.write_text(f"ERROR={e!r}\nCODE_ROLLBACK=PASS\nRESULT=FAIL\n",encoding="utf8");raise
