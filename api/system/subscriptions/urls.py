# ============================================================
# 📂 api/system/subscriptions/urls.py
# 🧠 PrimeyAcc | System Company Subscriptions URLs V1.1
# ------------------------------------------------------------
# ✅ Routes for system company subscriptions APIs
# ✅ List, detail, create, renew, cancel, and change plan
# ✅ Clean endpoint structure for frontend integration
# ✅ Kept under /api/system/subscriptions/
# ✅ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم مراجعته في المرحلة 2 بعد إضافة حراس الصلاحيات
# - جميع APIs داخل /api/system/subscriptions/ محمية داخل views
# - لا نضع منطق business داخل urls.py
# - المسارات تكون واضحة وثابتة للواجهة
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import system_subscription_cancel
from .change_plan import system_subscription_change_plan
from .create import system_subscription_create
from .detail import system_subscription_detail
from .list import system_subscriptions_list
from .renew import system_subscription_renew


app_name = "system_subscriptions"


urlpatterns = [
    path("", system_subscriptions_list, name="list"),
    path("create/", system_subscription_create, name="create"),
    path("<int:subscription_id>/", system_subscription_detail, name="detail"),
    path("<int:subscription_id>/renew/", system_subscription_renew, name="renew"),
    path("<int:subscription_id>/cancel/", system_subscription_cancel, name="cancel"),
    path(
        "<int:subscription_id>/change-plan/",
        system_subscription_change_plan,
        name="change_plan",
    ),
]