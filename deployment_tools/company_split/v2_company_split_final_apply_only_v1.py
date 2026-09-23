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
REMAINING_GATE=ROOT/'v2_company_split_remaining_only_rehearsal_v2.txt'
REMAINING_GATE_SHA256='59981469A262DD997CF3BC6179A37EA36EC2C737AA4934383B6CFBA3D605C37A'
REPORT=ROOT/'v2_company_split_final_apply_only_v1.txt'
SNAP=ROOT/'v2_company_split_final_apply_snapshot_apply_only_v1.json'
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
class TempPk:
    MAX_BIGINT=(1<<63)-1
    def __init__(self):
        self.d={}
        self.starts={}
    def get(self,m):
        if m not in self.d:
            current=m._default_manager.order_by('-pk').values_list('pk',flat=True).first()
            current=int(current or 0)
            start=current+1
            if start<=0 or start>self.MAX_BIGINT:
                raise RuntimeError(
                    f'invalid rehearsal temp PK start model={m._meta.label} '
                    f'max_pk={current} start={start}'
                )
            self.d[m]=start
            self.starts[m]=start
            progress(
                f'[TX] rehearsal temp PK {m._meta.label}: start={start} '
                f'strategy=MANUAL_POSITIVE_MAX_PLUS_ONE_NO_SEQUENCE_ADVANCE'
            )
        x=self.d[m]
        if x<=0 or x>self.MAX_BIGINT:
            raise RuntimeError(
                f'invalid rehearsal temp PK model={m._meta.label} value={x}'
            )
        self.d[m]=x+1
        return x
def clone(obj,over,rehearsal,neg):
    d=vals(obj); d.update(over)
    if rehearsal: d[obj._meta.pk.attname]=neg.get(obj.__class__)
    x=obj.__class__(**d); x.save(force_insert=True); return x
def new(m,d,rehearsal,neg):
    d=dict(d)
    if rehearsal: d[m._meta.pk.attname]=neg.get(m)
    x=m(**d); x.save(force_insert=True); return x
