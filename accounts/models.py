# ============================================================
# 📂 accounts/models.py
# 🧠 PrimeyAcc | Accounts Models V1.1
# ------------------------------------------------------------
# ✅ User Profile
# ✅ Workspace Type Foundation
# ✅ Company Membership
# ✅ Company Role Basics
# ✅ System / Company Access Separation
# ✅ Multi-company User Support
# ✅ Fixed Company Access Resolver
# ✅ Audit Fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User = حساب دخول فقط
# - UserProfile = ملف المستخدم العام داخل PrimeyAcc
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - /system لا يفتح إلا لمستخدم نظام مصرح
# - /company لا يفتح إلا بعضوية شركة فعالة
# - لا يتم الوصول لبيانات شركة إلا عبر CompanyMembership فعال
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company, CompanyStatus


class WorkspaceType(models.TextChoices):
    SYSTEM = "SYSTEM", "System"
    COMPANY = "COMPANY", "Company"


class UserProfileStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INVITED = "INVITED", "Invited"
    SUSPENDED = "SUSPENDED", "Suspended"
    INACTIVE = "INACTIVE", "Inactive"


class SystemRole(models.TextChoices):
    NONE = "NONE", "None"
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    SYSTEM_ADMIN = "SYSTEM_ADMIN", "System Admin"
    SUPPORT = "SUPPORT", "Support"
    BILLING_MANAGER = "BILLING_MANAGER", "Billing Manager"


class CompanyRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    MANAGER = "MANAGER", "Manager"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"
    CASHIER = "CASHIER", "Cashier"
    SALES = "SALES", "Sales"
    INVENTORY = "INVENTORY", "Inventory"
    HR = "HR", "HR"
    EMPLOYEE = "EMPLOYEE", "Employee"
    VIEWER = "VIEWER", "Viewer"


class MembershipStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INVITED = "INVITED", "Invited"
    SUSPENDED = "SUSPENDED", "Suspended"
    INACTIVE = "INACTIVE", "Inactive"


class UserProfile(models.Model):
    """
    Global PrimeyAcc user profile.

    Django User remains the authentication account.
    UserProfile stores workspace preferences and system-level access.
    Company access is not stored here; it is controlled by CompanyMembership.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="primeyacc_profile",
        verbose_name="User",
    )

    display_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Display name",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone",
    )
    mobile = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Mobile",
    )
    whatsapp_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp number",
    )

    status = models.CharField(
        max_length=30,
        choices=UserProfileStatus.choices,
        default=UserProfileStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    default_workspace = models.CharField(
        max_length=30,
        choices=WorkspaceType.choices,
        default=WorkspaceType.COMPANY,
        db_index=True,
        verbose_name="Default workspace",
    )

    system_role = models.CharField(
        max_length=40,
        choices=SystemRole.choices,
        default=SystemRole.NONE,
        db_index=True,
        verbose_name="System role",
    )

    default_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="default_users",
        verbose_name="Default company",
    )

    is_system_user = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="System user",
        help_text="Allows access to /system when combined with an allowed system role.",
    )

    language = models.CharField(
        max_length=10,
        default="ar",
        verbose_name="Language",
    )
    timezone = models.CharField(
        max_length=100,
        default="Asia/Riyadh",
        verbose_name="Timezone",
    )

    last_seen_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last seen at",
    )
    suspended_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Suspended at",
    )
    suspended_reason = models.TextField(
        blank=True,
        verbose_name="Suspended reason",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "User profile"
        verbose_name_plural = "User profiles"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "default_workspace"]),
            models.Index(fields=["is_system_user", "system_role"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["mobile"]),
        ]

    def __str__(self) -> str:
        return self.display_name or self.user.get_username()

    @property
    def can_access_system(self) -> bool:
        return (
            self.status == UserProfileStatus.ACTIVE
            and self.is_system_user
            and self.system_role != SystemRole.NONE
        )

    @property
    def can_access_company(self) -> bool:
        return (
            self.status == UserProfileStatus.ACTIVE
            and self.user.company_memberships.filter(
                status=MembershipStatus.ACTIVE,
                company__is_active=True,
            )
            .exclude(
                company__status__in=[
                    CompanyStatus.SUSPENDED,
                    CompanyStatus.EXPIRED,
                    CompanyStatus.CANCELLED,
                ]
            )
            .exists()
        )

    def touch_last_seen(self) -> None:
        self.last_seen_at = timezone.now()
        self.save(update_fields=["last_seen_at", "updated_at"])

    def suspend(self, reason: str = "") -> None:
        self.status = UserProfileStatus.SUSPENDED
        self.suspended_at = timezone.now()
        self.suspended_reason = reason or ""
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_at",
            ]
        )

    def activate(self) -> None:
        self.status = UserProfileStatus.ACTIVE
        self.suspended_at = None
        self.suspended_reason = ""
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_at",
            ]
        )


class CompanyMembership(models.Model):
    """
    User membership inside a company.

    This is the official access boundary for /company.
    A user can belong to more than one company, but every access must be scoped
    to exactly one active company membership.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
        verbose_name="User",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Company",
    )

    role = models.CharField(
        max_length=40,
        choices=CompanyRole.choices,
        default=CompanyRole.EMPLOYEE,
        db_index=True,
        verbose_name="Company role",
    )
    status = models.CharField(
        max_length=30,
        choices=MembershipStatus.choices,
        default=MembershipStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    is_primary = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Primary membership",
        help_text="Marks the user's preferred membership when multiple companies exist.",
    )

    job_title = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Job title",
    )
    department = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Department",
    )

    invited_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Invited at",
    )
    joined_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Joined at",
    )
    suspended_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Suspended at",
    )
    suspended_reason = models.TextField(
        blank=True,
        verbose_name="Suspended reason",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_company_memberships",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_company_memberships",
        verbose_name="Updated by",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Company membership"
        verbose_name_plural = "Company memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "company"],
                name="unique_user_company_membership",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["company", "role"]),
            models.Index(fields=["is_primary", "status"]),
            models.Index(fields=["department"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.get_username()} - {self.company.display_name} - {self.role}"

    @property
    def is_active_membership(self) -> bool:
        return (
            self.status == MembershipStatus.ACTIVE
            and self.company.is_active
            and self.company.status
            not in [
                CompanyStatus.SUSPENDED,
                CompanyStatus.EXPIRED,
                CompanyStatus.CANCELLED,
            ]
        )

    def activate(self, user=None) -> None:
        self.status = MembershipStatus.ACTIVE
        self.suspended_at = None
        self.suspended_reason = ""
        if not self.joined_at:
            self.joined_at = timezone.now()
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "joined_at",
                "updated_by",
                "updated_at",
            ]
        )

    def suspend(self, reason: str = "", user=None) -> None:
        self.status = MembershipStatus.SUSPENDED
        self.suspended_at = timezone.now()
        self.suspended_reason = reason or ""
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def mark_inactive(self, user=None) -> None:
        self.status = MembershipStatus.INACTIVE
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )