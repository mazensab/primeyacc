# ============================================================
# 📂 api/system/plans/urls.py
# 🧠 PrimeyAcc | System Subscription Plans URLs V1.0
# ------------------------------------------------------------
# ✅ Routes for system SaaS subscription plans
# ✅ List, detail, create, update, and status actions
# ✅ Clean endpoint structure for future frontend integration
# ✅ Kept under /api/system/plans/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True داخل views
# - لا نضع منطق business داخل urls.py
# - المسارات تكون واضحة وثابتة للواجهة
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import system_plan_create
from .detail import system_plan_detail
from .list import system_plans_list
from .status import system_plan_status
from .update import system_plan_update


app_name = "system_plans"

urlpatterns = [
    path("", system_plans_list, name="list"),
    path("create/", system_plan_create, name="create"),
    path("<int:plan_id>/", system_plan_detail, name="detail"),
    path("<int:plan_id>/update/", system_plan_update, name="update"),
    path("<int:plan_id>/status/", system_plan_status, name="status"),
]