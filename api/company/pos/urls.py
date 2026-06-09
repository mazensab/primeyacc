# ============================================================
# 📂 api/company/pos/urls.py
# 🧠 PrimeyAcc | Company POS URLs V1.0
# ------------------------------------------------------------
# ✅ Company POS API Root Routing
# ✅ POS Registers Routes Include
# ✅ Company-scoped /company POS API Routing
# ✅ Ready for Sessions / Checkout / Orders later
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل مسارات POS تعمل داخل /company فقط
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company داخل كل View
# - هذا الملف يربط وحدات POS الفرعية فقط
# - لا يتم وضع أي منطق تشغيلي داخل urls.py
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "company_pos"


urlpatterns = [
    path(
        "registers/",
        include("api.company.pos.registers.urls"),
    ),
]