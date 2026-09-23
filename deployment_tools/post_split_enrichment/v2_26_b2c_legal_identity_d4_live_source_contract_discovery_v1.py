from pathlib import Path
import re,json,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_legal_identity_d4_live_source_contract_discovery_v1.txt"
roots=[R/"integrations/mham_legacy",R/"_audit/production"]
terms=[
 "business_locations","BusinessLocation","tax_number_1","tax_number_2",
 "commercial_register","commercial_registration","invoice_layout",
 "CREDENTIAL_FILE","mham_legacy_sync_credentials","pymysql","mysql","SELECT "
]
files=[]
for base in roots:
 if base.exists():
  for ext in ("*.py","*.txt","*.json"):
   files.extend(base.rglob(ext))
seen=set();hits=[]
for f in files:
 try:
  k=str(f.resolve()).lower()
  if k in seen or f.stat().st_size>8_000_000:continue
  seen.add(k);txt=f.read_text(encoding="utf-8",errors="replace")
 except Exception:continue
 matched=[t for t in terms if t.lower() in txt.lower()]
 if not matched:continue
 snippets=[]
 for t in matched:
  for m in list(re.finditer(re.escape(t),txt,re.I))[:8]:
   a=max(0,m.start()-500);b=min(len(txt),m.end()+900)
   z=txt[a:b]
   # redact obvious secrets if any are present in source/config text
   z=re.sub(r'(?i)(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*[^\s,\n]+',r'\1=<REDACTED>',z)
   snippets.append(z)
 hits.append({"file":str(f.relative_to(R)),"terms":matched,"snippets":snippets[:24]})
lines=["===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D4 LIVE SOURCE CONTRACT DISCOVERY V1 =====",
       "MODE=READ_ONLY","NETWORK_CALLS=NO","DATABASE_WRITES=NO","SOURCE_WRITES=NO",
       f"HIT_FILES={len(hits)}","HITS_BEGIN"]
lines += [json.dumps(x,ensure_ascii=False) for x in hits]
lines += ["HITS_END","MUTATION_PERFORMED=NO","RESULT=PASS"]
OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
print(lines[0]);print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}")
print("SHA256="+hashlib.sha256(OUT.read_bytes()).hexdigest().upper())
print(f"HIT_FILES={len(hits)}");print("NETWORK_CALLS=NO");print("MUTATION_PERFORMED=NO");print("RESULT=PASS")
