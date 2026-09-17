from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("accounts","0001_initial"),("companies","0006_company_onboarding_lifecycle")]
    operations = [
        migrations.CreateModel(
            name="CompanyMembershipBranchPolicy",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("mode",models.CharField(choices=[("LEGACY_UNRESOLVED","Legacy unresolved"),("ALL","All branches"),("RESTRICTED","Restricted branches")],db_index=True,default="LEGACY_UNRESOLVED",max_length=30)),
                ("extra_data",models.JSONField(blank=True,default=dict)),
                ("created_at",models.DateTimeField(auto_now_add=True,db_index=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("default_branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="default_for_membership_policies",to="companies.branch")),
                ("last_active_branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name="last_active_for_membership_policies",to="companies.branch")),
                ("membership",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="branch_policy",to="accounts.companymembership")),
            ],
        ),
        migrations.CreateModel(
            name="CompanyMembershipBranchGrant",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("permissions",models.JSONField(blank=True,default=list)),
                ("extra_data",models.JSONField(blank=True,default=dict)),
                ("created_at",models.DateTimeField(auto_now_add=True,db_index=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("branch",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="membership_access_grants",to="companies.branch")),
                ("policy",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="branch_grants",to="accounts.companymembershipbranchpolicy")),
            ],
        ),
        migrations.AddIndex(model_name="companymembershipbranchpolicy",index=models.Index(fields=["mode"],name="accounts_co_mode_4dfefd_idx")),
        migrations.AddIndex(model_name="companymembershipbranchpolicy",index=models.Index(fields=["membership","mode"],name="accounts_co_members_c7ddd5_idx")),
        migrations.AddIndex(model_name="companymembershipbranchgrant",index=models.Index(fields=["branch"],name="accounts_co_branch__aa4e37_idx")),
        migrations.AddIndex(model_name="companymembershipbranchgrant",index=models.Index(fields=["policy","branch"],name="accounts_co_policy__0a9c4c_idx")),
        migrations.AddConstraint(model_name="companymembershipbranchgrant",constraint=models.UniqueConstraint(fields=("policy","branch"),name="unique_membership_branch_grant")),
    ]
