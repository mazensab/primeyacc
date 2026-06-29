# ============================================================
# File: api/system/users/collection.py
# Module: Mhamcloud System Users Collection API
# Endpoints:
# - GET  /api/system/users/
# - POST /api/system/users/
# - GET  /api/users/
# - POST /api/users/
# ============================================================
from __future__ import annotations
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from .create import system_user_create
from .list import system_users_list
@login_required
@csrf_protect
@require_http_methods(["GET", "POST"])
def system_users_collection(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        return system_user_create(request)
    return system_users_list(request)
