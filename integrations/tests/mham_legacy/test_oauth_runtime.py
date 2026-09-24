import json, os
from unittest import TestCase
from unittest.mock import patch
from integrations.mham_legacy.oauth import API_BASE_URL,TOKEN_URL,MhamOAuthCredentials,prepare_runtime_environment,request_access_token

class Resp:
    def __init__(self,p):self.p=p
    def __enter__(self):return self
    def __exit__(self,*a):return False
    def read(self):return json.dumps(self.p).encode()

class MhamOAuthRuntimeTests(TestCase):
    def test_contract_urls(self):
        self.assertEqual(TOKEN_URL,"https://mhamcloud.sa/oauth/token")
        self.assertEqual(API_BASE_URL,"https://mhamcloud.sa/connector/api")
    def test_password_grant(self):
        seen={}
        def opener(req,timeout):
            seen["url"]=req.full_url;seen["body"]=req.data.decode();return Resp({"access_token":"abc"})
        self.assertEqual(request_access_token(MhamOAuthCredentials("24","sec","050","pwd"),opener=opener),"abc")
        self.assertIn("grant_type=password",seen["body"]);self.assertIn("client_secret=sec",seen["body"])
    def test_prepare_runtime(self):
        with patch("integrations.mham_legacy.oauth.request_access_token",return_value="runtime-token"):
            old=dict(os.environ)
            try:
                prepare_runtime_environment()
                self.assertEqual(os.environ["MHAM_LEGACY_API_BASE_URL"],API_BASE_URL)
                self.assertEqual(os.environ["MHAM_LEGACY_API_TOKEN"],"runtime-token")
            finally:
                os.environ.clear();os.environ.update(old)
