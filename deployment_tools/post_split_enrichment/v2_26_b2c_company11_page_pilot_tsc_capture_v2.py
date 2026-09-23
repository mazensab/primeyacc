from pathlib import Path
import subprocess,hashlib,sys
R=Path.cwd();OUT=R/"v2_26_b2c_company11_page_pilot_tsc_capture_v2.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";DETAIL=R/"api/system/companies/detail.py"
PS="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770";DS="B8675DAB805AD59BAC8B676010E0FAAA00AC077A12576F2B8A1C54D2E2C0AAC3"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
if sha(PAGE)!=PS or sha(DETAIL)!=DS:sys.exit("SAFETY STOP: rollback baseline not restored")
tsc=R/"primey_frontend_v2/node_modules/.bin/tsc.cmd"
q=subprocess.run([str(tsc),"--noEmit"],cwd=R/"primey_frontend_v2",text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=300)
OUT.write_text("===== TSC EXACT CAPTURE =====\n"+q.stdout+f"\nEXIT={q.returncode}\nMUTATION_PERFORMED=NO\n",encoding="utf8")
print("===== PRIMEYACC B2C COMPANY11 TSC CAPTURE V2 =====")
print(f"REPORT={OUT.name}");print(f"EXIT={q.returncode}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO")
