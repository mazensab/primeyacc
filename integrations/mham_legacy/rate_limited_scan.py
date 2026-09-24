from __future__ import annotations
import json,random,time
from pathlib import Path
class ScanRateLimitError(RuntimeError): pass
def load_cp(p):
 if not p.exists(): return {"version":1,"completed":{},"failures":{}}
 x=json.loads(p.read_text(encoding="utf-8")); x.setdefault("completed",{});x.setdefault("failures",{});return x
def save_cp(p,x):
 p.parent.mkdir(parents=True,exist_ok=True);q=p.with_suffix(p.suffix+".tmp");q.write_text(json.dumps(x,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");q.replace(p)
def scan_subscriptions(adapter,companies,checkpoint_path,*,sleep_fn=time.sleep,base_delay=.35,max_retries=7,max_backoff=60,jitter=.25,progress_fn=None):
 rows=list(companies);state=load_cp(checkpoint_path)
 for i,row in enumerate(rows,1):
  bid=str(row.get("id") or row.get("business_id") or "").strip()
  if not bid: raise ValueError("Company row missing stable identity.")
  if bid in state["completed"]:
   if progress_fn: progress_fn(f"RESUME_SKIP={bid}")
   continue
  attempt=0
  while True:
   try:
    subs=[]
    for s in adapter.subscriptions(bid,limit=1000):
     z=dict(s);z.setdefault("business_id",bid);subs.append(z)
    state["completed"][bid]=subs;state["failures"].pop(bid,None);save_cp(checkpoint_path,state)
    if progress_fn:progress_fn(f"COMPLETE={i}/{len(rows)} BUSINESS_ID={bid}")
    if base_delay:sleep_fn(base_delay)
    break
   except Exception as e:
    if "429" not in str(e):
     state["failures"][bid]=f"{type(e).__name__}: {e}"[:500];save_cp(checkpoint_path,state);raise
    attempt+=1
    if attempt>max_retries:
     state["failures"][bid]=f"HTTP_429_RETRIES_EXHAUSTED attempts={attempt-1}";save_cp(checkpoint_path,state);raise ScanRateLimitError(bid) from e
    wait=min(max_backoff,base_delay*(2**attempt))+(random.uniform(0,jitter) if jitter else 0)
    if progress_fn:progress_fn(f"RATE_LIMIT BUSINESS_ID={bid} ATTEMPT={attempt} WAIT={wait:.2f}")
    sleep_fn(wait)
 subs=[]
 for bid in state["completed"]:subs.extend(state["completed"][bid])
 return {"companies":rows,"subscriptions":subs,"completed_ids":set(state["completed"]),"failures":state["failures"]}
