from pathlib import Path
import subprocess,sys,hashlib,shutil
R=Path.cwd();P=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";REP=R/"v2_26_b2c_company11_subscription_register_final_v1.txt"
PS="C8451F68452BA5D93324D085D3E30C9C8FF37DBC83D7849A9A595A408823000C"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,cwd=R,t=300):
 q=subprocess.run(a,cwd=cwd,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
def one(s,a,b,n):
 c=s.count(a)
 if c!=1:raise RuntimeError(f"{n}: anchor={c}")
 return s.replace(a,b,1)
if sha(P)!=PS:sys.exit("SAFETY STOP: Company11 final billing baseline mismatch")
B=R/"backups/v2_26_b2c_company11_subscription_register_final_v1";B.mkdir(parents=True,exist_ok=True);shutil.copy2(P,B/"page.tsx")
try:
 probe="import os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');import django;django.setup();from django.db import transaction;from companies.models import Company;from business_controls.models import LegacyObjectMap\nwith transaction.atomic():\n c=Company.objects.select_for_update().get(pk=11)\n assert c.company_code=='LEGACY-652'\n if not c.commercial_registration:c.commercial_registration='656565'\n if not c.tax_number:c.tax_number='555656'\n c.full_clean();c.save()\n m=LegacyObjectMap.objects.get(company_id=11,source_system='mhamcloud_v1',source_table='business_locations',legacy_id='833')\n md=dict(m.metadata or {});md['legal_identity_ui_verified']={'commercial_registration':'656565','tax_number':'555656','source':'MHAMCLOUD_BL0001_EDIT_UI_VERIFIED'};m.metadata=md;m.save(update_fields=['metadata','updated_at'])\n print('COMPANY_CR='+c.commercial_registration);print('COMPANY_TAX='+c.tax_number)"
 rc,o=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],R,60)
 if rc:raise RuntimeError("legal identity apply failed: "+o)
 s=P.read_text(encoding="utf8")
 i=s.find('            {companySubscriptions.some((item) => item.legacyPaidVia || item.legacyStatus) ? (\n              <Card>')
 if i<0:raise RuntimeError("historical card start missing")
 j=s.find('            ) : null}\n\n',i)
 if j<0:raise RuntimeError("historical card end missing")
 s=s[:i]+s[j+len('            ) : null}\n\n'):]
 i=s.find('            <Card>\n              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">\n                <div>\n                  <CardTitle icon={CreditCard}>{t.companyBillingDocs}</CardTitle>')
 if i<0:raise RuntimeError("billing card start missing")
 ti=s.find('          </div>\n        </div>\n      </div>\n    </TooltipProvider>',i)
 if ti<0:raise RuntimeError("page tail missing")
 last=s.rfind('            </Card>',i,ti)
 if last<0:raise RuntimeError("billing card end missing")
 s=s[:i]+s[last+len('            </Card>\n'):]
 s=one(s,'                            <td className="px-4 py-3 align-middle">\n                              <Button type="button" variant="outline" size="sm" asChild>\n                                <Link href={`/system/subscriptions/${item.id}`}>\n                                  {t.openDetails}\n                                  <ExternalLink className="h-3.5 w-3.5" />\n                                </Link>\n                              </Button>\n                            </td>','                            <td className="px-4 py-3 align-middle">\n                              <DropdownMenu>\n                                <DropdownMenuTrigger asChild>\n                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label={locale === "ar" ? "إجراءات الاشتراك" : "Subscription actions"}>\n                                    <MoreVertical className="h-4 w-4" />\n                                  </Button>\n                                </DropdownMenuTrigger>\n                                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-48">\n                                  <DropdownMenuItem asChild>\n                                    <Link href={`/system/subscriptions/${item.id}`}>\n                                      <ExternalLink className="h-4 w-4" />\n                                      {locale === "ar" ? "تفاصيل الاشتراك" : "Subscription details"}\n                                    </Link>\n                                  </DropdownMenuItem>\n                                  <DropdownMenuItem onClick={() => printLegacySubscriptionReceipt(item)}>\n                                    <Printer className="h-4 w-4" />\n                                    {locale === "ar" ? "طباعة مستند الاشتراك" : "Print subscription document"}\n                                  </DropdownMenuItem>\n                                </DropdownMenuContent>\n                              </DropdownMenu>\n                            </td>',"subscription action")
 if "MoreVertical" not in s.split('from "lucide-react"')[0]:
  s=one(s,"  ExternalLink,\n","  ExternalLink,\n  MoreVertical,\n","more icon")
 P.write_text(s,encoding="utf8")
 logs=[o]
 for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
  rc,x=run(cmd,R);logs += [x,f"EXIT={rc}"]
  if rc:raise RuntimeError("backend verify")
 rc,x=run([str(R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"),"--noEmit"],R/"primey_frontend_v2");logs += ["===== REAL TSC =====",x,f"EXIT={rc}"]
 errors=[z for z in x.splitlines() if "error TS" in z]
 if not all("app/company/sales/components/company-sales-detail.tsx(35,386)" in z for z in errors):raise RuntimeError("unexpected TSC: "+" | ".join(errors))
 REP.write_text("\n".join(logs)+f"\nPAGE_SHA={sha(P)}\nCOMPANY11_CR=656565\nCOMPANY11_TAX=555656\nHISTORICAL_PAYMENT_CARD_REMOVED=YES\nBILLING_DOCUMENTS_CARD_REMOVED=YES\nSUBSCRIPTION_ACTION_MENU=PASS\nRESULT=PASS\n",encoding="utf8")
 print("===== PRIMEYACC V2-26 B2C COMPANY11 SUBSCRIPTION REGISTER FINAL V1 =====");print(f"REPORT={REP.name}");print(f"PAGE_SHA={sha(P)}");print("COMPANY11_CR=656565");print("COMPANY11_TAX=555656");print("HISTORICAL_PAYMENT_CARD_REMOVED=YES");print("BILLING_DOCUMENTS_CARD_REMOVED=YES");print("SUBSCRIPTION_ACTION_MENU=PASS");print("REAL_TSC_TARGET=PASS");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")
except Exception as e:
 shutil.copy2(B/"page.tsx",P);REP.write_text(f"ERROR={e!r}\nCODE_ROLLBACK=PASS\nRESULT=FAIL\n",encoding="utf8");raise