def args():
    p=argparse.ArgumentParser()
    p.add_argument('--restore-v2-26c',action='store_true')
    return p.parse_args()
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
    CM,P,G=M['CompanyMembership'],M['CompanyMembershipBranchPolicy'],M['CompanyMembershipBranchGrant']
    clones=deletes=processed=0
    todel=[]

    for a in plan['membership_actions']:
        processed+=1
        lcid=c(a['legacy_company_id'])
        legacy_user=c(a.get('legacy_user_id'))
        mid=int(a['current_membership_id'])
        m=CM.objects.get(pk=mid)
        p=P.objects.filter(membership=m).first()

        if p is None:
            raise RuntimeError(
                f'policy missing membership={mid} company={lcid} legacy_user={legacy_user}'
            )

        if processed==1 or processed%10==0:
            progress(
                f'[TX] memberships: processed={processed}/{len(plan["membership_actions"])} '
                f'company={lcid} legacy_user={legacy_user}'
            )

        if a['delete_existing_membership']:
            todel.append(m);deletes+=1;continue

        src_policy=p
        grant_templates=list(G.objects.filter(policy=src_policy).order_by('id'))
        template=grant_templates[0] if grant_templates else None
        by_branch={int(x.branch_id):x for x in grant_templates}

        def branch_ids_for(gid,spec):
            bids=[
                C['branch_by_pair'][(lcid,c(b))]
                for b in spec.get('legacy_grant_branch_ids',[])
            ]
            if spec['mode']=='ALL':
                key=gid if gid!='SOURCE_COMPANY_SURVIVES' else f"{lcid}:SOURCE_COMPANY_SURVIVES"
                bids=[C['meta'][key]['default']]
            return bids

        def assert_ownership(membership_id,gid,bids):
            membership_company_id=CM.objects.only('company_id').get(
                pk=membership_id
            ).company_id
            for bid in bids:
                branch_company_id=M['Branch'].objects.only(
                    'company_id'
                ).get(pk=bid).company_id
                if int(branch_company_id)!=int(membership_company_id):
                    raise RuntimeError(
                        f'BranchPolicy ownership mismatch '
                        f'company={lcid} legacy_user={legacy_user} gid={gid} '
                        f'membership={membership_id} membership_company={membership_company_id} '
                        f'branch={bid} branch_company={branch_company_id}'
                    )
            return membership_company_id

        def sync_grants(pol,spec,bids):
            G.objects.filter(policy=pol).delete()
            if spec['mode']!='RESTRICTED':
                return
            for bid in bids:
                template_for_branch=by_branch.get(int(bid),template)
                if template_for_branch:
                    clone(
                        template_for_branch,
                        {'policy_id':pol.id,'branch_id':bid},
                        rehearsal,
                        neg,
                    )
                else:
                    new(
                        G,
                        {'policy_id':pol.id,'branch_id':bid},
                        rehearsal,
                        neg,
                    )

        def update_existing_policy(pol,gid,spec):
            bids=branch_ids_for(gid,spec)
            assert_ownership(pol.membership_id,gid,bids)

            pol.mode=spec['mode']
            fields=['mode']

            if hasattr(pol,'default_branch_id'):
                pol.default_branch_id=bids[0] if bids else None
                fields.append('default_branch')

            if hasattr(pol,'last_active_branch_id'):
                pol.last_active_branch_id=bids[0] if bids else None
                fields.append('last_active_branch')

            pol.save(update_fields=fields)
            sync_grants(pol,spec,bids)

        def clone_policy_for_membership(cm,gid,spec):
            # CRITICAL: do not clone/save the source Policy with its old
            # default_branch first. Construct the target-valid Policy values
            # before the first INSERT so model validation sees matching
            # Membership.company and Branch.company immediately.
            bids=branch_ids_for(gid,spec)
            assert_ownership(cm.id,gid,bids)

            overrides={
                'membership_id':cm.id,
                'mode':spec['mode'],
            }

            if hasattr(src_policy,'default_branch_id'):
                overrides['default_branch_id']=bids[0] if bids else None

            if hasattr(src_policy,'last_active_branch_id'):
                overrides['last_active_branch_id']=bids[0] if bids else None

            try:
                cp=clone(src_policy,overrides,rehearsal,neg)
            except Exception as exc:
                raise RuntimeError(
                    f'Policy clone insert failed company={lcid} '
                    f'legacy_user={legacy_user} gid={gid} '
                    f'membership_id={cm.id} bids={bids}: '
                    f'{type(exc).__name__}: {exc}'
                ) from exc

            sync_grants(cp,spec,bids)
            return cp

        rg=a['reuse_existing_membership_for']
        if rg:
            tc=T[rg]
            if m.company_id!=tc.id:
                m.company_id=tc.id
                m.save(update_fields=['company'])
            update_existing_policy(p,rg,a['target_access'][rg])

        for gid in a['clone_membership_to']:
            cm=clone(
                m,
                {'company_id':T[gid].id},
                rehearsal,
                neg,
            )
            clone_policy_for_membership(
                cm,
                gid,
                a['target_access'][gid],
            )
            clones+=1

    for m in todel:
        m.delete()

    progress(
        f'[TX] memberships: complete processed={processed} '
        f'clones={clones} deletes={deletes}'
    )

    if clones!=43 or deletes!=47:
        raise RuntimeError(
            f'membership clones/deletes {clones}/{deletes}'
        )

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
    from django.db.models.deletion import ProtectedError, RestrictedError

    ids = sorted(int(x) for x in C["fullc"])
    Company = M["Company"]
    LOM = M["LegacyObjectMap"]

    progress(
        f"[TX] full exclusions purge: LEAF_SAFE_DEPENDENCY_ENGINE start companies={len(ids)}"
    )

    # Fully excluded source maps must not survive the local purge.
    LOM.objects.filter(company_id__in=ids).delete()

    def company_fk_contracts(model):
        out = []
        for field, target in fks(model):
            if target is not Company:
                continue
            delete_fn = getattr(
                getattr(field, "remote_field", None),
                "on_delete",
                None,
            )
            delete_name = c(
                getattr(delete_fn, "__name__", str(delete_fn))
            )
            out.append((field, delete_name))
        return out

    def owned_company_ids(obj):
        owned = []
        reference_only = []
        for field, delete_name in company_fk_contracts(obj.__class__):
            value = getattr(obj, field.attname, None)
            if value is None:
                continue
            if delete_name in {"CASCADE", "PROTECT", "RESTRICT"}:
                owned.append(int(value))
            else:
                reference_only.append(
                    (field.name, delete_name, int(value))
                )
        return owned, reference_only

    def prove_same_company(obj, cid, seen=None, depth=0):
        if seen is None:
            seen = set()

        key = (obj.__class__, obj.pk)
        if key in seen or depth > 8:
            return False
        seen.add(key)

        owned, reference_only = owned_company_ids(obj)

        if owned:
            return all(x == cid for x in owned)

        # SET_NULL / SET_DEFAULT / DO_NOTHING Company reference does not
        # establish ownership of the object.
        if reference_only:
            return False

        # Detail models without company_id can prove ownership via a parent.
        for field, target in fks(obj.__class__):
            if target is Company:
                continue
            rel_id = getattr(obj, field.attname, None)
            if rel_id is None:
                continue
            try:
                parent = target._default_manager.filter(pk=rel_id).first()
            except Exception:
                parent = None
            if parent is None:
                continue
            if prove_same_company(parent, cid, seen, depth + 1):
                return True

        return False

    def flatten_restricted(value):
        if value is None:
            return []
        if isinstance(value, dict):
            rows = []
            for sub in value.values():
                rows.extend(flatten_restricted(sub))
            return rows
        if isinstance(value, (list, tuple, set, frozenset)):
            rows = []
            for sub in value:
                rows.extend(flatten_restricted(sub))
            return rows
        try:
            if not hasattr(value, "_meta"):
                return list(value)
        except Exception:
            pass
        return [value]

    # Unlike V10, the recursion identity includes the actual PK set.
    # Account -> Account with a smaller child PK set is therefore a normal
    # leaf-first descent, not a false cycle.
    active_signatures = []

    def safe_delete_queryset(model, qs, cid, reason):
        label = mlabel(model)

        while True:
            pks = list(
                qs.order_by("pk").values_list("pk", flat=True)[:2000]
            )
            if not pks:
                break

            normalized_pks = tuple(sorted(int(x) for x in pks))
            signature = (label, int(cid), normalized_pks)

            if signature in active_signatures:
                raise RuntimeError(
                    "TRUE_PROTECTED_DELETE_CYCLE "
                    f"company={cid} model={label} "
                    f"pk_count={len(normalized_pks)} "
                    f"pk_sample={list(normalized_pks[:20])}"
                )

            active_signatures.append(signature)
            try:
                batch_qs = model._default_manager.filter(pk__in=pks)

                try:
                    deleted_count, _detail = batch_qs.delete()
                    progress(
                        f"[TX] full exclusion company={cid} "
                        f"deleted {label} batch_objects={len(pks)} "
                        f"collector_deleted={deleted_count} reason={reason}"
                    )
                    continue

                except ProtectedError as exc:
                    protected = list(exc.protected_objects)
                    if not protected:
                        raise

                    grouped = defaultdict(list)
                    for obj in protected:
                        if not prove_same_company(obj, cid):
                            raise RuntimeError(
                                "CROSS_COMPANY_OR_UNPROVEN_PROTECTED_OBJECT "
                                f"company={cid} deleting={label} "
                                f"protected={mlabel(obj.__class__)}:{obj.pk}"
                            ) from exc
                        grouped[obj.__class__].append(int(obj.pk))

                    progress(
                        f"[TX] full exclusion company={cid} "
                        f"{label} blocked by PROTECT => "
                        f"{ {mlabel(k): len(v) for k, v in grouped.items()} }"
                    )

                    for child_model, child_pks in grouped.items():
                        unique_child_pks = sorted(set(child_pks))
                        child_label = mlabel(child_model)

                        # True self-cycle only when the exact same object set
                        # protects itself. A smaller same-model set is a normal
                        # hierarchy and must be deleted leaf-first.
                        if (
                            child_model is model
                            and tuple(unique_child_pks) == normalized_pks
                        ):
                            raise RuntimeError(
                                "TRUE_SELF_PROTECT_CYCLE "
                                f"company={cid} model={label} "
                                f"pk_count={len(unique_child_pks)} "
                                f"pk_sample={unique_child_pks[:20]}"
                            ) from exc

                        if child_model is model:
                            progress(
                                f"[TX] full exclusion company={cid} "
                                f"{label} self-PROTECT hierarchy: "
                                f"parent_set={len(normalized_pks)} "
                                f"child_set={len(unique_child_pks)} "
                                f"=> descending leaf-first"
                            )

                        safe_delete_queryset(
                            child_model,
                            child_model._default_manager.filter(
                                pk__in=unique_child_pks
                            ),
                            cid,
                            f"PROTECT_CHILD_OF:{label}",
                        )

                    # Retry the original parent batch after children are gone.
                    continue

                except RestrictedError as exc:
                    restricted = flatten_restricted(
                        getattr(exc, "restricted_objects", None)
                    )
                    if not restricted:
                        raise

                    grouped = defaultdict(list)
                    for obj in restricted:
                        if not hasattr(obj, "_meta"):
                            continue
                        if not prove_same_company(obj, cid):
                            raise RuntimeError(
                                "CROSS_COMPANY_OR_UNPROVEN_RESTRICTED_OBJECT "
                                f"company={cid} deleting={label} "
                                f"restricted={mlabel(obj.__class__)}:{obj.pk}"
                            ) from exc
                        grouped[obj.__class__].append(int(obj.pk))

                    if not grouped:
                        raise

                    progress(
                        f"[TX] full exclusion company={cid} "
                        f"{label} blocked by RESTRICT => "
                        f"{ {mlabel(k): len(v) for k, v in grouped.items()} }"
                    )

                    for child_model, child_pks in grouped.items():
                        unique_child_pks = sorted(set(child_pks))

                        if (
                            child_model is model
                            and tuple(unique_child_pks) == normalized_pks
                        ):
                            raise RuntimeError(
                                "TRUE_SELF_RESTRICT_CYCLE "
                                f"company={cid} model={label} "
                                f"pk_count={len(unique_child_pks)}"
                            ) from exc

                        safe_delete_queryset(
                            child_model,
                            child_model._default_manager.filter(
                                pk__in=unique_child_pks
                            ),
                            cid,
                            f"RESTRICT_CHILD_OF:{label}",
                        )

                    continue

            finally:
                active_signatures.pop()

    def owned_models_for_company(cid):
        rows = []
        do_nothing_blockers = []

        for model in M["apps"].get_models():
            if (
                not model._meta.managed
                or model._meta.proxy
                or model is Company
            ):
                continue

            for field, delete_name in company_fk_contracts(model):
                count = model._default_manager.filter(
                    **{field.attname: cid}
                ).count()

                if not count:
                    continue

                if delete_name in {"CASCADE", "PROTECT", "RESTRICT"}:
                    rows.append(
                        (model, field, delete_name, count)
                    )
                elif delete_name == "DO_NOTHING":
                    do_nothing_blockers.append(
                        f"{mlabel(model)}.{field.name}={count}"
                    )

        if do_nothing_blockers:
            raise RuntimeError(
                "FULL_EXCLUSION_DO_NOTHING_BLOCKERS "
                f"company={cid} blockers={do_nothing_blockers}"
            )

        rows.sort(
            key=lambda x: (
                0 if x[2] in {"PROTECT", "RESTRICT"} else 1,
                -x[3],
                mlabel(x[0]),
                x[1].name,
            )
        )
        return rows

    deleted_companies = 0
    per_company_summary = {}

    for index, cid in enumerate(ids, 1):
        progress(
            f"[TX] full exclusions purge: Company "
            f"{index}/{len(ids)} current_id={cid} dependency scan"
        )

        company = Company.objects.filter(pk=cid).first()
        if company is None:
            raise RuntimeError(
                f"Full excluded Company missing before purge current_id={cid}"
            )

        contracts = owned_models_for_company(cid)

        progress(
            f"[TX] full exclusion company={cid} "
            f"owned_company_contracts={len(contracts)}"
        )

        summary = defaultdict(int)

        for model, field, delete_name, _count in contracts:
            qs = model._default_manager.filter(
                **{field.attname: cid}
            )
            remaining = qs.count()

            if not remaining:
                continue

            progress(
                f"[TX] full exclusion company={cid} "
                f"purge {mlabel(model)}.{field.name} "
                f"on_delete={delete_name} rows={remaining}"
            )

            safe_delete_queryset(
                model,
                qs,
                cid,
                f"DIRECT_COMPANY_{delete_name}",
            )

            after = model._default_manager.filter(
                **{field.attname: cid}
            ).count()

            if after:
                raise RuntimeError(
                    "Full exclusion owned rows remain "
                    f"company={cid} model={mlabel(model)} "
                    f"field={field.name} rows={after}"
                )

            summary[
                f"{mlabel(model)}.{field.name}"
            ] += remaining

        progress(
            f"[TX] full exclusion company={cid} "
            "owned rows cleared; deleting Company row"
        )

        try:
            company.delete()
        except (ProtectedError, RestrictedError) as exc:
            if isinstance(exc, ProtectedError):
                objs = list(exc.protected_objects)
            else:
                objs = flatten_restricted(
                    getattr(exc, "restricted_objects", None)
                )

            sample = [
                f"{mlabel(o.__class__)}:{o.pk}"
                for o in objs[:30]
                if hasattr(o, "_meta")
            ]

            raise RuntimeError(
                "FULL_EXCLUSION_UNCOVERED_DEPENDENCY "
                f"company={cid} sample={sample}"
            ) from exc

        deleted_companies += 1
        per_company_summary[str(cid)] = dict(summary)

        progress(
            f"[TX] full exclusions purge: Company "
            f"{index}/{len(ids)} current_id={cid} PASS"
        )

    if deleted_companies != 7:
        raise RuntimeError(
            f"full company deletes {deleted_companies} != 7"
        )

    progress(
        f"[TX] full exclusions purge: done companies={deleted_companies}"
    )

    return {
        "deleted_company_count": deleted_companies,
        "per_company_owned_contracts": per_company_summary,
    }

