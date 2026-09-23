from pathlib import Path
import subprocess, hashlib, sys, re
R=Path.cwd()
OUT=R/"v2_26_b2c_exact_mutation_bundle.txt"
targets=[
 "api/system/companies/detail.py",
 "primey_frontend_v2/app/system/companies/[id]/page.tsx",
 "integrations/mham_legacy/sync_engine.py",
 "integrations/mham_legacy/management.py",
 "billing/payment_models.py",
 "api/system/subscription_payments/views.py",
 "billing/services.py",
]
def run(a,t=180):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t)
 return p.returncode,p.stdout.rstrip()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
_,head=run(["git","rev-parse","HEAD"]);_,origin=run(["git","rev-parse","origin/main"])
head=head.strip();origin=origin.strip()
if head!="f6267f27e5313b0e01c317db8c1eaa13b8ac5d02" or origin!=head:
 sys.exit("SAFETY STOP: V2-25H frozen baseline mismatch")
page=R/targets[1]
if not page.exists() or sha(page)!="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770":
 sys.exit("SAFETY STOP: B2B PASS page hash mismatch")
out=["===== PRIMEYACC V2-26 B2C EXACT MUTATION BUNDLE =====",
 f"HEAD={head}",f"ORIGIN={origin}",f"PAGE_SHA256={sha(page)}","MUTATION_PERFORMED=NO"]
for rel in targets:
 p=R/rel
 out+=["",f"===== FILE {rel} ====="]
 if not p.exists(): out.append("MISSING");continue
 out += [f"SIZE={p.stat().st_size}",f"SHA256={sha(p)}","----- SOURCE START -----",
         p.read_text(encoding="utf8",errors="replace"),"----- SOURCE END -----"]

# Exact live legacy cache contract: only company 652 sample, no network and no mutation.
try:
 sys.path.insert(0,str(R))
 import os
 os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
 import django; django.setup()
 from integrations.mham_legacy.management import SOURCE_CACHE_DIR
 cache=Path(SOURCE_CACHE_DIR)/"company_652.json"
 out += ["","===== LEGACY CACHE 652 =====",f"PATH={cache}"]
 if cache.exists():
  txt=cache.read_text(encoding="utf8",errors="replace")
  out += [f"SIZE={cache.stat().st_size}",f"SHA256={sha(cache)}","----- CACHE START -----",txt,"----- CACHE END -----"]
 else: out.append("MISSING")
except Exception as e:
 out += ["","===== LEGACY CACHE ERROR =====",repr(e)]

# Runtime rows for company 11: exact fields, read-only.
probe=r"""
from companies.models import Company
from subscriptions.models import CompanySubscription
from billing.models import PlatformSubscriptionPayment,PlatformBillingDocument
from business_controls.models import LegacyObjectMap
c=Company.objects.get(pk=11)
print("COMPANY",c.pk,c.company_code,c.name,c.commercial_registration,c.tax_number,c.owner_id)
for b in c.branches.order_by("id"):
 print("BRANCH",b.id,b.branch_code,b.name,b.is_default,b.phone,b.city,b.address,b.extra_data)
for s in CompanySubscription.objects.filter(company=c).select_related("plan","created_by").order_by("id"):
 print("SUB",s.id,s.plan_id,s.plan.name,s.status,s.action,s.billing_cycle,s.start_date,s.end_date,s.total_amount,s.billing_reference,s.created_by_id,s.notes,s.commercial_snapshot)
for p in PlatformSubscriptionPayment.objects.filter(company=c).order_by("id"):
 print("PAY",p.id,p.subscription_id,p.status,p.gateway,p.payment_method,p.gateway_payment_id,p.transaction_reference,p.billing_reference,p.amount,p.currency_code,p.created_by_id,p.metadata,p.provider_response_snapshot)
for d in PlatformBillingDocument.objects.filter(company=c).order_by("id"):
 print("DOC",d.id,d.document_type,d.document_number,d.subscription_id,d.payment_method,d.transaction_reference,d.billing_reference,d.total_amount,d.created_by_id)
for m in LegacyObjectMap.objects.filter(company=c).order_by("id"):
 print("MAP",m.id,m.source_table,m.legacy_id,m.legacy_company_id,m.metadata)
"""
rc,runtime=run([str(R/"venv/Scripts/python.exe"),"-c",probe])
out += ["","===== COMPANY 11 RUNTIME =====",f"EXIT={rc}",runtime]

# Existing UI component inventory: proves what V2 already has.
rc,ui=run(["git","ls-files","primey_frontend_v2/components/ui"])
out += ["","===== EXISTING V2 UI =====",f"EXIT={rc}",ui]

_,st=run(["git","status","--short"])
out += ["","===== WORKTREE =====",st or "CLEAN","MUTATION_PERFORMED=NO",
"NEXT=Generate guarded B2C mutation from this exact bundle: legal identity from first/default legacy location; owner/admin; legacy+Primey subscription/payment history; offline preserved as manual/offline (not guessed cash); gateway/provider/card method from explicit source fields only; transaction reference preserved; invoice/receipt links; existing V2 UI only."]
OUT.write_text("\n".join(out)+"\n",encoding="utf8")
print("===== PRIMEYACC V2-26 B2C EXACT MUTATION BUNDLE =====")
print(f"REPORT={OUT.name}")
print(f"SIZE={OUT.stat().st_size}")
print(f"SHA256={sha(OUT)}")
print("MUTATION_PERFORMED=NO")
print("RESULT=PASS")
