from pathlib import Path
import subprocess,sys,hashlib,re,json
R=Path.cwd();OUT=R/"v2_26_b2c_legal_identity_source_discovery_d1_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
print("===== PRIMEYACC V2-26 B2C LEGAL IDENTITY SOURCE DISCOVERY D1 V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
# Pure filesystem/source discovery. Never opens network and never mutates DB/files except this report.
roots=[R/"integrations/mham_legacy",R/"_audit",R]
names=("tax_number","tax_no","vat_number","commercial_registration","business_registration","cr_number","business_locations","BL0001","SOURCE_CACHE_DIR")
hits=[];seen=set()
# Targeted source files first.
candidates=[]
for base in [R/"integrations/mham_legacy",R/"_audit"]:
 if base.exists():
  for ext in ("*.py","*.txt","*.json","*.sql","*.log"):
   try:candidates.extend(base.rglob(ext))
   except Exception:pass
# Include likely root artifacts without scanning node_modules/.git.
for q in ("*mham*","*legacy*","*migration*","*snapshot*"):
 try:
  for x in R.glob(q):
   if x.is_file():candidates.append(x)
 except Exception:pass
for f in candidates:
 try:
  key=str(f.resolve()).lower()
  if key in seen:continue
  seen.add(key)
  if f.stat().st_size>80_000_000:continue
  txt=f.read_text(encoding="utf-8",errors="replace")
 except Exception:continue
 low=txt.lower()
 matched=[n for n in names if n.lower() in low]
 if not matched:continue
 snippets=[]
 for n in matched:
  for m in list(re.finditer(re.escape(n),txt,re.I))[:4]:
   a=max(0,m.start()-220);b=min(len(txt),m.end()+420)
   snippets.append(txt[a:b].replace("\x00",""))
 hits.append({"file":str(f.relative_to(R)),"size":f.stat().st_size,"terms":matched,"snippets":snippets[:12]})
# Runtime constant and exact sync source excerpts.
runtime={}
try:
 env=dict(os.environ) if False else None
 q=subprocess.run([str(R/"venv/Scripts/python.exe"),"-c","from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR;print(SOURCE_CACHE_DIR)"],cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=30)
 runtime["SOURCE_CACHE_DIR"]=q.stdout.strip();runtime["exit"]=q.returncode
except Exception as e:runtime["error"]=repr(e)
print("RUNTIME="+json.dumps(runtime,ensure_ascii=False),flush=True)
print("HIT_COUNT="+str(len(hits)),flush=True)
print("HITS_BEGIN",flush=True)
for h in hits:print(json.dumps(h,ensure_ascii=False),flush=True)
print("HITS_END",flush=True)
OUT.write_text("===== PRIMEYACC V2-26 B2C LEGAL IDENTITY SOURCE DISCOVERY D1 V1 =====\nRUNTIME="+json.dumps(runtime,ensure_ascii=False)+"\nHIT_COUNT="+str(len(hits))+"\nHITS_BEGIN\n"+"\n".join(json.dumps(h,ensure_ascii=False) for h in hits)+"\nHITS_END\nMUTATION_PERFORMED=NO\nRESULT=PASS\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT=PASS")