def move_maps(M,C,T):
    L,CT=M['LegacyObjectMap'],M['ContentType']
    source_company_ids=sorted({int(x) for x in C['company_ids'].values()})
    source_company_id_set=set(source_company_ids)
    destination_company_ids=sorted({
        int(obj.id)
        for obj in T.values()
        if int(obj.id) not in source_company_id_set
    })

    if len(destination_company_ids)!=39:
        raise RuntimeError(
            f'LegacyObjectMap destination Company count '
            f'{len(destination_company_ids)} != 39'
        )

    total=0
    model_specs=[
        M['Branch'],
        M['Warehouse'],
        M['InventoryLocation'],
        M['StockItem'],
        M['StockMovement'],
        M['PurchaseBill'],
        M['PurchaseBillItem'],
        M['SalesInvoice'],
        M['SalesInvoiceItem'],
        M['SalesReturn'],
        M['CustomerPayment'],
    ]

    progress(
        f'[TX] LegacyObjectMap rehome: BATCHED_INDEXED start '
        f'destination_companies={len(destination_company_ids)}'
    )

    for model in model_specs:
        rf=rels(model,M['Company'])
        if len(rf)!=1:
            progress(
                f'[TX] LegacyObjectMap {model._meta.label}: '
                f'skip company_fk_count={len(rf)}'
            )
            continue

        company_field=rf[0]
        ct=CT.objects.get_for_model(model)
        scanned=0
        changed=0
        progress(f'[TX] LegacyObjectMap {model._meta.label}: start')

        for destination_company_id in destination_company_ids:
            ids_qs=(
                model._default_manager
                .filter(**{company_field.attname:destination_company_id})
                .order_by('pk')
                .values_list('pk',flat=True)
            )

            batch=[]
            for object_id in ids_qs.iterator(chunk_size=5000):
                scanned+=1
                batch.append(str(object_id))

                if len(batch)>=2000:
                    n=(
                        L.objects
                        .filter(
                            source_system=SRC,
                            target_content_type=ct,
                            company_id__in=source_company_ids,
                            target_object_id__in=batch,
                        )
                        .exclude(company_id=destination_company_id)
                        .update(company_id=destination_company_id)
                    )
                    changed+=n
                    total+=n
                    batch=[]

                if scanned%50000==0:
                    progress(
                        f'[TX] LegacyObjectMap {model._meta.label}: '
                        f'scanned={scanned} maps_updated={changed}'
                    )

            if batch:
                n=(
                    L.objects
                    .filter(
                        source_system=SRC,
                        target_content_type=ct,
                        company_id__in=source_company_ids,
                        target_object_id__in=batch,
                    )
                    .exclude(company_id=destination_company_id)
                    .update(company_id=destination_company_id)
                )
                changed+=n
                total+=n

        progress(
            f'[TX] LegacyObjectMap {model._meta.label}: '
            f'done scanned={scanned} maps_updated={changed}'
        )

    progress(
        f'[TX] LegacyObjectMap rehome: complete total_maps_updated={total}'
    )
    return total

