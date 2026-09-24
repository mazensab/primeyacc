from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from integrations.mham_legacy.rate_limited_scan import scan_subscriptions
class A:
 def __init__(self):self.calls=[]
 def subscriptions(self,bid,limit=1000):self.calls.append(bid);return [{"id":"s"+bid}]
class B7Tests(TestCase):
 def test_resume(self):
  with TemporaryDirectory() as d:
   p=Path(d)/"c.json";a=A();scan_subscriptions(a,[{"id":1},{"id":2}],p,sleep_fn=lambda x:None,base_delay=0,jitter=0);b=A();scan_subscriptions(b,[{"id":1},{"id":2}],p,sleep_fn=lambda x:None,base_delay=0,jitter=0);self.assertEqual(b.calls,[])
 def test_429_retry(self):
  class B(A):
   def subscriptions(self,bid,limit=1000):
    self.calls.append(bid)
    if len(self.calls)<3:raise RuntimeError("HTTP 429")
    return [{"id":"ok"}]
  with TemporaryDirectory() as d:
   b=B();r=scan_subscriptions(b,[{"id":9}],Path(d)/"c.json",sleep_fn=lambda x:None,base_delay=.1,jitter=0);self.assertEqual(len(b.calls),3);self.assertEqual(r["completed_ids"],{"9"})
 def test_non429_fails_closed(self):
  class C(A):
   def subscriptions(self,bid,limit=1000):raise RuntimeError("HTTP 500")
  with TemporaryDirectory() as d:
   p=Path(d)/"c.json"
   with self.assertRaises(RuntimeError):scan_subscriptions(C(),[{"id":3}],p,sleep_fn=lambda x:None,base_delay=0,jitter=0)
   self.assertTrue(p.exists())
