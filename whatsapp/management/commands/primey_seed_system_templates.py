from django.core.management.base import BaseCommand, CommandError
from companies.models import Company
from whatsapp.models import WhatsAppTemplate, WhatsAppTemplateStatus
from whatsapp.services import SYSTEM_WHATSAPP_READY_TEMPLATES, SYSTEM_WHATSAPP_TEMPLATE_COMPANY_CODE, seed_system_whatsapp_ready_templates
class Command(BaseCommand):
    help="Seed Primey system communication templates idempotently."
    def add_arguments(self,p):
        p.add_argument("--check",action="store_true"); p.add_argument("--dry-run",action="store_true"); p.add_argument("--force-system-defaults",action="store_true")
    def handle(self,*args,**o):
        catalog={x["code"].upper():x for x in SYSTEM_WHATSAPP_READY_TEMPLATES}
        if len(catalog)!=len(SYSTEM_WHATSAPP_READY_TEMPLATES): raise CommandError("Duplicate system template codes.")
        company=Company.objects.filter(company_code=SYSTEM_WHATSAPP_TEMPLATE_COMPANY_CODE).first()
        existing={} if company is None else {x.code:x for x in WhatsAppTemplate.objects.filter(company=company,code__in=catalog)}
        missing=set(catalog)-set(existing); changed=[]
        for code,t in existing.items():
            x=catalog[code]
            if t.name!=x["name_ar"] or t.body!=x["body_ar"] or t.variables!=x["variables"] or t.metadata!=x["metadata"] or t.language!="ar" or t.status!=WhatsAppTemplateStatus.ACTIVE: changed.append(code)
        if o["check"]:
            if missing or changed: raise CommandError(f"System template drift: missing={len(missing)} changed={len(changed)}")
            self.stdout.write(self.style.SUCCESS(f"SYSTEM_TEMPLATE_CHECK=PASS TOTAL={len(catalog)}")); return
        if o["dry_run"]:
            self.stdout.write(f"SYSTEM_TEMPLATE_DRY_RUN=YES TOTAL={len(catalog)} CREATE={len(missing)} UPDATE={len(changed)}"); return
        r=seed_system_whatsapp_ready_templates()
        self.stdout.write(self.style.SUCCESS(f"SYSTEM_TEMPLATE_SEED=PASS TOTAL={r['total_count']} CREATED={r['created_count']} UPDATED={r['updated_count']}"))
