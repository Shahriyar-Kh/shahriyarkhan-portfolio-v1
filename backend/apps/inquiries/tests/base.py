from django.core.cache import cache
from rest_framework.test import APITestCase


class ThrottleSafeAPITestCase(APITestCase):
    """Any test that POSTs to the public inquiry endpoints shares a
    single process-global throttle cache with every other such test in
    the same run - without clearing it, an earlier test's requests count
    against a later test's rate limit. Tests that specifically exercise
    the rate limit itself (tests/test_throttling.py) already clear the
    cache in their own setUp; this base class exists so every other test
    hitting these endpoints doesn't have to remember to."""

    def setUp(self):
        super().setUp()
        cache.clear()