def users(M,plan):
    from django.db.models import Count

    candidates=[
        int(x)
        for x in plan['user_deletion']['candidate_current_user_ids_snapshot']
    ]
    U,CM,LOM,CT=(
        M['User'],
        M['CompanyMembership'],
        M['LegacyObjectMap'],
        M['ContentType'],
    )
    ct=CT.objects.get_for_model(U)

    kept=defaultdict(dict)
    deleted=[]

    progress(
        f'[TX] orphan User dependency scan: start candidates={len(candidates)}'
    )

    membership_counts=Counter(
        CM.objects
        .filter(user_id__in=candidates)
        .values_list('user_id',flat=True)
    )
    for uid,count in membership_counts.items():
        kept[int(uid)]['accounts.CompanyMembership']=int(count)

    dependency_candidates=[
        uid for uid in candidates
        if uid not in membership_counts
    ]

    relation_count=0
    for mo in M['apps'].get_models():
        if (
            not mo._meta.managed
            or mo._meta.proxy
            or mo is U
            or mlabel(mo) in {
                'accounts.CompanyMembership',
                'accounts.UserProfile',
            }
        ):
            continue

        for f,t in fks(mo):
            if t is not U:
                continue

            relation_count+=1
            try:
                rows=(
                    mo._default_manager
                    .filter(**{f'{f.attname}__in':dependency_candidates})
                    .values(f.attname)
                    .annotate(n=Count('pk'))
                )
                for row in rows:
                    uid=int(row[f.attname])
                    kept[uid][f'{mlabel(mo)}.{f.name}']=int(row['n'])
            except Exception as exc:
                raise RuntimeError(
                    f'User dependency scan failed '
                    f'{mlabel(mo)}.{f.name}: '
                    f'{type(exc).__name__}: {exc}'
                ) from exc

            if relation_count%25==0:
                progress(
                    f'[TX] orphan User dependency scan: '
                    f'user_fk_relations_checked={relation_count}'
                )

    progress(
        f'[TX] orphan User dependency scan: '
        f'complete relations={relation_count} '
        f'users_with_dependencies={len(kept)}'
    )

    for index,uid in enumerate(candidates,1):
        if uid in kept:
            continue

        LOM.objects.filter(
            target_content_type=ct,
            target_object_id=str(uid),
        ).delete()

        q=U.objects.filter(pk=uid).first()
        if q:
            q.delete()
            deleted.append(uid)

        if index%10==0:
            progress(
                f'[TX] orphan User deletion: '
                f'processed={index}/{len(candidates)} deleted={len(deleted)}'
            )

    progress(
        f'[TX] orphan User deletion: complete '
        f'deleted={len(deleted)} kept={len(kept)}'
    )
    return deleted,dict(kept)

