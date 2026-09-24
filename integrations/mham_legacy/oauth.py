from __future__ import annotations
import json, os, urllib.parse, urllib.request
from dataclasses import dataclass
from .exceptions import MhamLegacyAuthenticationError, MhamLegacyConfigurationError

TOKEN_URL="https://mhamcloud.sa/oauth/token"
API_BASE_URL="https://mhamcloud.sa/connector/api"

@dataclass(frozen=True,slots=True)
class MhamOAuthCredentials:
    client_id:str; client_secret:str; username:str; password:str
    @classmethod
    def from_environment(cls):
        obj=cls(*(os.environ.get(n,"").strip() for n in ("MHAM_LEGACY_CLIENT_ID","MHAM_LEGACY_CLIENT_SECRET","MHAM_LEGACY_USERNAME","MHAM_LEGACY_PASSWORD")))
        if not obj.client_id or not obj.username or not obj.password:
            raise MhamLegacyConfigurationError("Required Mham OAuth credentials are missing.")
        return obj

def request_access_token(credentials=None,*,timeout=30.0,opener=None):
    c=credentials or MhamOAuthCredentials.from_environment()
    data={"grant_type":"password","client_id":c.client_id,"username":c.username,"password":c.password}
    if c.client_secret:data["client_secret"]=c.client_secret
    req=urllib.request.Request(TOKEN_URL,data=urllib.parse.urlencode(data).encode(),headers={"Accept":"application/json"},method="POST")
    try:
        with (opener or urllib.request.urlopen)(req,timeout=timeout) as r:
            payload=json.loads(r.read().decode("utf-8-sig","replace"))
    except Exception as exc:
        raise MhamLegacyAuthenticationError("Mham OAuth authentication failed: "+type(exc).__name__) from exc
    token=str(payload.get("access_token") or "").strip() if isinstance(payload,dict) else ""
    if not token:raise MhamLegacyAuthenticationError("Mham OAuth response did not contain access_token.")
    return token

def prepare_runtime_environment(*,timeout=30.0):
    token=request_access_token(timeout=timeout)
    os.environ["MHAM_LEGACY_API_BASE_URL"]=API_BASE_URL
    os.environ["MHAM_LEGACY_API_TOKEN"]=token
    return token
