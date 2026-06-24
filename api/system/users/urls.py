# ============================================================
# File: api/system/users/urls.py
# Module: PrimeyAcc System Users API URLs
# Routes:
# - GET  /api/system/users/
# - POST /api/system/users/
# - POST /api/system/users/create/
# - GET  /api/system/users/<user_id>/
# - GET  /api/users/ alias from api/urls.py
# - POST /api/users/ alias from api/urls.py
# ============================================================
from __future__ import annotations
from django.urls import path
from .collection import system_users_collection
from .create import system_user_create
from .detail import system_user_detail
app_name = "system_users"
urlpatterns = [
    path("", system_users_collection, name="list"),
    path("create/", system_user_create, name="create"),
    path("<int:user_id>/", system_user_detail, name="detail"),
]
