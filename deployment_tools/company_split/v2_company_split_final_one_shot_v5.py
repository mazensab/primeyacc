#!/usr/bin/env python3
from __future__ import annotations
import argparse, copy, hashlib, json, os, re, subprocess, sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT=Path.cwd()
M2=ROOT/'v2_company_split_transformation_manifest_v2.json'
A9=ROOT/'v2_company_split_a9_worktree_guard.txt'
A10R=ROOT/'v2_company_split_a10_execution_preflight_v5.txt'
PLANF=ROOT/'v2_company_split_local_execution_plan_v5.json'
A10ER=ROOT/'v2_company_split_a10e_opening_balance_provenance_correction.txt'
A10EP=ROOT/'v2_company_split_a10e_opening_balance_policy_v2.json'
A6C=ROOT/'v2_company_split_a6c_customer_payment_semantics.txt'
A6D=ROOT/'v2_company_split_a6d_exact_12_payment_closure.txt'
A6E=ROOT/'v2_company_split_a6e_final_4_payment_closure.txt'
M3=ROOT/'v2_company_split_transformation_manifest_v3.json'
REPORT=ROOT/'v2_company_split_final_one_shot_v5.txt'
SNAP=ROOT/'v2_company_split_final_apply_snapshot_v5.json'
SRC='mhamcloud_v1'
SHAS={
 'm2':'B12A3C2916272B6A4D5E8051D7B51533E3FF05369084632685F0BCC809BE24DE',
 'a9':'4CF7A4A0E3E94FF4E16E604C9C1EC2861F5D6033AC4E27A26C4C0945AB168199',
 'a10r':'68C4E393767305CB1C573ECEBD393A795DF14D1541E922BCDBF9A76898680D18',
 'plan':'ED52E632045354DDF1E80ADDD918D11E8AAC04026BF5D69C752D4B31B4BAB7A1',
 'a10er':'569FD82089BEE49546A03C3173D34A27AD85972CA82059F776D5FFEDC83AEEB5',
 'a10ep':'213CFD76829D398551C949AE2B51EFD9BFE542DC1BC088B8AC4E09FCEB24B00F',
 'a6c':'8CF446BBD07411EE100200F24A6214DCD1FC0C560304B218CB54BAE46F14BA02',
 'a6d':'8FF94113ECA773F1B358BC6F6BEB9AE647E785FF5AA8B70742ED49B747911300',
 'a6e':'97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332'}
HEAD='f6267f27e5313b0e01c317db8c1eaa13b8ac5d02'; STASH='d12fb09d7630750ce911c75875c956a4cdb724c3'
LOCK=0x726174696D657961

def c(v): return '' if v is None else str(v).replace('\r',' ').replace('\n',' ').strip()

def nkey(v):
    s=c(v)
    return (0,int(s)) if s.isdigit() else (1,s.casefold())

