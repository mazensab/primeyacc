from pathlib import Path
import os,json,hashlib,re
R=Path.cwd(); OUT=R/"v2_26_b2c_legal_identity_d5_company11_live_api_pilot_v3.txt"
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django; django.setup()
from integrations.mham_legacy.sync_engine import load_background_credentials
from integrations.mham_legacy.management import read_settings
from integrations.mham_legacy.client import MhamLegacyClient
def safe(v):
 s=str(v or "")
 return re.sub(r'(?i)(bearer|token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+',r'\1=[REDACTED]',s)[:1200]
lines=["===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D5 COMPANY11 LIVE API PILOT V3 =====",
"MODE=READ_ONLY_LIVE","DATABASE_WRITES=NO","SOURCE_WRITES=NO","LEGACY_BUSINESS_ID=11"]
try:
 settings=read_settings()
 os.environ["MHAM_LEGACY_API_BASE_URL"]=str(settings["base_url"]).rstrip("/")
 os.environ["MHAM_LEGACY_API_TIMEOUT"]=str(settings.get("timeout_seconds") or 30)
 creds=load_background_credentials()
 # Primey's frozen connector contract authenticates with the stored API token, not /oauth/token.
 token=str(creds.get("MHAM_LEGACY_API_TOKEN") or os.environ.get("MHAM_LEGACY_API_TOKEN") or "").strip()
 if not token:
  # Do not invent an auth endpoint. Report the actual contract state.
  raise RuntimeError("MHAM_LEGACY_API_TOKEN is not present in stored credentials/environment")
 os.environ["MHAM_LEGACY_API_TOKEN"]=token
 client=MhamLegacyClient.from_environment()
 lines.append("CLIENT_CONFIG="+json.dumps(client.safe_configuration(),ensure_ascii=False))
 payloads=[]
 calls=[
  ("business_details","connector/api/business-details",{"business_id":"11"}),
  ("business_locations","connector/api/business-location",{"business_id":"11"}),
  ("migration_subscriptions","connector/api/primey-migration/companies/11/subscriptions",{"after_id":0}),
 ]
 for label,path,params in calls:
  try:
   resp=client.get(path,params=params)
   data=resp.data
   payloads.append((label,data))
   lines.append(label.upper()+f"=PASS|STATUS={resp.status_code}")
  except Exception as e: lines.append(label.upper()+"=UNAVAILABLE|"+safe(e))
 keys=("tax_number","tax_number_1","tax_number_2","commercial_registration","commercial_register",
       "registration_number","custom_field1","custom_field2","custom_field3","custom_field4",
       "invoice_layout_id","sale_invoice_layout_id")
 found=[]
 def walk(x,path="$"):
  if isinstance(x,dict):
   hit={k:x.get(k) for k in keys if k in x and x.get(k) not in (None,"")}
   if hit: found.append({"path":path,"id":x.get("id"),"name":x.get("name"),"values":hit})
   for k,v in x.items():walk(v,path+"."+str(k))
  elif isinstance(x,list):
   for i,v in enumerate(x):walk(v,path+f"[{i}]")
 for label,data in payloads:walk(data,label)
 lines.append("LEGAL_CANDIDATES_BEGIN")
 lines += [json.dumps(x,ensure_ascii=False,default=str) for x in found]
 lines.append("LEGAL_CANDIDATES_END")
 lines.append("LEGAL_CANDIDATE_COUNT="+str(len(found)))
 lines+=["NETWORK_CALLS=YES_READ_ONLY","MUTATION_PERFORMED=NO","RESULT=PASS"]
except Exception as e:
 lines+=["ERROR="+safe(e),"MUTATION_PERFORMED=NO","RESULT=FAIL"]
OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
print(lines[0]);print("REPORT="+OUT.name);print("SIZE="+str(OUT.stat().st_size))
print("SHA256="+hashlib.sha256(OUT.read_bytes()).hexdigest().upper())
for x in lines:
 if x.startswith(("CLIENT_CONFIG=","BUSINESS_DETAILS=","BUSINESS_LOCATIONS=","MIGRATION_SUBSCRIPTIONS=","LEGAL_CANDIDATE_COUNT=","NETWORK_CALLS=","MUTATION_PERFORMED=","RESULT=","ERROR=")):print(x)
