from pathlib import Path
import hashlib,re,subprocess,sys
R=Path.cwd();OUT=R/"v2_26_b2c_unified_legacy_billing_identity_discovery.txt"
FREEZE="f6267f27e5313b0e01c317db8c1eaa13b8ac5d02";PAGE_SHA="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def run(a,t=180):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return p.returncode,p.stdout.rstrip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
_,h=run(["git","rev-parse","HEAD"]);_,o=run(["git","rev-parse","origin/main"]);h=h.strip();o=o.strip()
page=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx"
if h!=FREEZE or o!=FREEZE:sys.exit("SAFETY STOP: baseline mismatch")
if not page.exists() or sha(page)!=PAGE_SHA:sys.exit("SAFETY STOP: B2B PASS page not found")
out=["===== PRIMEYACC V2-26 B2C UNIFIED LEGACY BILLING IDENTITY DISCOVERY =====",f"HEAD={h}",f"PAGE_SHA256={sha(page)}","MUTATION_PERFORMED=NO"]
_,tracked=run(["git","ls-files"])
keys=re.compile(r"(legacy|migration|mham|source.cache|subscription|payment|transaction|location|branch|business|company|receipt|invoice|billing)",re.I)
files=[]
for rel in tracked.splitlines():
 if rel.endswith((".py",".json",".sql",".txt")) and keys.search(rel):
  p=R/rel
  if p.exists() and p.stat().st_size<8000000:files.append(p)
pat=re.compile(r"(paid[_ ]?via|payment[_ ]?transaction|transaction[_ ]?id|offline|MADA|VISA|MASTER|subscription|package|start[_ ]?date|end[_ ]?date|trial[_ ]?end|created[_ ]?by|location[_ ]?id|tax[_ ]?number|commercial[_ ]?registration|national[_ ]?address|business[_ ]?id)",re.I)
hits=0
for p in files:
 try:txt=p.read_text(encoding="utf8",errors="replace")
 except:continue
 rows=[(i,l) for i,l in enumerate(txt.splitlines(),1) if pat.search(l)]
 if rows:
  out+=["",f"FILE={p.relative_to(R).as_posix()}",f"MATCHES={len(rows)}"]
  for i,l in rows[:120]:out.append(f"L{i}: {l[:900]}")
  hits+=len(rows)
probe="import os,django;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');django.setup();from django.apps import apps;terms=('legacy','subscription','payment','transaction','location','branch','company','receipt','invoice','billing');models=sorted(apps.get_models(),key=lambda x:(x._meta.app_label,x.__name__));[(print('MODEL='+m._meta.label),print('TABLE='+m._meta.db_table),print('FIELDS='+','.join(f.name for f in m._meta.get_fields()))) for m in models if any(t in (m._meta.label+' '+' '.join(f.name for f in m._meta.get_fields())).lower() for t in terms)]"
rc,schema=run([str(R/"venv/Scripts/python.exe"),"-c",probe]);out+=["","===== DJANGO SCHEMA =====",f"EXIT={rc}",schema]
out+=["","===== LOCAL LEGACY ARTIFACT INVENTORY ====="]
for base in [R/"backups",R/"_audit",R/"migration_snapshots",R/"legacy",R/"data"]:
 if not base.exists():continue
 count=0
 for p in base.rglob("*"):
  if not p.is_file() or p.suffix.lower() not in {".json",".sql",".csv",".txt",".sqlite",".db"} or p.stat().st_size>50000000:continue
  out.append(f"ARTIFACT={p.relative_to(R).as_posix()} SIZE={p.stat().st_size}");count+=1
  if count>=250:break
_,status=run(["git","status","--short"])
out+=["","===== SAFETY =====","STATUS:",status or "CLEAN",f"EVIDENCE_MATCHES={hits}","MUTATION_PERFORMED=NO","NEXT=Build one guarded unified mutation only from proven legacy source relationships; never infer offline=CASH or card network from transaction ID."]
OUT.write_text("\n".join(out)+"\n",encoding="utf8")
print("===== PRIMEYACC V2-26 B2C UNIFIED LEGACY BILLING IDENTITY DISCOVERY =====");print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT=PASS")
