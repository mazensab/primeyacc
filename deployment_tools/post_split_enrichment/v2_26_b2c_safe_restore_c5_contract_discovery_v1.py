from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_safe_restore_c5_contract_discovery_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=180):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SAFE RESTORE C5 CONTRACT DISCOVERY V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from subscriptions.models import CompanySubscription
from business_controls.models import LegacyObjectMap
from django.db.models import Count
# Inspect exact model defaults/choices/nullability.
print('FIELDS_BEGIN')
for f in CompanySubscription._meta.fields:
 print(json.dumps({'name':f.name,'type':f.get_internal_type(),'null':f.null,'blank':f.blank,'default':None if not f.has_default() else str(f.default),'choices':list(f.choices) if f.choices else []},ensure_ascii=False,default=str))
print('FIELDS_END')
# Samples from existing historical migrated subscriptions for package 8/11/12 plans.
qs=CompanySubscription.objects.filter(plan_id__in=[15,17,25]).order_by('id')
print('SAMPLES_BEGIN')
for x in qs.values('id','company_id','plan_id','start_date','end_date','price','discount_amount','manual_discount_amount','promotion_discount_amount','proration_credit_amount','proration_charge_amount','tax_amount','total_amount','billing_cycle','billing_reference','status','action','auto_renew','activated_at','paid_at','cancelled_at','suspended_at','created_by_id','previous_subscription_id','notes')[:30]:
 print(json.dumps(x,ensure_ascii=False,default=str))
print('SAMPLES_END')
# Exact LegacyObjectMap model contract + subscription-map samples.
print('MAP_FIELDS_BEGIN')
for f in LegacyObjectMap._meta.fields:
 print(json.dumps({'name':f.name,'type':f.get_internal_type(),'null':f.null,'blank':f.blank,'default':None if not f.has_default() else str(f.default)},ensure_ascii=False,default=str))
print('MAP_FIELDS_END')
print('MAP_SAMPLES_BEGIN')
for x in LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table='subscriptions').exclude(target_object_id__isnull=True).values()[:12]:
 print(json.dumps(x,ensure_ascii=False,default=str))
print('MAP_SAMPLES_END')
print('DUPLICATE_MAP_KEYS='+json.dumps(list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table='subscriptions').values('company_id','legacy_id').annotate(n=Count('id')).filter(n__gt=1)[:20]),ensure_ascii=False,default=str))
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],180)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C SAFE RESTORE C5 CONTRACT DISCOVERY V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)