def same_company(M):
    from django.db.models import F
    progress('[TX] strict same-company verification: start')
    checks=[('Warehouse.branch',M['Warehouse'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('InventoryLocation.warehouse',M['InventoryLocation'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockItem.warehouse',M['StockItem'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockItem.location',M['StockItem'].objects.exclude(company_id=F('location__company_id')).count()),('StockItem.item',M['StockItem'].objects.exclude(company_id=F('item__company_id')).count()),('StockMovement.warehouse',M['StockMovement'].objects.exclude(company_id=F('warehouse__company_id')).count()),('StockMovement.item',M['StockMovement'].objects.exclude(company_id=F('item__company_id')).count()),('PurchaseBill.branch',M['PurchaseBill'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('PurchaseBill.supplier',M['PurchaseBill'].objects.exclude(company_id=F('supplier__company_id')).count()),('PurchaseBillItem.bill',M['PurchaseBillItem'].objects.exclude(company_id=F('bill__company_id')).count()),('PurchaseBillItem.item',M['PurchaseBillItem'].objects.exclude(company_id=F('item__company_id')).count()),('SalesInvoice.branch',M['SalesInvoice'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('SalesInvoice.customer',M['SalesInvoice'].objects.filter(customer_id__isnull=False).exclude(company_id=F('customer__company_id')).count()),('SalesInvoiceItem.invoice',M['SalesInvoiceItem'].objects.exclude(company_id=F('invoice__company_id')).count()),('SalesInvoiceItem.catalog',M['SalesInvoiceItem'].objects.filter(catalog_item_id__isnull=False).exclude(company_id=F('catalog_item__company_id')).count()),('SalesReturn.branch',M['SalesReturn'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('SalesReturn.customer',M['SalesReturn'].objects.filter(customer_id__isnull=False).exclude(company_id=F('customer__company_id')).count()),('SalesReturn.invoice',M['SalesReturn'].objects.exclude(company_id=F('invoice__company_id')).count()),('CustomerPayment.branch',M['CustomerPayment'].objects.filter(branch_id__isnull=False).exclude(company_id=F('branch__company_id')).count()),('CustomerPayment.invoice',M['CustomerPayment'].objects.filter(sales_invoice_id__isnull=False).exclude(company_id=F('sales_invoice__company_id')).count()),('CustomerPayment.treasury',M['CustomerPayment'].objects.exclude(company_id=F('treasury_account__company_id')).count()),('CustomerPayment.account',M['CustomerPayment'].objects.filter(counterparty_account_id__isnull=False).exclude(company_id=F('counterparty_account__company_id')).count())]
    bad={k:v for k,v in checks if v}
    conn=M['connection'];qn=conn.ops.quote_name;cp=qn(M['CustomerPayment']._meta.db_table);bp=qn(M['BusinessParty']._meta.db_table)
    with conn.cursor() as cur:
        for col in ['customer_id','counterparty_id']:
            cur.execute(f'SELECT COUNT(*) FROM {cp} c JOIN {bp} b ON b.id=c.{qn(col)} WHERE c.{qn(col)} IS NOT NULL AND c.company_id IS DISTINCT FROM b.company_id');n=int(cur.fetchone()[0]);
            if n:bad[f'CustomerPayment.{col}']=n
    if bad:raise RuntimeError(f'same-company errors {bad}')
    progress('[TX] strict same-company verification: PASS')

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
    same_company(M)
    progress('[TX] database constraint verification: start')
    M['connection'].check_constraints()
    progress('[TX] database constraint verification: PASS')

def transform(M,C,manifest,plan,base,rehearsal):
    neg=TempPk();conn=M['connection'];mode='REHEARSAL' if rehearsal else 'APPLY'
    progress(f'[TX {mode}] 1/13 lock source scope')
    with conn.cursor() as cur:cur.execute('SET LOCAL statement_timeout=0');cur.execute("SET LOCAL lock_timeout='15s'");cur.execute('SELECT pg_advisory_xact_lock(%s)',[LOCK])
    list(M['Company'].objects.select_for_update().filter(id__in=list(C['company_ids'].values())).values_list('id',flat=True));list(M['Branch'].objects.select_for_update().filter(id__in=list(C['pair_by_branch'])).values_list('id',flat=True))
    stats={'full_excluded_subscription_rows':M['CompanySubscription'].objects.filter(company_id__in=C['fullc']).count()}
    progress(f'[TX {mode}] 2/13 create/relabel Companies');T=make_targets(M,C,manifest,rehearsal,neg)
    progress(f'[TX {mode}] 3/13 clone foundation masters (5524)');F=foundation(M,C,T,manifest,rehearsal,neg);progress(f'[TX {mode}] 3/13 foundation complete')
    progress(f'[TX {mode}] 4/13 clone usage masters (43891)');U=usage_clone(M,C,T,F,manifest,rehearsal,neg)
    progress(f'[TX {mode}] 5/13 reparent Branch rows before access policies');reparent(M,C,T,manifest)
    progress(f'[TX {mode}] 6/13 memberships + branch access');stats['membership_clones'],stats['membership_deletes']=memberships(M,C,T,plan,rehearsal,neg)
    progress(f'[TX {mode}] 7/13 UserProfile defaults');profiles(M,T,plan)
    progress(f'[TX {mode}] 8/13 clone subscriptions (39)');subscriptions(M,T,plan,rehearsal,neg)
    progress(f'[TX {mode}] 9/13 operational remap');stats['ops']=ops(M,C,T,U)
    progress(f'[TX {mode}] 10/13 CustomerPayment remap');stats['payments_moved'],part,full=payments(M,C,T,F,U)
    progress(f'[TX {mode}] 11/13 LegacyObjectMap rehome');stats['maps_moved']=move_maps(M,C,T)
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
    a=args()
    committed=False
    lines=[
        '='*120,
        'PRIMEYACC — COMPANY SPLIT FINAL APPLY-ONLY V1',
        '='*120,
        f'GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}',
        f'ROOT={ROOT}',
        'MODE=FINAL_APPLY_ONLY',
        'FULL_REHEARSAL_RERUN=NO',
        f'RESTORE_V2_26C={"YES" if a.restore_v2_26c else "NO"}',
        'GIT_PUSH=0',
        ''
    ]

    try:
        print('[APPLY-ONLY] 1/6 Validating frozen chain + Remaining-only PASS gate...',flush=True)

        for p,h,n in [
            (M2,SHAS['m2'],'Manifest v2'),
            (A9,SHAS['a9'],'A9'),
            (A10R,SHAS['a10r'],'A10 V5 report'),
            (PLANF,SHAS['plan'],'A10 V5 plan'),
            (A10ER,SHAS['a10er'],'A10E report'),
            (A10EP,SHAS['a10ep'],'A10E policy'),
            (A6C,SHAS['a6c'],'A6C'),
            (A6D,SHAS['a6d'],'A6D'),
            (A6E,SHAS['a6e'],'A6E'),
        ]:
            req(p,h,n)

        req(
            REMAINING_GATE,
            REMAINING_GATE_SHA256,
            'Remaining-only V2 PASS report',
        )

        gate=REMAINING_GATE.read_text(
            encoding='utf-8',
            errors='replace',
        )
        for tok in [
            'SELF_REFERENTIAL_PROTECT=LEAF_FIRST_PASS',
            'FULL_EXCLUSION_PURGE=PASS',
            'DIRECT_COMPANY_FK_RESIDUALS=0',
            'DATABASE_CONSTRAINTS_INSIDE_TX=PASS',
            'ROLLBACK=PASS',
            'BASELINE_RESTORED_SHA256=9B47BF2F6CF89C8F1E6353E81BAEDB8109E3FE1527C96C22DBE06BF188E4B3E3',
            'REMAINING_ONLY_RESULT=PASS',
            'FULL_REHEARSAL_RERUN_REQUIRED=NO',
            'NEXT_STAGE=FINAL_APPLY_ONLY_WITH_IN_TRANSACTION_VERIFICATION',
            'DATABASE_PERMANENT_WRITES=0',
        ]:
            if tok not in gate:
                raise RuntimeError(
                    f'Remaining-only PASS token missing: {tok}'
                )

        if git('branch','--show-current')!='main':
            raise RuntimeError('Expected main')
        if (
            git('rev-parse','HEAD')!=HEAD
            or git('rev-parse','origin/main')!=HEAD
        ):
            raise RuntimeError('HEAD/origin drift')
        if git('status','--short','--untracked-files=no'):
            raise RuntimeError(
                'Tracked worktree must be clean before final apply'
            )
        if git('rev-parse','stash@{0}')!=STASH:
            raise RuntimeError('V2-26C stash drift')

        t=A10R.read_text(
            encoding='utf-8',
            errors='replace',
        )
        for tok in [
            'FOUNDATION_CLONE_ACTION_COUNT=5524',
            'USAGE_MASTER_CLONE_ACTION_COUNT=43891',
            'OPERATIONAL_ROUTE_ROW_COUNT=961753',
            'CUSTOMER_PAYMENT_ROW_COUNT=367272',
            'USER_DELETE_CANDIDATE_COUNT=47',
            'CUSTOMER_PAYMENT_PARTY_CLONE_COVERAGE_ERROR_COUNT=0',
            'FINANCIAL_MASTER_BALANCE_RISK_COUNT=1',
            'A10_RESULT=REVIEW_REQUIRED',
        ]:
            if tok not in t:
                raise RuntimeError(
                    f'A10 frozen token missing {tok}'
                )

        te=A10ER.read_text(
            encoding='utf-8',
            errors='replace',
        )
        for tok in [
            'A10E_RESULT=PASS',
            'BALANCE_OWNER_GROUP=88-G01',
            'CLONE_88_G02_OPENING_BALANCE=0.00',
            'NO_DUPLICATION_CHECK=PASS',
        ]:
            if tok not in te:
                raise RuntimeError(
                    f'A10E token missing {tok}'
                )

        lines += [
            '===== PASSED REHEARSAL EVIDENCE =====',
            f'REMAINING_GATE={REMAINING_GATE.name}',
            f'REMAINING_GATE_SHA256={sha(REMAINING_GATE)}',
            'FULL_REHEARSAL_RERUN_REQUIRED=NO',
            'FULL_EXCLUSION_LEAF_SAFE_GATE=PASS',
            ''
        ]

        print('[APPLY-ONLY] 2/6 Building Manifest v3 + exact final preflight...',flush=True)

        m2=json.loads(
            M2.read_text(encoding='utf-8')
        )
        pol=json.loads(
            A10EP.read_text(encoding='utf-8')
        )
        plan=json.loads(
            PLANF.read_text(encoding='utf-8')
        )
        M=load_models()

        if M['Company'].objects.filter(
            extra_data__primey_company_split__manifest='v3'
        ).exists():
            raise RuntimeError(
                'Company split v3 already appears applied; '
                'DO NOT rerun apply-only'
            )

        provisional=copy.deepcopy(m2)
        C=context(M,provisional,plan)

        special_routes=stable_special_routes(M,C)
        manifest=build_m3(
            m2,
            pol,
            special_routes,
        )

        M3.write_text(
            json.dumps(
                manifest,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )+'\n',
            encoding='utf-8',
        )
        m3sha=sha(M3)

        if (
            manifest['customer_payment_contract'].get(
                'special_legacy_payment_route_count'
            )
            != 412
        ):
            raise RuntimeError(
                'Manifest v3 special route count is not 412'
            )

        C=context(M,manifest,plan)
        base=baseline(M,C)

        baseline_hash=hashlib.sha256(
            json.dumps(
                base,
                sort_keys=True,
                default=str,
            ).encode()
        ).hexdigest().upper()

        progress(
            f'[APPLY-ONLY] baseline guard hash={baseline_hash}'
        )

        expected_baseline=(
            '9B47BF2F6CF89C8F1E6353E81BAEDB8109E3FE1527C96C22DBE06BF188E4B3E3'
        )
        if baseline_hash!=expected_baseline:
            raise RuntimeError(
                f'Baseline drift expected={expected_baseline} '
                f'actual={baseline_hash}'
            )

        if (
            base['mapped_companies']!=319
            or base['mapped_branches']!=450
        ):
            raise RuntimeError(
                f'baseline maps '
                f'{base["mapped_companies"]}/'
                f'{base["mapped_branches"]}'
            )

        cg,pg=usage_groups(M,C,manifest)
        uc=(
            sum(
                sum(
                    1
                    for g in gs
                    if g!=C['src_group'].get(l)
                )
                for (l,_),gs in cg.items()
            )
            +
            sum(
                sum(
                    1
                    for g in gs
                    if g!=C['src_group'].get(l)
                )
                for (l,_),gs in pg.items()
            )
        )
        if uc!=43891:
            raise RuntimeError(
                f'preflight usage count {uc}'
            )

        route_total=sum(
            M[mn].objects.filter(
                company_id__in=list(
                    C['company_ids'].values()
                )
            ).count()
            for mn in [
                'Warehouse',
                'PurchaseBill',
                'SalesInvoice',
                'SalesReturn',
                'InventoryLocation',
                'StockItem',
                'StockMovement',
                'PurchaseBillItem',
                'SalesInvoiceItem',
            ]
        )
        if route_total!=961753:
            raise RuntimeError(
                f'route rows {route_total}'
            )

        cp=M['CustomerPayment'].objects.filter(
            company_id__in=list(
                C['company_ids'].values()
            )
        ).count()
        if cp!=367272:
            raise RuntimeError(
                f'payment scope {cp}'
            )

        static_checks()

        lines += [
            '===== FINAL APPLY PREFLIGHT =====',
            f'MANIFEST_V3_SHA256={m3sha}',
            f'SPECIAL_LEGACY_PAYMENT_ROUTES={len(special_routes)}',
            'SPECIAL_PAYMENT_ROUTE_IDENTITY=mhamcloud_v1.transaction_payments:(LEGACY_COMPANY_ID,LEGACY_PAYMENT_ID)',
            f'USAGE_MASTER_CLONES={uc}',
            f'OPERATIONAL_ROUTE_ROWS={route_total}',
            f'CUSTOMER_PAYMENT_ROWS={cp}',
            'FINANCIAL_POLICY=88-G01:24.00;88-G02:0.00',
            f'BASELINE_SHA256={baseline_hash}',
            'FINAL_APPLY_PREFLIGHT=PASS',
            ''
        ]

        print(
            '[APPLY-ONLY] 3/6 Applying transformation ONCE; '
            'verification must pass before transaction commit...',
            flush=True,
        )

        # IMPORTANT:
        # No rehearsal here. This is the one permanent execution.
        # transform(..., rehearsal=False) performs its full phase 13
        # integrity verification before this atomic() block can commit.
        with M['transaction'].atomic():
            astats=transform(
                M,
                C,
                manifest,
                plan,
                base,
                False,
            )

        committed=True

        print(
            '[APPLY-ONLY] 4/6 Commit completed; running post-commit verification...',
            flush=True,
        )

        static_checks()
        same_company(M)

        # Exact final cardinalities / provenance checks after commit.
        final_company_count=M['Company'].objects.count()
        final_branch_count=M['Branch'].objects.count()
        mapped_business_count=(
            M['LegacyObjectMap'].objects.filter(
                source_system=SRC,
                source_table='business',
            ).count()
        )
        mapped_branch_count=(
            M['LegacyObjectMap'].objects.filter(
                source_system=SRC,
                source_table='business_locations',
            ).count()
        )
        split_provenance_count=(
            M['Company'].objects.filter(
                extra_data__primey_company_split__manifest='v3'
            ).count()
        )

        if final_company_count!=351:
            raise RuntimeError(
                f'Post-commit Company count '
                f'{final_company_count} != 351'
            )
        if final_branch_count!=415:
            raise RuntimeError(
                f'Post-commit Branch count '
                f'{final_branch_count} != 415'
            )
        if mapped_business_count!=312:
            raise RuntimeError(
                f'Post-commit canonical business maps '
                f'{mapped_business_count} != 312'
            )
        if mapped_branch_count!=415:
            raise RuntimeError(
                f'Post-commit branch maps '
                f'{mapped_branch_count} != 415'
            )
        if split_provenance_count!=39:
            raise RuntimeError(
                f'Post-commit split provenance '
                f'{split_provenance_count} != 39'
            )

        post={
            'manifest_v3_sha256':m3sha,
            'remaining_gate_sha256':sha(REMAINING_GATE),
            'company_count':final_company_count,
            'branch_count':final_branch_count,
            'mapped_business_count':mapped_business_count,
            'mapped_branch_count':mapped_branch_count,
            'split_provenance_count':split_provenance_count,
            'stats':astats,
        }
        SNAP.write_text(
            json.dumps(
                post,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
                default=str,
            )+'\n',
            encoding='utf-8',
        )

        lines += [
            '===== PERMANENT APPLY =====',
            'PERMANENT_APPLY=PASS',
            'IN_TRANSACTION_VERIFY=PASS',
            f'APPLY_STATS_SHA256={hashlib.sha256(json.dumps(astats,sort_keys=True,default=str).encode()).hexdigest().upper()}',
            f'GLOBAL_USERS_DELETED={len(astats["users_deleted"])}',
            f'GLOBAL_USERS_KEPT_DUE_DEPENDENCIES={len(astats["users_kept"])}',
            f'FINAL_COMPANY_COUNT={final_company_count}',
            f'FINAL_BRANCH_COUNT={final_branch_count}',
            f'CANONICAL_BUSINESS_MAPS={mapped_business_count}',
            f'CANONICAL_BRANCH_MAPS={mapped_branch_count}',
            f'SPLIT_PROVENANCE_NEW_COMPANIES={split_provenance_count}',
            'POST_COMMIT_VERIFY=PASS',
            f'APPLY_SNAPSHOT_SHA256={sha(SNAP)}',
            ''
        ]

        if a.restore_v2_26c:
            print(
                '[APPLY-ONLY] 5/6 Restoring protected V2-26C worktree...',
                flush=True,
            )
            n=restore_stash()
            lines += [
                'V2_26C_STASH_APPLY=PASS',
                f'V2_26C_RESTORED_FILES={n}',
                'V2_26C_BYTE_HASH_VERIFY=PASS',
                'V2_26C_STASH_RETAINED=YES',
                ''
            ]
        else:
            print(
                '[APPLY-ONLY] 5/6 V2-26C restore skipped...',
                flush=True,
            )
            lines += [
                'V2_26C_STASH_APPLY=SKIPPED',
                ''
            ]

        print(
            '[APPLY-ONLY] 6/6 Writing final closure report...',
            flush=True,
        )

        lines += [
            '===== FINAL CLOSURE =====',
            f'HEAD={git("rev-parse","HEAD")}',
            f'ORIGIN_MAIN={git("rev-parse","origin/main")}',
            f'TRACKED_STATUS_AFTER={c(git("status","--short","--untracked-files=no"))}',
            'GIT_PUSH=0',
            'DATABASE_TRANSFORMATION=COMMITTED',
            'LOCAL_COMPANY_SPLIT=FINAL_CLOSED',
            'PRODUCTION_CUTOVER_CONTRACT=MANIFEST_V3',
            'FULL_REHEARSAL_RERUN=NO',
            'FINAL_RESULT=PASS_APPLIED',
            '='*120
        ]

        REPORT.write_text(
            '\n'.join(lines)+'\n',
            encoding='utf-8',
        )

        print(
            '===== PRIMEYACC COMPANY SPLIT FINAL APPLY-ONLY V1 ====='
        )
        print('FINAL_RESULT=PASS_APPLIED')
        print('LOCAL_COMPANY_SPLIT=FINAL_CLOSED')
        print(f'MANIFEST_V3_SHA256={m3sha}')
        print(f'FINAL_COMPANY_COUNT={final_company_count}')
        print(f'FINAL_BRANCH_COUNT={final_branch_count}')
        print(
            f'GLOBAL_USERS_DELETED='
            f'{len(astats["users_deleted"])}'
        )
        print(
            f'GLOBAL_USERS_KEPT_DUE_DEPENDENCIES='
            f'{len(astats["users_kept"])}'
        )
        print(
            f'V2_26C_RESTORED='
            f'{"YES" if a.restore_v2_26c else "NO"}'
        )
        print('GIT_PUSH=0')
        print(f'REPORT={REPORT.name}')
        print(f'REPORT_SHA256={sha(REPORT)}')
        print(f'APPLY_SNAPSHOT_SHA256={sha(SNAP)}')
        return 0

    except KeyboardInterrupt:
        # If KeyboardInterrupt occurs before atomic() commits, Django rolls back.
        # If it occurs after committed=True, the DB transformation is permanent.
        result=(
            'APPLIED_WITH_POST_STEP_INTERRUPTION'
            if committed
            else 'INTERRUPTED_BEFORE_COMMIT'
        )
        lines += [
            '='*120,
            f'FINAL_RESULT={result}',
            f'DATABASE_TRANSFORMATION={"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}',
            'GIT_PUSH=0',
            '='*120
        ]
        REPORT.write_text(
            '\n'.join(lines)+'\n',
            encoding='utf-8',
        )
        print(f'FINAL_RESULT={result}')
        print(
            f'DATABASE_TRANSFORMATION='
            f'{"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}'
        )
        print('GIT_PUSH=0')
        print(f'REPORT={REPORT.name}')
        print(f'REPORT_SHA256={sha(REPORT)}')
        return 130

    except Exception as e:
        result=(
            'APPLIED_WITH_POST_STEP_ERROR'
            if committed
            else 'FAIL_BEFORE_COMMIT'
        )
        lines += [
            '='*120,
            f'FINAL_RESULT={result}',
            f'ERROR_TYPE={type(e).__name__}',
            f'ERROR={c(e)}',
            f'DATABASE_TRANSFORMATION={"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}',
            'GIT_PUSH=0',
            '='*120
        ]
        REPORT.write_text(
            '\n'.join(lines)+'\n',
            encoding='utf-8',
        )
        print(
            '===== PRIMEYACC COMPANY SPLIT FINAL APPLY-ONLY V1 ====='
        )
        print(f'FINAL_RESULT={result}')
        print(
            f'ERROR={type(e).__name__}: {e}'
        )
        print(
            f'DATABASE_TRANSFORMATION='
            f'{"COMMITTED_DO_NOT_RERUN" if committed else "NOT_COMMITTED"}'
        )
        print('GIT_PUSH=0')
        print(f'REPORT={REPORT.name}')
        print(f'REPORT_SHA256={sha(REPORT)}')
        return 3 if committed else 2

if __name__=='__main__': raise SystemExit(main())