def progress(msg):
    print(msg, flush=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def req(p,h,n):
    if not p.exists(): raise RuntimeError(f'Missing {n}: {p.name}')
    if sha(p)!=h: raise RuntimeError(f'{n} SHA mismatch expected={h} actual={sha(p)}')
def git(*a,check=True):
    cp=subprocess.run(['git',*a],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
    if check and cp.returncode: raise RuntimeError(f"git {' '.join(a)} failed: {c(cp.stderr or cp.stdout)}")
    return cp.stdout.strip()
def settings():
    if os.environ.get('DJANGO_SETTINGS_MODULE'): return os.environ['DJANGO_SETTINGS_MODULE']
    raw=(ROOT/'manage.py').read_text(encoding='utf-8',errors='replace')
    m=re.search(r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",raw)
    if not m: raise RuntimeError('Could not detect DJANGO_SETTINGS_MODULE')
    return m.group(1)
def mlabel(m): return f'{m._meta.app_label}.{m.__name__}'
def fks(m):
    out=[]
    for f in m._meta.get_fields():
        if getattr(f,'concrete',False) and (getattr(f,'many_to_one',False) or getattr(f,'one_to_one',False)):
            t=getattr(getattr(f,'remote_field',None),'model',None)
            if t is not None: out.append((f,t))
    return out
def rels(m,t): return [f for f,x in fks(m) if x is t]
def vals(obj):
    d={}
    for f in obj._meta.concrete_fields:
        if f.primary_key or getattr(f,'auto_created',False): continue
        k=f.attname if getattr(f,'is_relation',False) else f.name; d[k]=getattr(obj,k)
    return d
class Neg:
    def __init__(self): self.d=defaultdict(lambda:-1)
    def get(self,m): x=self.d[m]; self.d[m]-=1; return x
def clone(obj,over,rehearsal,neg):
    d=vals(obj); d.update(over)
    if rehearsal: d[obj._meta.pk.attname]=neg.get(obj.__class__)
    x=obj.__class__(**d); x.save(force_insert=True); return x
def new(m,d,rehearsal,neg):
    d=dict(d)
    if rehearsal: d[m._meta.pk.attname]=neg.get(m)
    x=m(**d); x.save(force_insert=True); return x
def args():
    p=argparse.ArgumentParser(); p.add_argument('--apply-after-rehearsal',action='store_true'); p.add_argument('--restore-v2-26c',action='store_true'); return p.parse_args()
def static_checks():
    for cmd in ([sys.executable,'manage.py','check'],[sys.executable,'manage.py','makemigrations','--check','--dry-run']):
        cp=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
        if cp.returncode: raise RuntimeError(c(cp.stdout+cp.stderr))
def build_m3(m2,pol,special_routes):
    m=copy.deepcopy(m2); m['schema']='primeyacc.company_split_transformation_manifest.v3'
    m['manifest_lineage']=dict(
        m.get('manifest_lineage') or {},
        base_manifest_v2_sha256=SHAS['m2'],
        a10e_report_sha256=SHAS['a10er'],
        a10e_opening_balance_policy_sha256=SHAS['a10ep'],
        special_customer_payment_route_count=len(special_routes),
        special_customer_payment_route_identity='mhamcloud_v1.transaction_payments:(LEGACY_COMPANY_ID,LEGACY_PAYMENT_ID)',
    )
    m['business_party_financial_policy']={
        k:v for k,v in pol.items()
        if k not in {
            'current_business_party_id_snapshot',
            'supersedes_a10d_policy_sha256',
            'manifest_v2_sha256',
            'schema',
        }
    }
    cp=dict(m.get('customer_payment_contract') or {})
    cp['special_legacy_payment_routes']=special_routes
    cp['special_legacy_payment_route_count']=len(special_routes)
    cp['special_legacy_payment_route_identity']='mhamcloud_v1.transaction_payments:(LEGACY_COMPANY_ID,LEGACY_PAYMENT_ID)'
    cp['special_legacy_payment_route_current_ids']='NOT_STORED_IN_AUTHORITATIVE_MANIFEST'
    m['customer_payment_contract']=cp
    return m

def parse_special_routes():
    r={}
    t=A6C.read_text(encoding='utf-8',errors='replace')
    for m in re.finditer(r"PAYMENT current_id=(\d+).*?route=([0-9]+-G[0-9]+) \| candidates=\[.*?'branch_id': (\d+)",t): r[int(m.group(1))]=(m.group(2),int(m.group(3)))
    t=A6D.read_text(encoding='utf-8',errors='replace'); b=re.search(r'FINAL_12_PAYMENT_ROUTE_MAP_BEGIN(.*?)FINAL_12_PAYMENT_ROUTE_MAP_END',t,re.S)
    if b:
        for m in re.finditer(r'customer_payment=(\d+)\|legacy_branch=\d+\|current_branch=(\d+)\|target_group=([^|]+)\|',b.group(1)): r[int(m.group(1))]=(m.group(3),int(m.group(2)))
    t=A6E.read_text(encoding='utf-8',errors='replace')
    for m in re.finditer(r'ROUTED\|legacy_company=\d+\|customer_payment=(\d+)\|legacy_branch=\d+\|current_branch=(\d+)\|target_group=([^|]+)\|',t): r[int(m.group(1))]=(m.group(3),int(m.group(2)))
    for m in re.finditer(r'PRESERVE_ORPHAN\|legacy_company=\d+\|customer_payment=(\d+).*?\|target_group=([^|]+)\|branch=NULL',t): r[int(m.group(1))]=(m.group(2),None)
    if len(r)!=412: raise RuntimeError(f'special route count {len(r)} != 412')
    return r
def load_models():
    os.environ['DJANGO_SETTINGS_MODULE']=settings(); import django; django.setup()
    from django.apps import apps
    from django.contrib.auth import get_user_model
    from django.contrib.contenttypes.models import ContentType
    from django.db import connection, transaction
    from accounts.models import CompanyMembership,CompanyMembershipBranchGrant,CompanyMembershipBranchPolicy,UserProfile
    from business_controls.models import LegacyObjectMap
    from companies.models import Branch,Company
    from subscriptions.models import CompanySubscription
    from treasury.models import CustomerPayment,SupplierPayment,TreasuryAccount,TreasuryTransaction
    d={'apps':apps,'connection':connection,'transaction':transaction,'ContentType':ContentType,'User':get_user_model(),'CompanyMembership':CompanyMembership,'CompanyMembershipBranchGrant':CompanyMembershipBranchGrant,'CompanyMembershipBranchPolicy':CompanyMembershipBranchPolicy,'UserProfile':UserProfile,'LegacyObjectMap':LegacyObjectMap,'Branch':Branch,'Company':Company,'CompanySubscription':CompanySubscription,'CustomerPayment':CustomerPayment,'SupplierPayment':SupplierPayment,'TreasuryAccount':TreasuryAccount,'TreasuryTransaction':TreasuryTransaction}
    for a,n in [('accounting','Account'),('accounting','TaxRate'),('accounting','AccountingRoutingRule'),('accounting','AccountingSettings'),('companies','CompanySettings'),('catalog','CatalogCategory'),('catalog','CatalogUnit'),('catalog','CatalogItem'),('parties','BusinessParty'),('inventory','Warehouse'),('inventory','InventoryLocation'),('inventory','StockItem'),('inventory','StockMovement'),('purchases','PurchaseBill'),('purchases','PurchaseBillItem'),('sales','SalesInvoice'),('sales','SalesInvoiceItem'),('sales','SalesReturn')]: d[n]=apps.get_model(a,n)
    try:d['SalesReturnItem']=apps.get_model('sales','SalesReturnItem')
    except LookupError:d['SalesReturnItem']=None
    if connection.vendor!='postgresql': raise RuntimeError(f'Expected PostgreSQL, got {connection.vendor}')
    return d

def context(M,manifest,plan):
    Company,Branch,LOM=M['Company'],M['Branch'],M['LegacyObjectMap']
    company_ids={}; entries=manifest['companies']
    for e in entries:
        l=c(e['legacy_company_id']); q=list(LOM.objects.filter(source_system=SRC,source_table='business',legacy_id=l))
        if len(q)!=1: raise RuntimeError(f'company map {l} count={len(q)}')
        raw=c(q[0].target_object_id) or c(q[0].company_id)
        if not raw.isdigit(): raise RuntimeError(f'company {l} unresolved')
        company_ids[l]=int(raw)
    branch_by_pair={}; pair_by_branch={}
    for x in LOM.objects.filter(source_system=SRC,source_table='business_locations',legacy_company_id__in=list(company_ids)):
        raw=c(x.target_object_id)
        if raw.isdigit(): branch_by_pair[(c(x.legacy_company_id),c(x.legacy_id))]=int(raw); pair_by_branch[int(raw)]=(c(x.legacy_company_id),c(x.legacy_id))
    group_by_branch={}; src_group={}; fullc=set(); fullb=set(); partb=set(); meta={}
    for e in entries:
        l=c(e['legacy_company_id']); expected=set(e['expected_source_branch_ids']); actual={b for (lc,b),_ in branch_by_pair.items() if lc==l}
        if expected!=actual: raise RuntimeError(f'branch delta company={l}')
        if e['mode']=='SPLIT':
            src_group[l]=e['retained_source_group']
            for g in e['output_groups']:
                bids=[branch_by_pair[(l,b)] for b in g['legacy_branch_ids']]
                for bid in bids: group_by_branch[bid]=g['group_id']
                meta[g['group_id']]={'lcid':l,'source':company_ids[l],'survivor':bool(g['source_company_survivor']),'bids':bids,'anchor':branch_by_pair[(l,g['anchor_branch_legacy_id'])],'default':branch_by_pair[(l,g['default_branch_legacy_id'])],'code':c(g.get('company_code'))}
        elif e['mode']=='PARTIAL_INCLUDE':
            src_group[l]='SOURCE_COMPANY_SURVIVES'
            keep=[branch_by_pair[(l,b)] for b in e['keep_legacy_branch_ids']]
            for bid in keep: group_by_branch[bid]='SOURCE_COMPANY_SURVIVES'
            for b in e['exclude_legacy_branch_ids']: partb.add(branch_by_pair[(l,b)])
            meta[f'{l}:SOURCE_COMPANY_SURVIVES']={'lcid':l,'source':company_ids[l],'survivor':True,'bids':keep,'anchor':keep[0],'default':branch_by_pair[(l,e['default_branch_after_transform'])],'code':c(Company.objects.get(pk=company_ids[l]).company_code)}
        else:
            fullc.add(company_ids[l]); fullb.update(branch_by_pair[(l,b)] for b in e['legacy_branch_ids'])
    return {'entries':entries,'company_ids':company_ids,'branch_by_pair':branch_by_pair,'pair_by_branch':pair_by_branch,'group_by_branch':group_by_branch,'src_group':src_group,'fullc':fullc,'fullb':fullb,'partb':partb,'meta':meta,'special':parse_special_routes()}

def a6c_payment_identity_map():
    text=A6C.read_text(encoding='utf-8',errors='replace')
    out={}
    for m in re.finditer(
        r'PAYMENT current_id=(\d+) \| legacy_id=(\d+) \| payment_number=LEGACY-CP-(\d+)',
        text
    ):
        current_id=int(m.group(1))
        legacy_id=c(m.group(2))
        legacy_from_number=c(m.group(3))
        if legacy_id!=legacy_from_number:
            raise RuntimeError(
                f'A6C payment identity mismatch current={current_id} '
                f'legacy_id={legacy_id} payment_number_legacy={legacy_from_number}'
            )
        prior=out.get(current_id)
        if prior and prior!=legacy_id:
            raise RuntimeError(
                f'A6C duplicate current payment identity current={current_id} '
                f'legacy_ids={prior}/{legacy_id}'
            )
        out[current_id]=legacy_id
    if len(out)!=412:
        raise RuntimeError(f'A6C identity map count {len(out)} != 412')
    return out

def stable_special_routes(M,C):
    CP,LOM,CT=M['CustomerPayment'],M['LegacyObjectMap'],M['ContentType']
    ct=CT.objects.get_for_model(CP)
    rev_company={v:k for k,v in C['company_ids'].items()}
    a6c_ids=a6c_payment_identity_map()
    rows=[]
    seen=set()

    if set(a6c_ids)!=set(C['special']):
        missing=sorted(set(C['special'])-set(a6c_ids))
        extra=sorted(set(a6c_ids)-set(C['special']))
        raise RuntimeError(
            f'A6C identity/route current-id set mismatch missing={missing[:20]} extra={extra[:20]}'
        )

    for current_payment_id,(target_group,current_branch_id) in sorted(C['special'].items()):
        p=CP.objects.filter(pk=current_payment_id).only('id','company_id').first()
        if p is None:
            raise RuntimeError(
                f'special CustomerPayment row missing current_id={current_payment_id}'
            )
        lcid=rev_company.get(int(p.company_id))
        if not lcid:
            raise RuntimeError(
                f'special CustomerPayment company not in frozen scope '
                f'payment={current_payment_id} company={p.company_id}'
            )

        legacy_payment_id=a6c_ids[current_payment_id]

        # Independent DB identity verification against the actual legacy source table.
        maps=list(
            LOM.objects.filter(
                source_system=SRC,
                legacy_company_id=lcid,
                source_table='transaction_payments',
                legacy_id=legacy_payment_id,
                target_content_type=ct,
                target_object_id=str(current_payment_id),
            )
        )
        if len(maps)!=1:
            raise RuntimeError(
                f'special payment legacy identity verification failed '
                f'company={lcid} current_payment={current_payment_id} '
                f'legacy_payment={legacy_payment_id} '
                f'source_table=transaction_payments maps={len(maps)}'
            )

        key=(lcid,legacy_payment_id)
        if key in seen:
            raise RuntimeError(
                f'duplicate stable special payment identity {lcid}/{legacy_payment_id}'
            )
        seen.add(key)

        if current_branch_id is None:
            branch_policy='KEEP_NULL'
            legacy_branch_id=None
        else:
            pair=C['pair_by_branch'].get(int(current_branch_id))
            if pair is None:
                raise RuntimeError(
                    f'special payment branch has no legacy identity '
                    f'payment={current_payment_id} branch={current_branch_id}'
                )
            branch_company,legacy_branch_id=pair
            if branch_company!=lcid:
                raise RuntimeError(
                    f'special payment branch company mismatch '
                    f'payment={current_payment_id} payment_company={lcid} '
                    f'branch_company={branch_company}'
                )
            branch_policy='ROUTE_TO_LEGACY_BRANCH'

        rows.append({
            'source_system':SRC,
            'source_table':'transaction_payments',
            'legacy_company_id':lcid,
            'legacy_payment_id':legacy_payment_id,
            'target_group':c(target_group),
            'legacy_branch_id':legacy_branch_id,
            'branch_policy':branch_policy,
        })

    if len(rows)!=412:
        raise RuntimeError(f'stable special route count {len(rows)} != 412')
    return sorted(
        rows,
        key=lambda r:(nkey(r['legacy_company_id']),nkey(r['legacy_payment_id']))
    )

def party_by_legacy(M,lcid,lcontact):
    BP,LOM,CT=M['BusinessParty'],M['LegacyObjectMap'],M['ContentType']; ct=CT.objects.get_for_model(BP)
    q=list(LOM.objects.filter(source_system=SRC,legacy_company_id=lcid,source_table='contacts',legacy_id=lcontact,target_content_type=ct))
    if len(q)!=1: raise RuntimeError(f'party map {lcid}/{lcontact} count={len(q)}')
    return BP.objects.get(pk=int(c(q[0].target_object_id)))

def usage_groups(M,C,manifest):
    cg=defaultdict(set); pg=defaultdict(set); ids=set(C['company_ids'].values()); rev={v:k for k,v in C['company_ids'].items()}
    for mn,mf,bp in [('SalesInvoiceItem','catalog_item_id','invoice__branch_id'),('PurchaseBillItem','item_id','bill__branch_id'),('StockItem','item_id','warehouse__branch_id'),('StockMovement','item_id','warehouse__branch_id')]:
        q=M[mn].objects.filter(company_id__in=ids,**{mf+'__isnull':False}).order_by().values('company_id',mf,bp).distinct()
        for row in q.iterator(chunk_size=10000):
            bid=row[bp]
            if bid is None or int(bid) in C['fullb'] or int(bid) in C['partb']: continue
            gid=C['group_by_branch'].get(int(bid))
            if gid: cg[(rev[int(row['company_id'])],int(row[mf]))].add(gid)
    for mn,mf,bp in [('SalesInvoice','customer_id','branch_id'),('SalesReturn','customer_id','branch_id'),('PurchaseBill','supplier_id','branch_id')]:
        q=M[mn].objects.filter(company_id__in=ids,**{mf+'__isnull':False}).order_by().values('company_id',mf,bp).distinct()
        for row in q.iterator(chunk_size=10000):
            bid=row[bp]
            if bid is None or int(bid) in C['fullb'] or int(bid) in C['partb']: continue
            gid=C['group_by_branch'].get(int(bid))
            if gid: pg[(rev[int(row['company_id'])],int(row[mf]))].add(gid)
    for row in manifest['customer_payment_contract']['business_party_coverage_contract']['rows']:
        p=party_by_legacy(M,c(row['legacy_company_id']),c(row['legacy_contact_id'])); pg[(c(row['legacy_company_id']),int(p.id))].update(row['payment_usage_coverage_groups'])
    total=sum(sum(1 for g in gs if g!=C['src_group'].get(l)) for (l,_),gs in cg.items())+sum(sum(1 for g in gs if g!=C['src_group'].get(l)) for (l,_),gs in pg.items())
    if total!=43891: raise RuntimeError(f'usage clone drift {total}')
    return cg,pg

def baseline(M,C):
    L=M['LegacyObjectMap']; return {'companies':M['Company'].objects.count(),'branches':M['Branch'].objects.count(),'maps':L.objects.count(),'memberships':M['CompanyMembership'].objects.count(),'subs':M['CompanySubscription'].objects.count(),'payments':M['CustomerPayment'].objects.count(),'mapped_companies':L.objects.filter(source_system=SRC,source_table='business').count(),'mapped_branches':L.objects.filter(source_system=SRC,source_table='business_locations').count(),'opening':str(party_by_legacy(M,'88','122844').opening_balance),'company_names':{l:c(M['Company'].objects.get(pk=cid).name) for l,cid in sorted(C['company_ids'].items())}}

def make_targets(M,C,manifest,rehearsal,neg):
    Company,Branch=M['Company'],M['Branch']; targets={}; count=0
    for e in manifest['companies']:
        if e['mode']!='SPLIT': continue
        l=c(e['legacy_company_id']); source=Company.objects.get(pk=C['company_ids'][l])
        for g in e['output_groups']:
            gid=g['group_id']
            if g['source_company_survivor']: targets[gid]=source; continue
            anchor=Branch.objects.get(pk=C['branch_by_pair'][(l,g['anchor_branch_legacy_id'])]); d={}
            for f in Company._meta.concrete_fields:
                if f.primary_key or f.name in {'name','name_ar','name_en','company_code','extra_data','created_at','updated_at'}: continue
                k=f.attname if getattr(f,'is_relation',False) else f.name; d[k]=getattr(source,k)
            d['name']=c(anchor.name); d['name_ar']=c(getattr(anchor,'name_ar','')); d['name_en']=c(getattr(anchor,'name_en','')); d['company_code']=c(g['company_code']); extra=copy.deepcopy(getattr(source,'extra_data',{}) or {}); extra['primey_company_split']={'manifest':'v3','legacy_company_id':l,'group_id':gid,'source_company_survivor':False}; d['extra_data']=extra
            targets[gid]=new(Company,d,rehearsal,neg); count+=1
    if count!=39: raise RuntimeError(f'new companies {count}')
    for e in manifest['companies']:
        l=c(e['legacy_company_id'])
        if e['mode']=='SPLIT': targets[e['retained_source_group']]=Company.objects.get(pk=C['company_ids'][l])
        elif e['mode']=='PARTIAL_INCLUDE': targets['SOURCE_COMPANY_SURVIVES']=Company.objects.get(pk=C['company_ids'][l])
    for e in manifest['companies']:
        if e['mode']!='SPLIT':continue
        l=c(e['legacy_company_id']); gid=e['retained_source_group']; g=next(x for x in e['output_groups'] if x['group_id']==gid); src=targets[gid]; a=Branch.objects.get(pk=C['branch_by_pair'][(l,g['anchor_branch_legacy_id'])]); src.name=c(a.name); src.name_ar=c(getattr(a,'name_ar','')); src.name_en=c(getattr(a,'name_en','')); extra=copy.deepcopy(getattr(src,'extra_data',{}) or {}); extra['primey_company_split']={'manifest':'v3','legacy_company_id':l,'group_id':gid,'source_company_survivor':True}; src.extra_data=extra; src.save(update_fields=['name','name_ar','name_en','extra_data'])
    return targets
def foundation(M,C,T,manifest,rehearsal,neg):
    maps=defaultdict(dict); total=0; splits=[e for e in manifest['companies'] if e['mode']=='SPLIT']
    A,TR,RR,AS,CS,CC,CU,TA=[M[x] for x in ['Account','TaxRate','AccountingRoutingRule','AccountingSettings','CompanySettings','CatalogCategory','CatalogUnit','TreasuryAccount']]
    for e in splits:
        l=c(e['legacy_company_id']); src=C['company_ids'][l]; gids=[g['group_id'] for g in e['output_groups'] if not g['source_company_survivor']]; rows=list(A.objects.filter(company_id=src).order_by('id'))
        for gid in gids:
            for r in rows:
                if Decimal(r.opening_balance)!=0: raise RuntimeError(f'nonzero Account opening_balance {l}/{r.id}')
                x=clone(r,{'company_id':T[gid].id,'parent_id':None},rehearsal,neg); maps['Account'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in rows:
                if r.parent_id:
                    x=maps['Account'][(r.id,gid)]; x.parent_id=maps['Account'][(r.parent_id,gid)].id; x.save(update_fields=['parent'])
    for e in splits:
        l=c(e['legacy_company_id']); src=C['company_ids'][l]; gids=[g['group_id'] for g in e['output_groups'] if not g['source_company_survivor']]; rows=list(CC.objects.filter(company_id=src).order_by('id'))
        for gid in gids:
            for r in rows: x=clone(r,{'company_id':T[gid].id,'parent_id':None},rehearsal,neg); maps['CatalogCategory'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in rows:
                if r.parent_id:
                    x=maps['CatalogCategory'][(r.id,gid)]; x.parent_id=maps['CatalogCategory'][(r.parent_id,gid)].id; x.save(update_fields=['parent'])
    for e in splits:
        l=c(e['legacy_company_id']); src=C['company_ids'][l]; gids=[g['group_id'] for g in e['output_groups'] if not g['source_company_survivor']]
        for gid in gids:
            for r in CU.objects.filter(company_id=src).order_by('id'): x=clone(r,{'company_id':T[gid].id},rehearsal,neg); maps['CatalogUnit'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in TR.objects.filter(company_id=src).order_by('id'):
                o={'company_id':T[gid].id}
                if r.sales_account_id:o['sales_account_id']=maps['Account'][(r.sales_account_id,gid)].id
                if r.purchase_account_id:o['purchase_account_id']=maps['Account'][(r.purchase_account_id,gid)].id
                x=clone(r,o,rehearsal,neg); maps['TaxRate'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in AS.objects.filter(company_id=src).order_by('id'):
                o={'company_id':T[gid].id}
                if r.default_tax_rate_id:o['default_tax_rate_id']=maps['TaxRate'][(r.default_tax_rate_id,gid)].id
                x=clone(r,o,rehearsal,neg); maps['AccountingSettings'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in RR.objects.filter(company_id=src).order_by('id'):
                if getattr(r,'cost_center_id',None):raise RuntimeError(f'cost center nonnull {l}/{r.id}')
                o={'company_id':T[gid].id}
                if r.account_id:o['account_id']=maps['Account'][(r.account_id,gid)].id
                if r.tax_rate_id:o['tax_rate_id']=maps['TaxRate'][(r.tax_rate_id,gid)].id
                x=clone(r,o,rehearsal,neg); maps['AccountingRoutingRule'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in CS.objects.filter(company_id=src).order_by('id'): x=clone(r,{'company_id':T[gid].id},rehearsal,neg); maps['CompanySettings'][(r.id,gid)]=x; total+=1
        for gid in gids:
            for r in TA.objects.filter(company_id=src).order_by('id'):
                if Decimal(r.opening_balance)!=0 or Decimal(r.current_balance)!=0 or r.opening_accounting_entry_id: raise RuntimeError(f'treasury balance/link nonzero {l}/{r.id}')
                o={'company_id':T[gid].id}
                if r.accounting_account_id:o['accounting_account_id']=maps['Account'][(r.accounting_account_id,gid)].id
                x=clone(r,o,rehearsal,neg); maps['TreasuryAccount'][(r.id,gid)]=x; total+=1
    if total!=5524:raise RuntimeError(f'foundation clone count {total}')
    return maps

def usage_clone(M,C,T,F,manifest,rehearsal,neg):
    CG,PG=usage_groups(M,C,manifest); CI,BP=M['CatalogItem'],M['BusinessParty']; maps=defaultdict(dict); n=0; fp=manifest['business_party_financial_policy']; protected=party_by_legacy(M,'88','122844')
    progress(f'[TX] usage masters CatalogItem: source_masters={len(CG)}')
    for (l,sid),gs in sorted(CG.items(),key=lambda x:(x[0][0],x[0][1])):
        sg=C['src_group'].get(l); s=CI.objects.get(pk=sid)
        for gid in sorted(gs):
            if gid==sg:continue
            o={'company_id':T[gid].id}
            if s.category_id:o['category_id']=F['CatalogCategory'][(s.category_id,gid)].id
            if s.unit_id:o['unit_id']=F['CatalogUnit'][(s.unit_id,gid)].id
            x=clone(s,o,rehearsal,neg);maps['CatalogItem'][(s.id,gid)]=x;n+=1
            if n%5000==0:progress(f'[TX] usage clones={n}/43891')
    progress(f'[TX] usage masters BusinessParty: source_masters={len(PG)}')
    for (l,sid),gs in sorted(PG.items(),key=lambda x:(x[0][0],x[0][1])):
        sg=C['src_group'].get(l); s=BP.objects.get(pk=sid)
        if s.branch_id:raise RuntimeError(f'clone-required party has branch {sid}')
        for gid in sorted(gs):
            if gid==sg:continue
            bal=Decimal(s.opening_balance)
            if bal!=0 and s.id!=protected.id:raise RuntimeError(f'unfrozen nonzero party {l}/{sid}/{bal}')
            targetbal=Decimal(fp['group_opening_balance_policy'].get(gid,'0')) if s.id==protected.id else Decimal('0')
            x=clone(s,{'company_id':T[gid].id,'branch_id':None,'opening_balance':targetbal},rehearsal,neg);maps['BusinessParty'][(s.id,gid)]=x;n+=1
            if n%5000==0:progress(f'[TX] usage clones={n}/43891')
    progress(f'[TX] usage clones={n}/43891 complete')
    if n!=43891:raise RuntimeError(f'usage clones {n}')
    total=Decimal(protected.opening_balance)
    for gid in fp['operational_clone_required_groups']:total+=Decimal(maps['BusinessParty'][(protected.id,gid)].opening_balance)
    if total!=Decimal(fp['opening_balance_source_final_total']):raise RuntimeError(f'opening balance duplication {total}')
    return maps

def memberships(M,C,T,plan,rehearsal,neg):
    CM,P,G=M['CompanyMembership'],M['CompanyMembershipBranchPolicy'],M['CompanyMembershipBranchGrant']; clones=deletes=0; todel=[]
    for a in plan['membership_actions']:
        mid=int(a['current_membership_id']); m=CM.objects.get(pk=mid); p=P.objects.filter(membership=m).first()
        if p is None:raise RuntimeError(f'policy missing membership {mid}')
        if a['delete_existing_membership']:todel.append(m);deletes+=1;continue
        src_policy=p
        grant_templates=list(G.objects.filter(policy=src_policy).order_by('id'))
        def setpol(pol,gid,spec):
            bids=[C['branch_by_pair'][(c(a['legacy_company_id']),c(b))] for b in spec['legacy_grant_branch_ids']]
            if spec['mode']=='ALL':
                key=gid if gid!='SOURCE_COMPANY_SURVIVES' else f"{a['legacy_company_id']}:SOURCE_COMPANY_SURVIVES"; bids=[C['meta'][key]['default']]
            pol.mode=spec['mode']; fields=['mode']
            if hasattr(pol,'default_branch_id'):pol.default_branch_id=bids[0] if bids else None;fields.append('default_branch')
            if hasattr(pol,'last_active_branch_id'):pol.last_active_branch_id=bids[0] if bids else None;fields.append('last_active_branch')
            pol.save(update_fields=fields);G.objects.filter(policy=pol).delete()
            template=grant_templates[0] if grant_templates else None
            by_branch={int(x.branch_id):x for x in grant_templates}
            for bid in bids if spec['mode']=='RESTRICTED' else []:
                template_for_branch=by_branch.get(int(bid),template)
                if template_for_branch: clone(template_for_branch,{'policy_id':pol.id,'branch_id':bid},rehearsal,neg)
                else:new(G,{'policy_id':pol.id,'branch_id':bid},rehearsal,neg)
        rg=a['reuse_existing_membership_for']
        if rg:
            tc=T[rg];
            if m.company_id!=tc.id:m.company_id=tc.id;m.save(update_fields=['company'])
            setpol(p,rg,a['target_access'][rg])
        for gid in a['clone_membership_to']:
            cm=clone(m,{'company_id':T[gid].id},rehearsal,neg); cp=clone(src_policy,{'membership_id':cm.id},rehearsal,neg); setpol(cp,gid,a['target_access'][gid]);clones+=1
    for m in todel:m.delete()
    if clones!=43 or deletes!=47:raise RuntimeError(f'membership clones/deletes {clones}/{deletes}')
    return clones,deletes

def profiles(M,T,plan):
    for a in plan['user_profile_actions']:
        p=M['UserProfile'].objects.filter(user_id=int(a['current_user_id'])).first()
        if not p:continue
        if a['policy']=='SET_SOLE_RESULTING_TARGET_COMPANY':p.default_company_id=T[a['target_groups'][0]].id;p.save(update_fields=['default_company'])
        elif a['policy']=='SET_NULL_AND_REQUIRE_USER_SELECTION':p.default_company_id=None;p.save(update_fields=['default_company'])

def subscriptions(M,T,plan,rehearsal,neg):
    S=M['CompanySubscription']; n=0
    for l,row in plan['subscription_candidates'].items():
        src=S.objects.get(pk=int(row['candidate_current_subscription_id']))
        for gid in row['clone_target_groups']:
            snap=copy.deepcopy(src.commercial_snapshot or {});snap['primey_company_split']={'manifest':'v3','legacy_company_id':l,'group_id':gid,'source_subscription_id_snapshot':src.id}
            o={'company_id':T[gid].id,'previous_subscription_id':None,'commercial_snapshot':snap}
            if hasattr(src,'notes'):o['notes']=(c(src.notes)+f'\n[PRIMEY_SPLIT {l}->{gid}]').strip()
            f=S._meta.get_field('billing_reference'); unique_ref=getattr(f,'unique',False) or any(tuple(getattr(u,'fields',()))==('billing_reference',) for u in getattr(S._meta,'constraints',()))
            if unique_ref and src.billing_reference:o['billing_reference']=(src.billing_reference+'-SPLIT-'+gid)[:f.max_length or 255]
            clone(src,o,rehearsal,neg);n+=1
    if n!=39:raise RuntimeError(f'subscription clones {n}')

def reparent(M,C,T,manifest):
    B=M['Branch']; B.objects.filter(id__in=list(C['pair_by_branch'])).update(is_default=False)
    for e in manifest['companies']:
        l=c(e['legacy_company_id'])
        if e['mode']=='SPLIT':
            for g in e['output_groups']:
                for lb in g['legacy_branch_ids']:B.objects.filter(pk=C['branch_by_pair'][(l,lb)]).update(company_id=T[g['group_id']].id,is_default=(lb==g['default_branch_legacy_id']))
        elif e['mode']=='PARTIAL_INCLUDE':
            for lb in e['keep_legacy_branch_ids']:B.objects.filter(pk=C['branch_by_pair'][(l,lb)]).update(company_id=T['SOURCE_COMPANY_SURVIVES'].id,is_default=(lb==e['default_branch_after_transform']))
def ops(M,C,T,U):
    rev={v:k for k,v in C['company_ids'].items()}; ids=list(rev); srcg=C['src_group']; counts=Counter()
    def gid_for(bid):
        if bid is None or int(bid) in C['fullb'] or int(bid) in C['partb']:return None
        return C['group_by_branch'].get(int(bid))
    def tc(l,g):return C['company_ids'][l] if g=='SOURCE_COMPANY_SURVIVES' else T[g].id
    def run(model,qs,fields,mutator,label,batch_size=1000):
        progress(f'[TX] operational {label}: start')
        batch=[];seen=0
        for x in qs.iterator(chunk_size=5000):
            seen+=1
            if mutator(x): batch.append(x); counts[label]+=1
            if len(batch)>=batch_size:model.objects.bulk_update(batch,fields,batch_size=batch_size);batch=[]
            if seen%100000==0:progress(f'[TX] operational {label}: scanned={seen} changed={counts[label]}')
        if batch:model.objects.bulk_update(batch,fields,batch_size=batch_size)
        progress(f'[TX] operational {label}: done scanned={seen} changed={counts[label]}')
    run(M['Warehouse'],M['Warehouse'].objects.filter(company_id__in=ids),['company'],lambda x:(False if not (g:=gid_for(x.branch_id)) else (setattr(x,'company_id',tc(rev[int(x.company_id)],g)) or True)),'Warehouse')
    def bill(x):
        g=gid_for(x.branch_id)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.supplier_id and g!=srcg.get(l):
            q=U['BusinessParty'].get((int(x.supplier_id),g))
            if not q:raise RuntimeError(f'bill supplier clone missing {x.id}/{g}')
            x.supplier_id=q.id
        return True
    run(M['PurchaseBill'],M['PurchaseBill'].objects.filter(company_id__in=ids),['company','supplier'],bill,'PurchaseBill')
    def inv(x):
        g=gid_for(x.branch_id)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.customer_id and g!=srcg.get(l):
            q=U['BusinessParty'].get((int(x.customer_id),g))
            if not q:raise RuntimeError(f'invoice customer clone missing {x.id}/{g}')
            x.customer_id=q.id
        return True
    run(M['SalesInvoice'],M['SalesInvoice'].objects.filter(company_id__in=ids),['company','customer'],inv,'SalesInvoice')
    def loc(x):
        g=gid_for(x.warehouse.branch_id if x.warehouse else None)
        if not g:return False
        x.company_id=tc(rev[int(x.company_id)],g);return True
    run(M['InventoryLocation'],M['InventoryLocation'].objects.filter(company_id__in=ids).select_related('warehouse'),['company'],loc,'InventoryLocation')
    def stock(x):
        g=gid_for(x.warehouse.branch_id if x.warehouse else None)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.item_id and g!=srcg.get(l):
            q=U['CatalogItem'].get((int(x.item_id),g))
            if not q:raise RuntimeError(f'{x.__class__.__name__} item clone missing {x.id}/{g}')
            x.item_id=q.id
        return True
    run(M['StockItem'],M['StockItem'].objects.filter(company_id__in=ids).select_related('warehouse'),['company','item'],stock,'StockItem')
    run(M['StockMovement'],M['StockMovement'].objects.filter(company_id__in=ids).select_related('warehouse'),['company','item'],stock,'StockMovement')
    def bi(x):
        g=gid_for(x.bill.branch_id if x.bill else None)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.item_id and g!=srcg.get(l):
            q=U['CatalogItem'].get((int(x.item_id),g))
            if not q:raise RuntimeError(f'PurchaseBillItem clone missing {x.id}/{g}')
            x.item_id=q.id
        return True
    run(M['PurchaseBillItem'],M['PurchaseBillItem'].objects.filter(company_id__in=ids).select_related('bill'),['company','item'],bi,'PurchaseBillItem')
    def ii(x):
        g=gid_for(x.invoice.branch_id if x.invoice else None)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.catalog_item_id and g!=srcg.get(l):
            q=U['CatalogItem'].get((int(x.catalog_item_id),g))
            if not q:raise RuntimeError(f'SalesInvoiceItem clone missing {x.id}/{g}')
            x.catalog_item_id=q.id
        return True
    run(M['SalesInvoiceItem'],M['SalesInvoiceItem'].objects.filter(company_id__in=ids).select_related('invoice'),['company','catalog_item'],ii,'SalesInvoiceItem',500)
    def ret(x):
        g=gid_for(x.branch_id)
        if not g:return False
        l=rev[int(x.company_id)];x.company_id=tc(l,g)
        if x.customer_id and g!=srcg.get(l):
            q=U['BusinessParty'].get((int(x.customer_id),g))
            if not q:raise RuntimeError(f'return customer clone missing {x.id}/{g}')
            x.customer_id=q.id
        return True
    run(M['SalesReturn'],M['SalesReturn'].objects.filter(company_id__in=ids),['company','customer'],ret,'SalesReturn')
    return dict(counts)

def payment_target(p,C):
    if p.company_id in C['fullc']:return 'PURGE_FULL',None
    if p.sales_invoice_id and p.sales_invoice and p.sales_invoice.branch_id:
        bid=int(p.sales_invoice.branch_id)
        if bid in C['partb']:return 'PURGE_PARTIAL',bid
        if bid in C['fullb']:return 'PURGE_FULL',bid
        g=C['group_by_branch'].get(bid)
        if not g:raise RuntimeError(f'payment invoice branch unresolved {p.id}/{bid}')
        return g,bid
    if p.id not in C['special']:raise RuntimeError(f'payment special route missing {p.id}')
    return C['special'][p.id]

def payments(M,C,T,F,U):
    CP,BP=M['CustomerPayment'],M['BusinessParty']; rev={v:k for k,v in C['company_ids'].items()}; ids=list(rev); bpcompany=dict(BP.objects.filter(company_id__in=ids).values_list('id','company_id')); moved=sp=seen=0;part=[];full=[];batch=[]
    progress('[TX] CustomerPayment routing: start')
    fields=['company','branch','treasury_account','counterparty_account','customer_id','counterparty_id']
    for p in CP.objects.filter(company_id__in=ids).select_related('sales_invoice').iterator(chunk_size=5000):
        seen+=1
        if seen%50000==0:progress(f'[TX] CustomerPayment routing: scanned={seen}/367272 moved={moved} partial={len(part)} full={len(full)}')
        oldcid=int(p.company_id);l=rev[oldcid];g,bid=payment_target(p,C)
        if g=='PURGE_FULL':full.append(p.id);continue
        if g=='PURGE_PARTIAL':part.append(p.id);continue
        if not p.sales_invoice_id:sp+=1
        p.company_id=T[g].id;p.branch_id=bid
        if g!=C['src_group'].get(l):
            z=F['TreasuryAccount'].get((int(p.treasury_account_id),g))
            if not z:raise RuntimeError(f'payment treasury clone missing {p.id}/{g}')
            p.treasury_account_id=z.id
            if p.counterparty_account_id:
                z=F['Account'].get((int(p.counterparty_account_id),g))
                if not z:raise RuntimeError(f'payment account clone missing {p.id}/{g}')
                p.counterparty_account_id=z.id
            for a in ['customer_id','counterparty_id']:
                sid=getattr(p,a)
                if sid and int(sid) in bpcompany:
                    z=U['BusinessParty'].get((int(sid),g))
                    if not z:raise RuntimeError(f'payment party clone missing {p.id}/{sid}/{g}')
                    setattr(p,a,z.id)
        if p.accounting_entry_id or p.treasury_transaction_id:raise RuntimeError(f'payment accounting/treasury link nonnull {p.id}')
        batch.append(p);moved+=1
        if len(batch)>=500:CP.objects.bulk_update(batch,fields,batch_size=500);batch=[]
    if batch:CP.objects.bulk_update(batch,fields,batch_size=500)
    progress(f'[TX] CustomerPayment routing: done scanned={seen} moved={moved} partial={len(part)} full={len(full)} special={sp}')
    if sp!=412 or len(part)!=8616 or len(full)!=47242:raise RuntimeError(f'payment route counts special/part/full={sp}/{len(part)}/{len(full)}')
    return moved,part,full

def delmaps(M,model,ids):
    ct=M['ContentType'].objects.get_for_model(model)
    for i in range(0,len(ids),5000):M['LegacyObjectMap'].objects.filter(target_content_type=ct,target_object_id__in=[str(x) for x in ids[i:i+5000]]).delete()

def purge_partial(M,C,pids):
    progress(f'[TX] partial76 purge: start payments={len(pids)}')
    cid=C['company_ids']['76']; bids=list(C['partb']); delmaps(M,M['CustomerPayment'],pids);M['CustomerPayment'].objects.filter(id__in=pids).delete()
    rids=list(M['SalesReturn'].objects.filter(company_id=cid,branch_id__in=bids).values_list('id',flat=True));
    if M['SalesReturnItem']:
        ri=list(M['SalesReturnItem'].objects.filter(sales_return_id__in=rids).values_list('id',flat=True));delmaps(M,M['SalesReturnItem'],ri)
    delmaps(M,M['SalesReturn'],rids);M['SalesReturn'].objects.filter(id__in=rids).delete()
    iids=list(M['SalesInvoice'].objects.filter(company_id=cid,branch_id__in=bids).values_list('id',flat=True)); lines=list(M['SalesInvoiceItem'].objects.filter(invoice_id__in=iids).values_list('id',flat=True));delmaps(M,M['SalesInvoiceItem'],lines);delmaps(M,M['SalesInvoice'],iids);M['SalesInvoice'].objects.filter(id__in=iids).delete()
    bills=list(M['PurchaseBill'].objects.filter(company_id=cid,branch_id__in=bids).values_list('id',flat=True)); blines=list(M['PurchaseBillItem'].objects.filter(bill_id__in=bills).values_list('id',flat=True));delmaps(M,M['PurchaseBillItem'],blines);delmaps(M,M['PurchaseBill'],bills);M['PurchaseBill'].objects.filter(id__in=bills).delete()
    wh=list(M['Warehouse'].objects.filter(company_id=cid,branch_id__in=bids).values_list('id',flat=True)); sm=list(M['StockMovement'].objects.filter(company_id=cid,warehouse_id__in=wh).values_list('id',flat=True));si=list(M['StockItem'].objects.filter(company_id=cid,warehouse_id__in=wh).values_list('id',flat=True));loc=list(M['InventoryLocation'].objects.filter(company_id=cid,warehouse_id__in=wh).values_list('id',flat=True))
    for model,xs in [(M['StockMovement'],sm),(M['StockItem'],si),(M['InventoryLocation'],loc),(M['Warehouse'],wh)]:delmaps(M,model,xs);model.objects.filter(id__in=xs).delete()
    M['CompanyMembershipBranchGrant'].objects.filter(branch_id__in=bids).delete()
    CI,LOM,CT=M['CatalogItem'],M['LegacyObjectMap'],M['ContentType'];ct=CT.objects.get_for_model(CI); pi=set()
    for st,lid in [('products','374553'),('variations','305466'),('variations','305477'),('variations','305486'),('variations','305492'),('variations','376285')]:
        for q in LOM.objects.filter(source_system=SRC,legacy_company_id='76',source_table=st,legacy_id=lid,target_content_type=ct):
            if c(q.target_object_id).isdigit():pi.add(int(q.target_object_id))
    if len(pi)!=5:raise RuntimeError(f'partial catalog purge count {len(pi)}')
    blockers=[]
    for mo in M['apps'].get_models():
        if not mo._meta.managed or mo._meta.proxy:continue
        for f,t in fks(mo):
            if t is CI:
                n=mo._default_manager.filter(**{f'{f.name}_id__in':pi}).count()
                if n:blockers.append(f'{mlabel(mo)}.{f.name}={n}')
    if blockers:raise RuntimeError(f'partial catalog blockers {blockers}')
    delmaps(M,CI,list(pi));CI.objects.filter(id__in=pi).delete();delmaps(M,M['Branch'],bids);LOM.objects.filter(source_system=SRC,legacy_company_id='76',source_table='business_locations',legacy_id__in=['90','91']).delete();M['Branch'].objects.filter(id__in=bids).delete()
    result={'payments':len(pids),'returns':len(rids),'invoices':len(iids),'invoice_items':len(lines),'warehouses':len(wh),'catalog_items':len(pi),'branches':len(bids)}
    progress(f'[TX] partial76 purge: done {result}')
    return result

def purge_full(M,C):
    ids=list(C['fullc']);progress(f'[TX] full exclusions purge: start companies={len(ids)}'); L=M['LegacyObjectMap'];L.objects.filter(company_id__in=ids).delete();M['CustomerPayment'].objects.filter(company_id__in=ids).delete();M['SupplierPayment'].objects.filter(company_id__in=ids).delete();M['TreasuryTransaction'].objects.filter(company_id__in=ids).delete();M['TreasuryAccount'].objects.filter(company_id__in=ids).delete();n=0
    for cid in ids:
        q=M['Company'].objects.filter(pk=cid).first()
        if q:q.delete();n+=1
    if n!=7:raise RuntimeError(f'full company deletes {n}')
    progress(f'[TX] full exclusions purge: done companies={n}')
    return n
def move_maps(M,C):
    L,CT,conn=M['LegacyObjectMap'],M['ContentType'],M['connection']; total=0; qn=conn.ops.quote_name
    for model in [M['Branch'],M['Warehouse'],M['InventoryLocation'],M['StockItem'],M['StockMovement'],M['PurchaseBill'],M['PurchaseBillItem'],M['SalesInvoice'],M['SalesInvoiceItem'],M['SalesReturn'],M['CustomerPayment']]:
        rf=rels(model,M['Company'])
        if len(rf)!=1:continue
        f=rf[0];ct=CT.objects.get_for_model(model)
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {qn(L._meta.db_table)} lom SET company_id=t.{qn(f.column)} FROM {qn(model._meta.db_table)} t WHERE lom.target_content_type_id=%s AND lom.target_object_id=t.{qn(model._meta.pk.column)}::text AND lom.company_id=ANY(%s) AND lom.company_id IS DISTINCT FROM t.{qn(f.column)}",[ct.id,list(C['company_ids'].values())]);total+=cur.rowcount
    return total

def userdeps(M,uid):
    U=M['User']; out={}
    for mo in M['apps'].get_models():
        if not mo._meta.managed or mo._meta.proxy or mo is U or mlabel(mo) in {'accounts.CompanyMembership','accounts.UserProfile'}:continue
        for f,t in fks(mo):
            if t is U:
                try:n=mo._default_manager.filter(**{f'{f.name}_id':uid}).count()
                except Exception:continue
                if n:out[f'{mlabel(mo)}.{f.name}']=n
    return out

def users(M,plan):
    deleted=[];kept={};U,CM,UP,LOM,CT=M['User'],M['CompanyMembership'],M['UserProfile'],M['LegacyObjectMap'],M['ContentType'];ct=CT.objects.get_for_model(U)
    for uid in plan['user_deletion']['candidate_current_user_ids_snapshot']:
        uid=int(uid)
        if CM.objects.filter(user_id=uid).exists():kept[uid]={'membership':1};continue
        d=userdeps(M,uid)
        if d:kept[uid]=d;continue
        LOM.objects.filter(target_content_type=ct,target_object_id=str(uid)).delete();q=U.objects.filter(pk=uid).first()
        if q:q.delete();deleted.append(uid)
    return deleted,kept

def same_company(M):
    from django.db.models import F
    checks=[('Warehouse.branch',M['Warehouse'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('InventoryLocation.warehouse',M['InventoryLocation'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockItem.warehouse',M['StockItem'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockItem.location',M['StockItem'].objects.exclude(company_id=F('location__company_id')).count()),('StockItem.item',M['StockItem'].objects.exclude(company_id=F('item__company_id')).count()),('StockMovement.warehouse',M['StockMovement'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockMovement.item',M['StockMovement'].objects.exclude(company_id=F('item__company_id')).count()),('PurchaseBill.branch',M['PurchaseBill'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('PurchaseBill.supplier',M['PurchaseBill'].objects.exclude(company_id=F('supplier__company_id')).count()),('PurchaseBillItem.bill',M['PurchaseBillItem'].objects.exclude(company_id=F('bill__company_id')).count()),('PurchaseBillItem.item',M['PurchaseBillItem'].objects.exclude(company_id=F('item__company_id')).count()),('SalesInvoice.branch',M['SalesInvoice'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('SalesInvoice.customer',M['SalesInvoice'].objects.filter(customer_id__isnull=False).exclude(company_id=F('customer__company_id')).count()),('SalesInvoiceItem.invoice',M['SalesInvoiceItem'].objects.exclude(company_id=F('invoice__company_id')).count()),('SalesInvoiceItem.catalog',M['SalesInvoiceItem'].objects.filter(catalog_item_id__isnull=False).exclude(company_id=F('catalog_item__company_id')).count()),('SalesReturn.branch',M['SalesReturn'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('SalesReturn.customer',M['SalesReturn'].objects.filter(customer_id__isnull=False).exclude(company_id=F('customer__company_id')).count()),('SalesReturn.invoice',M['SalesReturn'].objects.exclude(company_id=F('invoice__company_id')).count()),('CustomerPayment.branch',M['CustomerPayment'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('CustomerPayment.invoice',M['CustomerPayment'].objects.filter(sales_invoice_id__isnull=False).exclude(company_id=F('sales_invoice__company_id')).count()),('CustomerPayment.treasury',M['CustomerPayment'].objects.exclude(company_id=F('treasury_account__company_id')).count()),('CustomerPayment.account',M['CustomerPayment'].objects.filter(counterparty_account_id__isnull=False).exclude(company_id=F('counterparty_account__company_id')).count())]
    bad={k:v for k,v in checks if v}
    conn=M['connection'];qn=conn.ops.quote_name;cp=qn(M['CustomerPayment']._meta.db_table);bp=qn(M['BusinessParty']._meta.db_table)
    with conn.cursor() as cur:
        for col in ['customer_id','counterparty_id']:
            cur.execute(f'SELECT COUNT(*) FROM {cp} c JOIN {bp} b ON b.id=c.{qn(col)} WHERE c.{qn(col)} IS NOT NULL AND c.company_id IS DISTINCT FROM b.company_id');n=int(cur.fetchone()[0]);
            if n:bad[f'CustomerPayment.{col}']=n
    if bad:raise RuntimeError(f'same-company errors {bad}')

def verify(M,C,T,manifest,plan,base,stats):
    L=M['LegacyObjectMap'];
    if M['Company'].objects.count()!=base['companies']+32:raise RuntimeError('Company count delta')
    if M['Branch'].objects.count()!=base['branches']-35:raise RuntimeError('Branch count delta')
    mb=L.objects.filter(source_system=SRC,source_table='business').count();br=L.objects.filter(source_system=SRC,source_table='business_locations').count()
    if mb!=312 or br!=415:raise RuntimeError(f'mapped counts {mb}/{br}')
    prov=M['Company'].objects.filter(extra_data__primey_company_split__source_company_survivor=False).count()
    if prov!=39 or mb+prov!=351:raise RuntimeError(f'logical company count maps/prov={mb}/{prov}')
    expected_memberships=base['memberships']-47+43
    if M['CompanyMembership'].objects.count()!=expected_memberships:raise RuntimeError(f'membership total expected={expected_memberships} actual={M["CompanyMembership"].objects.count()}')
    expected_subs=base['subs']+39-int(stats['full_excluded_subscription_rows'])
    if M['CompanySubscription'].objects.count()!=expected_subs:raise RuntimeError(f'subscription total expected={expected_subs} actual={M["CompanySubscription"].objects.count()}')
    if M['Company'].objects.filter(id__in=C['fullc']).exists():raise RuntimeError('excluded companies remain')
    if M['Branch'].objects.filter(id__in=C['fullb']|C['partb']).exists():raise RuntimeError('excluded branches remain')
    for e in manifest['companies']:
        l=c(e['legacy_company_id'])
        if e['mode']=='SPLIT':
            for g in e['output_groups']:
                bids=[C['branch_by_pair'][(l,b)] for b in g['legacy_branch_ids']]; n=M['Branch'].objects.filter(id__in=bids,company_id=T[g['group_id']].id,is_default=True).count()
                if n!=1:raise RuntimeError(f'default branch {g["group_id"]}={n}')
        elif e['mode']=='PARTIAL_INCLUDE':
            bids=[C['branch_by_pair'][(l,b)] for b in e['keep_legacy_branch_ids']]
            if M['Branch'].objects.filter(id__in=bids,company_id=C['company_ids'][l],is_default=True).count()!=1:raise RuntimeError('partial default')
    p=party_by_legacy(M,'88','122844')
    if Decimal(p.opening_balance)!=Decimal('24.00'):raise RuntimeError('canonical opening balance')
    q=M['BusinessParty'].objects.filter(company_id=T['88-G02'].id,code=p.code,display_name=p.display_name)
    if q.count()!=1 or Decimal(q.first().opening_balance)!=0:raise RuntimeError('G02 zero opening balance clone')
    same_company(M);M['connection'].check_constraints()

def transform(M,C,manifest,plan,base,rehearsal):
    neg=Neg();conn=M['connection'];mode='REHEARSAL' if rehearsal else 'APPLY'
    progress(f'[TX {mode}] 1/13 lock source scope')
    with conn.cursor() as cur:cur.execute('SET LOCAL statement_timeout=0');cur.execute("SET LOCAL lock_timeout='15s'");cur.execute('SELECT pg_advisory_xact_lock(%s)',[LOCK])
    list(M['Company'].objects.select_for_update().filter(id__in=list(C['company_ids'].values())).values_list('id',flat=True));list(M['Branch'].objects.select_for_update().filter(id__in=list(C['pair_by_branch'])).values_list('id',flat=True))
    stats={'full_excluded_subscription_rows':M['CompanySubscription'].objects.filter(company_id__in=C['fullc']).count()}
    progress(f'[TX {mode}] 2/13 create/relabel Companies');T=make_targets(M,C,manifest,rehearsal,neg)
    progress(f'[TX {mode}] 3/13 clone foundation masters (5524)');F=foundation(M,C,T,manifest,rehearsal,neg);progress(f'[TX {mode}] 3/13 foundation complete')
    progress(f'[TX {mode}] 4/13 clone usage masters (43891)');U=usage_clone(M,C,T,F,manifest,rehearsal,neg)
    progress(f'[TX {mode}] 5/13 memberships + branch access');stats['membership_clones'],stats['membership_deletes']=memberships(M,C,T,plan,rehearsal,neg)
    progress(f'[TX {mode}] 6/13 UserProfile defaults');profiles(M,T,plan)
    progress(f'[TX {mode}] 7/13 clone subscriptions (39)');subscriptions(M,T,plan,rehearsal,neg)
    progress(f'[TX {mode}] 8/13 reparent Branch rows');reparent(M,C,T,manifest)
    progress(f'[TX {mode}] 9/13 operational remap');stats['ops']=ops(M,C,T,U)
    progress(f'[TX {mode}] 10/13 CustomerPayment remap');stats['payments_moved'],part,full=payments(M,C,T,F,U)
    progress(f'[TX {mode}] 11/13 LegacyObjectMap rehome');stats['maps_moved']=move_maps(M,C)
    progress(f'[TX {mode}] 12/13 exclusions + orphan users');stats['partial']=purge_partial(M,C,part);stats['full_companies']=purge_full(M,C);stats['users_deleted'],stats['users_kept']=users(M,plan)
    progress(f'[TX {mode}] 13/13 full integrity verification');verify(M,C,T,manifest,plan,base,stats);progress(f'[TX {mode}] 13/13 verification PASS');return stats

def restore(M,C,base):
    b=baseline(M,C)
    if b!=base:raise RuntimeError(f'rollback baseline mismatch before={hashlib.sha256(json.dumps(base,sort_keys=True).encode()).hexdigest()} after={hashlib.sha256(json.dumps(b,sort_keys=True).encode()).hexdigest()}')

def restore_stash():
    hp=ROOT/'_audit'/'company_split_worktree_guard'/'v2_26c_file_hashes.json'
    if not hp.exists():raise RuntimeError('A9 file hash guard missing')
    expected=json.loads(hp.read_text(encoding='utf-8'));cp=subprocess.run(['git','stash','apply',STASH],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
    if cp.returncode:raise RuntimeError(f'stash apply failed {c(cp.stderr or cp.stdout)}')
    bad=[]
    for rel,row in expected.items():
        p=ROOT/rel
        if not p.exists() or sha(p)!=c(row['working_tree_sha256']):bad.append(rel)
    if bad:raise RuntimeError(f'V2-26C hash restore mismatch {bad}')
    return len(expected)
def main():
    a=args(); committed=False; lines=['='*120,'PRIMEYACC — COMPANY SPLIT FINAL ONE-SHOT V5','='*120,f'GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}',f'ROOT={ROOT}',f'APPLY_AFTER_REHEARSAL={"YES" if a.apply_after_rehearsal else "NO"}',f'RESTORE_V2_26C={"YES" if a.restore_v2_26c else "NO"}','GIT_PUSH=0','']
    try:
        print('[FINAL] 1/7 Validating frozen chain and Git guard...',flush=True)
        for p,h,n in [(M2,SHAS['m2'],'Manifest v2'),(A9,SHAS['a9'],'A9'),(A10R,SHAS['a10r'],'A10 V5 report'),(PLANF,SHAS['plan'],'A10 V5 plan'),(A10ER,SHAS['a10er'],'A10E report'),(A10EP,SHAS['a10ep'],'A10E policy'),(A6C,SHAS['a6c'],'A6C'),(A6D,SHAS['a6d'],'A6D'),(A6E,SHAS['a6e'],'A6E')]:req(p,h,n)
        if git('branch','--show-current')!='main':raise RuntimeError('Expected main')
        if git('rev-parse','HEAD')!=HEAD or git('rev-parse','origin/main')!=HEAD:raise RuntimeError('HEAD/origin drift')
        if git('status','--short','--untracked-files=no'):raise RuntimeError('Tracked worktree must be clean')
        if git('rev-parse','stash@{0}')!=STASH:raise RuntimeError('V2-26C stash drift')
        t=A10R.read_text(encoding='utf-8',errors='replace')
        for tok in ['FOUNDATION_CLONE_ACTION_COUNT=5524','USAGE_MASTER_CLONE_ACTION_COUNT=43891','OPERATIONAL_ROUTE_ROW_COUNT=961753','CUSTOMER_PAYMENT_ROW_COUNT=367272','USER_DELETE_CANDIDATE_COUNT=47','CUSTOMER_PAYMENT_PARTY_CLONE_COVERAGE_ERROR_COUNT=0','FINANCIAL_MASTER_BALANCE_RISK_COUNT=1','A10_RESULT=REVIEW_REQUIRED']:
            if tok not in t:raise RuntimeError(f'A10 frozen token missing {tok}')
        te=A10ER.read_text(encoding='utf-8',errors='replace')
        for tok in ['A10E_RESULT=PASS','BALANCE_OWNER_GROUP=88-G01','CLONE_88_G02_OPENING_BALANCE=0.00','NO_DUPLICATION_CHECK=PASS']:
            if tok not in te:raise RuntimeError(f'A10E token missing {tok}')
        print('[FINAL] 2/7 Building final Manifest v3 and integrated preflight...',flush=True)
        m2=json.loads(M2.read_text(encoding='utf-8'))
        pol=json.loads(A10EP.read_text(encoding='utf-8'))
        plan=json.loads(PLANF.read_text(encoding='utf-8'))
        M=load_models()
        if M['Company'].objects.filter(
            extra_data__primey_company_split__manifest='v3'
        ).exists():
            raise RuntimeError(
                'Company split v3 already appears applied; do not rerun this one-shot'
            )

        # Build current routing context from frozen A6 reports, then convert all
        # 412 exceptional payments to stable legacy identities before freezing v3.
        provisional=copy.deepcopy(m2)
        C=context(M,provisional,plan)
        special_routes=stable_special_routes(M,C)
        manifest=build_m3(m2,pol,special_routes)

        M3.write_text(
            json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=True)+'\n',
            encoding='utf-8'
        )
        m3sha=sha(M3)

        if (
            manifest['customer_payment_contract'].get(
                'special_legacy_payment_route_count'
            ) != 412
        ):
            raise RuntimeError('Manifest v3 special route count is not 412')

        # Rebuild context against the final manifest (local routing remains
        # independently validated against the same frozen A6 evidence).
        C=context(M,manifest,plan)
        base=baseline(M,C)
        progress(f"[FINAL] baseline guard hash={hashlib.sha256(json.dumps(base,sort_keys=True,default=str).encode()).hexdigest().upper()}")
        if base['mapped_companies']!=319 or base['mapped_branches']!=450:raise RuntimeError(f'baseline maps {base["mapped_companies"]}/{base["mapped_branches"]}')
        cg,pg=usage_groups(M,C,manifest);uc=sum(sum(1 for g in gs if g!=C['src_group'].get(l)) for (l,_),gs in cg.items())+sum(sum(1 for g in gs if g!=C['src_group'].get(l)) for (l,_),gs in pg.items())
        if uc!=43891:raise RuntimeError(f'preflight usage count {uc}')
        route_total=sum(M[mn].objects.filter(company_id__in=list(C['company_ids'].values())).count() for mn in ['Warehouse','PurchaseBill','SalesInvoice','SalesReturn','InventoryLocation','StockItem','StockMovement','PurchaseBillItem','SalesInvoiceItem'])
        if route_total!=961753:raise RuntimeError(f'route rows {route_total}')
        cp=M['CustomerPayment'].objects.filter(company_id__in=list(C['company_ids'].values())).count()
        if cp!=367272:raise RuntimeError(f'payment scope {cp}')
        static_checks();lines += [
            '===== FINAL PREFLIGHT =====',
            f'MANIFEST_V3_SHA256={m3sha}',
            f'SPECIAL_LEGACY_PAYMENT_ROUTES={len(special_routes)}',
            'SPECIAL_PAYMENT_ROUTE_IDENTITY=mhamcloud_v1.transaction_payments:(LEGACY_COMPANY_ID,LEGACY_PAYMENT_ID)',
            f'USAGE_MASTER_CLONES={uc}',
            f'OPERATIONAL_ROUTE_ROWS={route_total}',
            f'CUSTOMER_PAYMENT_ROWS={cp}',
            'FINANCIAL_POLICY=88-G01:24.00;88-G02:0.00',
            'FINAL_PREFLIGHT=PASS',
            ''
        ]
        print('[FINAL] 3/7 Running full rollback rehearsal...',flush=True)
        with M['transaction'].atomic():
            rs=transform(M,C,manifest,plan,base,True);M['transaction'].set_rollback(True)
        progress('[FINAL] rehearsal transaction exited; verifying exact baseline restoration...')
        restore(M,C,base);progress('[FINAL] exact baseline restoration PASS');lines += ['===== ROLLBACK REHEARSAL =====','REHEARSAL_TRANSFORM=PASS','REHEARSAL_VERIFY=PASS','REHEARSAL_ROLLBACK=PASS','BASELINE_RESTORED=PASS',f'REHEARSAL_STATS_SHA256={hashlib.sha256(json.dumps(rs,sort_keys=True,default=str).encode()).hexdigest().upper()}','']
        if not a.apply_after_rehearsal:
            lines += ['PERMANENT_APPLY=SKIPPED','MUTATION_READY=YES','FINAL_RESULT=PASS_REHEARSAL_ONLY','='*120];REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8');print('===== PRIMEYACC COMPANY SPLIT FINAL ONE-SHOT V5 =====');print('FINAL_RESULT=PASS_REHEARSAL_ONLY');print('MUTATION_READY=YES');print('DATABASE_PERMANENT_WRITES=0');print(f'MANIFEST_V3_SHA256={m3sha}');print(f'REPORT={REPORT.name}');print(f'REPORT_SHA256={sha(REPORT)}');return 0
        print('[FINAL] 4/7 Applying the verified transformation permanently...',flush=True)
        with M['transaction'].atomic(): astats=transform(M,C,manifest,plan,base,False)
        committed=True
        print('[FINAL] 5/7 Running post-commit verification...',flush=True);static_checks();same_company(M)
        post={'manifest_v3_sha256':m3sha,'company_count':M['Company'].objects.count(),'branch_count':M['Branch'].objects.count(),'mapped_business_count':M['LegacyObjectMap'].objects.filter(source_system=SRC,source_table='business').count(),'mapped_branch_count':M['LegacyObjectMap'].objects.filter(source_system=SRC,source_table='business_locations').count(),'stats':astats};SNAP.write_text(json.dumps(post,ensure_ascii=False,indent=2,sort_keys=True,default=str)+'\n',encoding='utf-8')
        lines += ['===== PERMANENT APPLY =====','PERMANENT_APPLY=PASS',f'APPLY_STATS_SHA256={hashlib.sha256(json.dumps(astats,sort_keys=True,default=str).encode()).hexdigest().upper()}',f'GLOBAL_USERS_DELETED={len(astats["users_deleted"])}',f'GLOBAL_USERS_KEPT_DUE_DEPENDENCIES={len(astats["users_kept"])}','POST_COMMIT_VERIFY=PASS',f'APPLY_SNAPSHOT_SHA256={sha(SNAP)}','']
        if a.restore_v2_26c:
            print('[FINAL] 6/7 Restoring protected V2-26C worktree...',flush=True);n=restore_stash();lines += ['V2_26C_STASH_APPLY=PASS',f'V2_26C_RESTORED_FILES={n}','V2_26C_BYTE_HASH_VERIFY=PASS','V2_26C_STASH_RETAINED=YES','']
        else: print('[FINAL] 6/7 V2-26C restore skipped...',flush=True);lines += ['V2_26C_STASH_APPLY=SKIPPED','']
        print('[FINAL] 7/7 Writing final closure report...',flush=True);lines += ['===== FINAL CLOSURE =====',f'HEAD={git("rev-parse","HEAD")}',f'ORIGIN_MAIN={git("rev-parse","origin/main")}',f'TRACKED_STATUS_AFTER={c(git("status","--short","--untracked-files=no"))}','GIT_PUSH=0','DATABASE_TRANSFORMATION=COMMITTED','LOCAL_COMPANY_SPLIT=FINAL_CLOSED','PRODUCTION_CUTOVER_CONTRACT=MANIFEST_V3','FINAL_RESULT=PASS_APPLIED','='*120];REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8');print('===== PRIMEYACC COMPANY SPLIT FINAL ONE-SHOT V5 =====');print('FINAL_RESULT=PASS_APPLIED');print('LOCAL_COMPANY_SPLIT=FINAL_CLOSED');print(f'MANIFEST_V3_SHA256={m3sha}');print(f'GLOBAL_USERS_DELETED={len(astats["users_deleted"])}');print(f'GLOBAL_USERS_KEPT_DUE_DEPENDENCIES={len(astats["users_kept"])}');print(f'V2_26C_RESTORED={"YES" if a.restore_v2_26c else "NO"}');print('GIT_PUSH=0');print(f'REPORT={REPORT.name}');print(f'REPORT_SHA256={sha(REPORT)}');print(f'APPLY_SNAPSHOT_SHA256={sha(SNAP)}');return 0
    except KeyboardInterrupt:
        lines += ['FINAL_RESULT=INTERRUPTED','GIT_PUSH=0'];REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8');print('FINAL_RESULT=INTERRUPTED');return 130
    except Exception as e:
        result='APPLIED_WITH_POST_STEP_ERROR' if committed else 'FAIL'
        lines += ['='*120,f'FINAL_RESULT={result}',f'ERROR_TYPE={type(e).__name__}',f'ERROR={c(e)}',f'DATABASE_TRANSFORMATION={"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}','GIT_PUSH=0','='*120];REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8');print('===== PRIMEYACC COMPANY SPLIT FINAL ONE-SHOT V5 =====');print(f'FINAL_RESULT={result}');print(f'ERROR={type(e).__name__}: {e}');print(f'DATABASE_TRANSFORMATION={"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}');print('GIT_PUSH=0');print(f'REPORT={REPORT.name}');print(f'REPORT_SHA256={sha(REPORT)}');return 3 if committed else 2

if __name__=='__main__': raise SystemExit(main())
