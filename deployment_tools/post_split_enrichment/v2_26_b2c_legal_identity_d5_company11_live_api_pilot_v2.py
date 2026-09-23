from pathlib import Path
import os,json,hashlib,re,urllib.request,urllib.parse
R=Path.cwd(); OUT=R/"v2_26_b2c_legal_identity_d5_company11_live_api_pilot_v2.txt"
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django; django.setup()
from integrations.mham_legacy.sync_engine import load_background_credentials
from integrations.mham_legacy.management import read_settings

def safe(v):
 s=str(v or "")
 s=re.sub(r'(?i)(authorization|bearer|token|secret|password|client_secret|access_token)\s*[:=]\s*[^\s,;]+',r'\1=[REDACTED]',s)
 return s[:1000]
lines=["===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D5 COMPANY11 LIVE API PILOT V2 =====",
"MODE=READ_ONLY_LIVE","DATABASE_WRITES=NO","SOURCE_WRITES=NO","LEGACY_BUSINESS_ID=11"]
try:
 settings=read_settings(); base=str(settings["base_url"]).rstrip("/")
 timeout=float(settings.get("timeout_seconds") or 30)
 creds=load_background_credentials()
 cid=creds.get("MHAM_LEGACY_CLIENT_ID",""); sec=creds.get("MHAM_LEGACY_CLIENT_SECRET","")
 usr=creds.get("MHAM_LEGACY_USERNAME",""); pwd=creds.get("MHAM_LEGACY_PASSWORD","")
 if not (cid and usr and pwd): raise RuntimeError("stored Mham credentials incomplete")

 # Authenticate directly; no dependency on deleted backups/v13 importer.
 token=None; auth_errors=[]
 auth_candidates=[
   ("/oauth/token",{"grant_type":"password","client_id":cid,"client_secret":sec,"username":usr,"password":pwd}),
   ("/oauth/token",{"grant_type":"password","client_id":cid,"username":usr,"password":pwd}),
 ]
 for path,data in auth_candidates:
  try:
   req=urllib.request.Request(base+path,data=urllib.parse.urlencode(data).encode(),headers={"Accept":"application/json"},method="POST")
   with urllib.request.urlopen(req,timeout=timeout) as r: a=json.loads(r.read().decode("utf-8-sig","replace"))
   token=a.get("access_token")
   if token: break
  except Exception as e: auth_errors.append(safe(e))
 if not token: raise RuntimeError("authentication failed: "+" | ".join(auth_errors))
 lines.append("AUTH=PASS")
 headers={"Authorization":"Bearer "+token,"Accept":"application/json"}

 def get(path,params=None):
  url=base+path
  if params:url+="?"+urllib.parse.urlencode(params)
  req=urllib.request.Request(url,headers=headers,method="GET")
  with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode("utf-8-sig","replace"))

 payloads=[]
 candidates=[
  ("/connector/api/primey-migration/companies/11/branches",None,"migration_branches"),
  ("/connector/api/business-location",{"business_id":"11"},"business_location"),
  ("/connector/api/business-details",{"business_id":"11"},"business_details"),
 ]
 for path,params,label in candidates:
  try:
   d=get(path,params);payloads.append((label,d));lines.append(label.upper()+"=PASS")
  except Exception as e:lines.append(label.upper()+"=UNAVAILABLE|"+safe(e))

 keys=("tax_number","tax_number_1","tax_number_2","commercial_registration","commercial_register",
       "registration_number","custom_field1","custom_field2","custom_field3","custom_field4",
       "invoice_layout_id","sale_invoice_layout_id")
 found=[]
 def walk(x,path="$"):
  if isinstance(x,dict):
   hit={k:x.get(k) for k in keys if k in x and x.get(k) not in (None,"")}
   if hit:found.append({"path":path,"id":x.get("id"),"name":x.get("name"),"values":hit})
   for k,v in x.items():walk(v,path+"."+str(k))
  elif isinstance(x,list):
   for i,v in enumerate(x):walk(v,path+f"[{i}]")
 for label,d in payloads:walk(d,label)
 lines.append("LEGAL_CANDIDATES_BEGIN")
 lines += [json.dumps(x,ensure_ascii=False,default=str) for x in found]
 lines.append("LEGAL_CANDIDATES_END")
 lines.append("LEGAL_CANDIDATE_COUNT="+str(len(found)))
 lines.append("NETWORK_CALLS=YES_READ_ONLY");lines.append("MUTATION_PERFORMED=NO");lines.append("RESULT=PASS")
except Exception as e:
 lines+=["ERROR="+safe(e),"MUTATION_PERFORMED=NO","RESULT=FAIL"]
OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
print(lines[0]);print("REPORT="+OUT.name);print("SIZE="+str(OUT.stat().st_size))
print("SHA256="+hashlib.sha256(OUT.read_bytes()).hexdigest().upper())
for x in lines:
 if x.startswith(("AUTH=","MIGRATION_BRANCHES=","BUSINESS_LOCATION=","BUSINESS_DETAILS=","LEGAL_CANDIDATE_COUNT=","NETWORK_CALLS=","MUTATION_PERFORMED=","RESULT=","ERROR=")):print(x)
