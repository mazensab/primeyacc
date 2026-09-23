from pathlib import Path
import os,sys,json,hashlib,re,urllib.request,urllib.parse
R=Path.cwd(); OUT=R/"v2_26_b2c_legal_identity_d5_company11_live_api_pilot_v1.txt"
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django; django.setup()
from integrations.mham_legacy.sync_engine import load_background_credentials,_load_v13
from integrations.mham_legacy.management import read_settings

LEGACY_BUSINESS_ID="11"
def safe(v):
 s=str(v or "")
 return re.sub(r'(?i)(authorization|bearer|token|secret|password|client_secret|access_token)\s*[:=]\s*[^\s,;]+',r'\1=[REDACTED]',s)[:1500]
def obj(v):
 if isinstance(v,dict): return v
 return {}
def rows(v):
 if isinstance(v,list): return v
 if isinstance(v,dict):
  for k in ("data","items","results"):
   if isinstance(v.get(k),list): return v[k]
 return []

lines=["===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D5 COMPANY11 LIVE API PILOT V1 =====",
       "MODE=READ_ONLY_LIVE","DATABASE_WRITES=NO","SOURCE_WRITES=NO",
       "LEGACY_BUSINESS_ID=11"]
try:
 settings=read_settings()
 os.environ["MHAM_LEGACY_API_BASE_URL"]=str(settings["base_url"]).rstrip("/")
 os.environ["MHAM_LEGACY_API_TIMEOUT"]=str(settings.get("timeout_seconds") or 30)
 creds=load_background_credentials()
 v13=_load_v13()
 token=v13.auth_token()
 base=os.environ["MHAM_LEGACY_API_BASE_URL"].rstrip("/")
 headers={"Authorization":"Bearer "+token,"Accept":"application/json"}

 def get(path,params=None):
  url=base+path
  if params:url+="?"+urllib.parse.urlencode(params)
  req=urllib.request.Request(url,headers=headers,method="GET")
  with urllib.request.urlopen(req,timeout=float(os.environ["MHAM_LEGACY_API_TIMEOUT"])) as r:
   return json.loads(r.read().decode("utf-8-sig","replace"))

 # Existing read-only migration endpoint is explicitly business-scoped.
 candidates=[
  ("/connector/api/primey-migration/companies/11/branches",None,"migration_branches"),
  ("/connector/api/business-location",{"business_id":"11"},"business_location"),
  ("/connector/api/business-details",{"business_id":"11"},"business_details"),
 ]
 all_payloads=[]
 for path,params,label in candidates:
  try:
   data=get(path,params)
   all_payloads.append((label,data))
   lines.append(f"{label.upper()}=PASS")
  except Exception as e:
   lines.append(f"{label.upper()}=UNAVAILABLE|{safe(e)}")

 found=[]
 keys=("tax_number","tax_number_1","tax_number_2","commercial_registration","registration_number",
       "custom_field1","custom_field2","custom_field3","custom_field4","invoice_layout_id","sale_invoice_layout_id")
 def walk(x,path="$"):
  if isinstance(x,dict):
   hit={k:x.get(k) for k in keys if k in x and x.get(k) not in (None,"")}
   if hit: found.append({"path":path,"values":hit,"id":x.get("id"),"name":x.get("name")})
   for k,v in x.items(): walk(v,path+"."+str(k))
  elif isinstance(x,list):
   for i,v in enumerate(x): walk(v,path+f"[{i}]")
 for label,data in all_payloads: walk(data,label)

 lines.append("LEGAL_CANDIDATES_BEGIN")
 for x in found: lines.append(json.dumps(x,ensure_ascii=False))
 lines.append("LEGAL_CANDIDATES_END")
 lines.append(f"LEGAL_CANDIDATE_COUNT={len(found)}")
 lines.append("NETWORK_CALLS=YES_READ_ONLY")
 lines.append("MUTATION_PERFORMED=NO")
 lines.append("RESULT=PASS")
except Exception as e:
 lines += ["ERROR="+safe(e),"MUTATION_PERFORMED=NO","RESULT=FAIL"]

OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
print(lines[0]);print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}")
print("SHA256="+hashlib.sha256(OUT.read_bytes()).hexdigest().upper())
for x in lines:
 if x.startswith(("MIGRATION_BRANCHES=","BUSINESS_LOCATION=","BUSINESS_DETAILS=","LEGAL_CANDIDATE_COUNT=","NETWORK_CALLS=","MUTATION_PERFORMED=","RESULT=")): print(x)
