from pathlib import Path
import json, hashlib, collections

ROOT=Path.cwd()
CACHE=ROOT/"_audit/phase49j_general_apply/source_cache"
OUT=ROOT/"v2_26_b2c_legal_identity_d3_deep_source_paths_discovery_v1.txt"

TARGETS={
  478:[578,579,580,581,582,583,584,585,717,718],
  88:[106,752,107,751,108,753,735,739],
  195:[227,228,229,230,231,232,416],
  556:[676,677,678,706,778,779,781],
  174:[197,207,208,209,210],
  290:[353,354,355,356,357],
  299:[367,368,369],
  76:[92],
}
LEGAL=("tax","vat","commercial","register","registration","cr_number","crnumber")
LAYOUT=("invoice_layout","invoice_layouts","layout")
def s(v): return "" if v is None else str(v).strip()
def walk(v,path="$"):
    if isinstance(v,dict):
        for k,x in v.items():
            np=f"{path}.{k}"
            yield np,k,x
            yield from walk(x,np)
    elif isinstance(v,list):
        for i,x in enumerate(v):
            yield from walk(x,f"{path}[{i}]")

lines=[
"===== PRIMEYACC V2-26 B2C LEGAL IDENTITY D3 DEEP SOURCE PATHS DISCOVERY V1 =====",
f"CACHE={CACHE}","MODE=READ_ONLY","DATABASE_WRITES=NO","SOURCE_WRITES=NO",
]
summary=collections.Counter()
for legacy_company, branch_ids in TARGETS.items():
    fp=CACHE/f"company_{legacy_company}.json"
    lines.append(f"\n===== LEGACY_COMPANY={legacy_company} FILE={fp.name} =====")
    if not fp.exists():
        lines.append("CACHE_MISSING=YES"); summary["cache_missing"]+=1; continue
    try:
        root=json.loads(fp.read_text(encoding="utf-8-sig"))
    except Exception as e:
        lines.append(f"JSON_ERROR={e!r}"); summary["json_error"]+=1; continue
    payload=root.get("payload",root)
    branches=payload.get("branches") or payload.get("business_locations") or []
    company=payload.get("company") or payload.get("business") or {}
    lines.append("COMPANY="+json.dumps(company,ensure_ascii=False,default=str,sort_keys=True))
    for bid in branch_ids:
        br=next((x for x in branches if isinstance(x,dict) and s(x.get("id"))==str(bid)),None)
        lines.append(f"\n--- BRANCH={bid} ---")
        if not br:
            lines.append("BRANCH_NOT_FOUND=YES"); summary["branch_missing"]+=1; continue
        lines.append("BRANCH="+json.dumps(br,ensure_ascii=False,default=str,sort_keys=True))
        loc=s(br.get("location_id"))
        # Search entire cached payload for objects explicitly tied to this branch id/location code
        candidates=[]
        for path,k,x in walk(payload):
            if not isinstance(x,dict): continue
            vals={s(x.get(z)) for z in ("branch_id","location_id","business_location_id","id")}
            tied=(str(bid) in vals) or (loc and loc in vals)
            if not tied: continue
            legal={kk:vv for kk,vv in x.items()
                   if not isinstance(vv,(dict,list)) and any(t in str(kk).lower() for t in LEGAL)}
            layout={kk:vv for kk,vv in x.items()
                    if not isinstance(vv,(dict,list)) and any(t in str(kk).lower() for t in LAYOUT)}
            if legal or layout:
                candidates.append((path,legal,layout,x))
        lines.append(f"TIED_LEGAL_LAYOUT_OBJECTS={len(candidates)}")
        for path,legal,layout,obj in candidates[:50]:
            lines.append("PATH="+path)
            lines.append("LEGAL="+json.dumps(legal,ensure_ascii=False,default=str,sort_keys=True))
            lines.append("LAYOUT="+json.dumps(layout,ensure_ascii=False,default=str,sort_keys=True))
            # compact contextual identity only
            ctx={k:obj.get(k) for k in ("id","business_id","branch_id","location_id","business_location_id","name","invoice_layout_id") if k in obj}
            lines.append("CONTEXT="+json.dumps(ctx,ensure_ascii=False,default=str,sort_keys=True))
        summary["branches"]+=1
        summary["candidate_objects"]+=len(candidates)

    # Inventory all top-level collections that may contain legal identity data
    lines.append("\nTOP_LEVEL_COLLECTIONS_BEGIN")
    for k,v in payload.items():
        if isinstance(v,list):
            legal_hits=0; layout_hits=0
            for x in v[:]:
                if isinstance(x,dict):
                    keys=[str(q).lower() for q in x]
                    legal_hits += int(any(any(t in q for t in LEGAL) for q in keys))
                    layout_hits += int(any(any(t in q for t in LAYOUT) for q in keys))
            if legal_hits or layout_hits:
                lines.append(f"{k}: count={len(v)} legal_key_rows={legal_hits} layout_key_rows={layout_hits}")
    lines.append("TOP_LEVEL_COLLECTIONS_END")

lines += ["", "SUMMARY="+json.dumps(dict(summary),ensure_ascii=False,sort_keys=True),
          "MUTATION_PERFORMED=NO","RESULT=PASS"]
OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
h=hashlib.sha256(OUT.read_bytes()).hexdigest().upper()
print(lines[0]); print(f"REPORT={OUT.name}"); print(f"SIZE={OUT.stat().st_size}")
print(f"SHA256={h}"); print(f"BRANCHES_SCANNED={summary['branches']}")
print(f"TIED_CANDIDATE_OBJECTS={summary['candidate_objects']}")
print("MUTATION_PERFORMED=NO"); print("RESULT=PASS")
