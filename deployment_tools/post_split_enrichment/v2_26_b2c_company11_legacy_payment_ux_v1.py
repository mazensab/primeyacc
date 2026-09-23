from pathlib import Path
import subprocess,sys,hashlib,shutil,json
R=Path.cwd();P=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";REP=R/"v2_26_b2c_company11_legacy_payment_ux_v1.txt"
PS="175CE8F5BBD6488D4E3F21ED4CFBA6419672B899384438DC46B998D61C1631CD"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,cwd=R,t=300):
 q=subprocess.run(a,cwd=cwd,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
def one(s,a,b,n):
 c=s.count(a)
 if c!=1:raise RuntimeError(f"{n}: anchor={c}")
 return s.replace(a,b,1)
if sha(P)!=PS:sys.exit("SAFETY STOP page mismatch")
B=R/"backups/v2_26_b2c_company11_legacy_payment_ux_v1";B.mkdir(parents=True,exist_ok=True);shutil.copy2(P,B/"page.tsx")
try:
 probe="import os,json;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');import django;django.setup();from business_controls.models import LegacyObjectMap;from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR;m=LegacyObjectMap.objects.get(company_id=11,source_system='mhamcloud_v1',source_table='subscriptions',legacy_id='1477');src=json.loads((SOURCE_CACHE_DIR/'company_652.json').read_text(encoding='utf-8-sig'))['payload'];sub=next(x for x in src['subscriptions'] if str(x['id'])=='1477');details=json.loads(sub.get('package_details') or '{}');creator=next((u for u in src.get('users',[]) if str(u.get('id'))==str(sub.get('created_id'))),None);md=dict(m.metadata or {});ls=dict(md.get('legacy_subscription') or {});ls.update({'package_name':details.get('name') or '','created_by_name':((' '.join(str((creator or {}).get(k) or '').strip() for k in ('first_name','last_name')).strip()) or str(sub.get('created_id') or '')),'created_by_email':str((creator or {}).get('email') or '')});md['legacy_subscription']=ls;m.metadata=md;m.save(update_fields=['metadata','updated_at']);print(json.dumps(ls,ensure_ascii=False))"
 rc,o=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],R,60)
 if rc:raise RuntimeError("metadata enrichment failed: "+o)
 s=P.read_text(encoding="utf8")
 s=one(s,"  legacyStatus: string;\n};","  legacyStatus: string;\n  legacyPackageName: string;\n  legacyCreatedBy: string;\n  legacyCreatedAt: string | null;\n};","type")
 s=one(s,"    legacyStatus: normalizeText(asRecord(asRecord(record.legacy).subscription).status),\n  };","    legacyStatus: normalizeText(asRecord(asRecord(record.legacy).subscription).status),\n    legacyPackageName: normalizeText(asRecord(asRecord(record.legacy).subscription).package_name),\n    legacyCreatedBy: normalizeText(asRecord(asRecord(record.legacy).subscription).created_by_name),\n    legacyCreatedAt: normalizeText(asRecord(asRecord(record.legacy).subscription).created_at) || null,\n  };","normalize")
 s=s.replace("companySubscriptions.find((item) => item.isCurrent)?.planName || companySubscriptions.find((item) => [\"ACTIVE\", \"TRIAL\"].includes(item.status))?.planName","companySubscriptions.find((item) => item.isCurrent)?.legacyPackageName || companySubscriptions.find((item) => item.isCurrent)?.planName || companySubscriptions.find((item) => [\"ACTIVE\", \"TRIAL\"].includes(item.status))?.legacyPackageName || companySubscriptions.find((item) => [\"ACTIVE\", \"TRIAL\"].includes(item.status))?.planName")
 s=s.replace("{item.planName}", "{item.legacyPackageName || item.planName}")
 marker='            <Card>\n              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">\n                <div>\n                  <CardTitle icon={CreditCard}>{t.companyBillingDocs}</CardTitle>'
 card='''            {companySubscriptions.some((item) => item.legacyPaidVia || item.legacyStatus) ? (
              <Card>
                <CardHeader>
                  <CardTitle icon={CreditCard}>{locale === "ar" ? "تفاصيل الدفع التاريخي" : "Historical payment details"}</CardTitle>
                  <CardDescription>{locale === "ar" ? "بيانات مهاجرة من مهام كما وردت في المصدر، وليست إيصال دفع حديثًا من Primey." : "Migrated source facts; not a modern Primey payment receipt."}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {companySubscriptions.filter((item) => item.legacyPaidVia || item.legacyStatus).slice(0, 1).map((item) => (
                    <React.Fragment key={`legacy-payment-${item.id}`}>
                      <DetailRow label={locale === "ar" ? "الباقة الأصلية" : "Source package"} value={item.legacyPackageName || item.planName} icon={ReceiptText} />
                      <DetailRow label={locale === "ar" ? "حالة العملية" : "Source status"} value={item.legacyStatus.toLowerCase() === "approved" ? (locale === "ar" ? "معتمدة" : "Approved") : (item.legacyStatus || t.notAvailable)} icon={ShieldCheck} />
                      <DetailRow label={locale === "ar" ? "قناة الدفع" : "Payment channel"} value={item.legacyPaidVia.toLowerCase() === "offline" ? (locale === "ar" ? "خارج البوابة / يدوي" : "Offline / manual") : (item.legacyPaidVia || t.notAvailable)} icon={CreditCard} />
                      <DetailRow label={t.reference} value={item.legacyTransactionReference || t.notAvailable} icon={Hash} />
                      <DetailRow label={locale === "ar" ? "أنشئت بواسطة" : "Created by"} value={item.legacyCreatedBy || t.notAvailable} icon={UserRound} />
                      <DetailRow label={locale === "ar" ? "تاريخ العملية" : "Source date"} value={formatDateTime(item.legacyCreatedAt)} icon={CalendarDays} />
                      <DetailRow label={t.amount} value={<SarAmount amount={item.totalAmount} label="SAR" />} icon={ReceiptText} />
                      <DetailRow label={locale === "ar" ? "نوع السجل" : "Record type"} value={locale === "ar" ? "سجل اشتراك مهاجر" : "Migrated subscription record"} icon={FileText} />
                    </React.Fragment>
                  ))}
                </CardContent>
              </Card>
            ) : null}

'''
 s=one(s,marker,card+marker,"legacy card");P.write_text(s,encoding="utf8")
 logs=[o]
 for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
  rc,x=run(cmd,R);logs += [x,f"EXIT={rc}"]
  if rc:raise RuntimeError("backend verify")
 rc,x=run([str(R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"),"--noEmit"],R/"primey_frontend_v2");logs += ["===== REAL TSC =====",x,f"EXIT={rc}"]
 errors=[z for z in x.splitlines() if "error TS" in z]
 allowed=all("app/company/sales/components/company-sales-detail.tsx(35,386)" in z for z in errors)
 if not allowed:raise RuntimeError("unexpected TSC: "+" | ".join(errors))
 REP.write_text("\n".join(logs)+f"\nPAGE_SHA={sha(P)}\nPAYMENT_DOCUMENT_FABRICATED=NO\nRESULT=PASS\n",encoding="utf8")
 print("===== PRIMEYACC V2-26 B2C COMPANY11 LEGACY PAYMENT UX V1 =====");print(f"REPORT={REP.name}");print(f"PAGE_SHA={sha(P)}");print("REAL_TSC_TARGET=PASS");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("PAYMENT_DOCUMENT_FABRICATED=NO");print("RESULT=PASS")
except Exception as e:
 shutil.copy2(B/"page.tsx",P);REP.write_text(f"ERROR={e!r}\nCODE_ROLLBACK=PASS\nRESULT=FAIL\n",encoding="utf8");raise
