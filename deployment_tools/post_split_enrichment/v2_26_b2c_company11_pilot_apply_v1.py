from pathlib import Path
import subprocess,sys,hashlib,json,shutil,os
R=Path.cwd();REPORT=R/"v2_26_b2c_company11_pilot_apply_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=120):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return p.returncode,p.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C COMPANY 11 PILOT APPLY V1 =====",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: B2B page mismatch")
probe=r"""
import os,json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from django.db import transaction
from companies.models import Company,Branch
from accounts.models import CompanyMembership
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
COMPANY_ID=11;LEGACY_COMPANY='652';LEGACY_BL1='833';LEGACY_OWNER='1053';LEGACY_SUB='1477'
with transaction.atomic():
 c=Company.objects.select_for_update().get(pk=COMPANY_ID)
 if c.company_code!='LEGACY-652':raise RuntimeError('company identity guard failed')
 bm=LegacyObjectMap.objects.get(company_id=COMPANY_ID,source_system='mhamcloud_v1',source_table='business',legacy_id=LEGACY_COMPANY)
 lm=LegacyObjectMap.objects.get(company_id=COMPANY_ID,source_system='mhamcloud_v1',source_table='business_locations',legacy_id=LEGACY_BL1)
 um=LegacyObjectMap.objects.get(company_id=COMPANY_ID,source_system='mhamcloud_v1',source_table='users',legacy_id=LEGACY_OWNER)
 sm=LegacyObjectMap.objects.get(company_id=COMPANY_ID,source_system='mhamcloud_v1',source_table='subscriptions',legacy_id=LEGACY_SUB)
 path=SOURCE_CACHE_DIR/f'company_{LEGACY_COMPANY}.json'
 src=json.loads(path.read_text(encoding='utf-8-sig'))['payload']
 company=src['company'];bl1=next(x for x in src['branches'] if str(x['id'])==LEGACY_BL1 and str(x.get('location_id')).upper()=='BL0001')
 owner=next(x for x in src['users'] if str(x['id'])==LEGACY_OWNER)
 sub=next(x for x in src['subscriptions'] if str(x['id'])==LEGACY_SUB)
 changed=[]
 def fill(field,value):
  value='' if value is None else str(value).strip()
  if value and not str(getattr(c,field,'') or '').strip():
   setattr(c,field,value);changed.append(field)
 # Only proven BL0001 contact/address fields. Legal CR/tax remain empty because source itself has null.
 fill('phone',bl1.get('mobile'));fill('city',bl1.get('city'));fill('region',bl1.get('state'));fill('country',bl1.get('country'));fill('postal_code',bl1.get('zip_code'));fill('address',bl1.get('landmark'));fill('email',bl1.get('email'))
 # Owner is a proven migrated user map and existing primary ADMIN membership.
 target_user_id=int(um.target_object_id)
 admin=CompanyMembership.objects.filter(company=c,user_id=target_user_id,role='ADMIN',status='ACTIVE').first()
 if not admin:raise RuntimeError('proven admin membership missing')
 if c.owner_id is None:c.owner_id=target_user_id;changed.append('owner_id')
 c.full_clean();c.save()
 # Persist historical source provenance in the existing subscription map metadata; do not fabricate payment/doc.
 md=dict(sm.metadata or {})
 md['legacy_subscription']={'legacy_subscription_id':sub.get('id'),'legacy_package_id':sub.get('package_id'),'start_date':sub.get('start_date'),'trial_end_date':sub.get('trial_end_date'),'end_date':sub.get('end_date'),'package_price':sub.get('package_price'),'paid_via':sub.get('paid_via'),'payment_transaction_id':sub.get('payment_transaction_id'),'status':sub.get('status'),'created_id':sub.get('created_id'),'created_at':sub.get('created_at')}
 md['legacy_payment_semantics']={'channel':'OFFLINE_MANUAL' if str(sub.get('paid_via') or '').lower()=='offline' else str(sub.get('paid_via') or ''),'method_inferred':False,'transaction_reference_present':bool(sub.get('payment_transaction_id'))}
 md['source_identity']={'legacy_company_id':company.get('id'),'legacy_owner_id':owner.get('id'),'legacy_primary_location_id':bl1.get('id'),'legacy_location_code':bl1.get('location_id')}
 sm.metadata=md;sm.save(update_fields=['metadata','updated_at'])
 print('COMPANY_CHANGED='+json.dumps(changed,ensure_ascii=False))
 print('OWNER_ID='+str(c.owner_id))
 print('PHONE='+str(c.phone));print('CITY='+str(c.city));print('REGION='+str(c.region));print('POSTAL_CODE='+str(c.postal_code));print('ADDRESS='+str(c.address))
 print('CR='+str(c.commercial_registration));print('TAX='+str(c.tax_number))
 print('LEGACY_SUB_METADATA='+json.dumps(sm.metadata,ensure_ascii=False,default=str))
"""
rc,out=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],60)
if rc:
 REPORT.write_text(out+"\nRESULT=FAIL\n",encoding="utf8");print(out);sys.exit("PILOT APPLY FAILED")
logs=[out]
for cmd in ([str(R/"venv/Scripts/python.exe"),"manage.py","check"],[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"]):
 rc2,o2=run(cmd);logs += ["$ "+" ".join(cmd),o2,f"EXIT={rc2}"]
 if rc2:REPORT.write_text("\n".join(logs)+"\nRESULT=FAIL_AFTER_DB_APPLY\n",encoding="utf8");sys.exit("VERIFY FAILED")
REPORT.write_text("\n".join(logs)+"\nSPLIT_STRUCTURE_CHANGED=NO\nPAYMENT_FABRICATED=NO\nDOCUMENT_FABRICATED=NO\nRESULT=PASS\n",encoding="utf8")
print(f"REPORT={REPORT.name}",flush=True);print(f"SIZE={REPORT.stat().st_size}",flush=True);print(f"SHA256={sha(REPORT)}",flush=True);print("SPLIT_STRUCTURE_CHANGED=NO",flush=True);print("PAYMENT_FABRICATED=NO",flush=True);print("RESULT=PASS",flush=True)
