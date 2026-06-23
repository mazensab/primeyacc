# ============================================================
# File: api/system/users/urls.py
# Module: PrimeyAcc System Users API URLs
# Routes:
# - GET /api/system/users/
# - GET /api/system/users/<user_id>/
# - GET /api/users/ alias from api/urls.py
# - GET /api/users/<user_id>/ alias from api/urls.py
# ============================================================
from __future__ import annotations
from django.urls import path
from .detail import system_user_detail
from .list import system_users_list
app_name = "system_users"
urlpatterns = [
    path("", system_users_list, name="list"),
    path("<int:user_id>/", system_user_detail, name="detail"),
]
