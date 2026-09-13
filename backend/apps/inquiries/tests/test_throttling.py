from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, APITestCase

from apps.inquiries.api.views import ContactFormThrottle

CONTACT_URL = "/api/v1/public/inquiries/contact/"
SERVICES_URL = "/api/v1/public/portfolio/services/"

CONTACT_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test subject",
    "message": "Test message body long enough.",
}


class ContactFormRateLimitTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_exceeding_the_rate_returns_429(self):
        # SimpleRateThrottle.THROTTLE_RATES is bound as a class attribute
        # at import time (rest_framework.throttling module load), so
        # override_settings(REST_FRAMEWORK=...) does not reach it -
        # patch.object on the class attribute is the reliable way to
        # exercise a tight rate in a test.
        with patch.object(ContactFormThrottle, "THROTTLE_RATES", {"contact_form": "2/min"}):
            for i in range(2):
                response = self.client.post(
                    CONTACT_URL, {**CONTACT_PAYLOAD, "email": f"a{i}@example.com"}, format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)

            throttled = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_unrelated_public_endpoint_is_never_throttled(self):
        # Even with a tight contact_form rate active, this endpoint has
        # no throttle_classes attached at all - proves DEFAULT_THROTTLE_RATES
        # alone (with no DEFAULT_THROTTLE_CLASSES set) cannot throttle any
        # endpoint other than the two that explicitly opt in.
        with patch.object(ContactFormThrottle, "THROTTLE_RATES", {"contact_form": "2/min"}):
            for _ in range(10):
                response = self.client.get(SERVICES_URL)
                self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ClientIpResolutionTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.throttle = ContactFormThrottle()

    def _ident_for(self, **extra_meta):
        django_request = self.factory.post(CONTACT_URL, **extra_meta)
        return self.throttle.get_ident(Request(django_request))

    def test_num_proxies_one_trusts_only_the_rightmost_forwarded_entry(self):
        # NUM_PROXIES=1 is the default (config/settings/base.py) - an
        # attacker can prepend arbitrary fake entries on the left, but
        # only the rightmost (the one Railway's own edge actually
        # appended) is ever trusted.
        ident = self._ident_for(HTTP_X_FORWARDED_FOR="9.9.9.9, 4.4.4.4", REMOTE_ADDR="127.0.0.1")
        self.assertEqual(ident, "4.4.4.4")

    def test_no_forwarded_header_falls_back_to_remote_addr(self):
        ident = self._ident_for(REMOTE_ADDR="203.0.113.5")
        self.assertEqual(ident, "203.0.113.5")

    def test_ipv6_remote_addr_passes_through(self):
        ident = self._ident_for(REMOTE_ADDR="2001:db8::1")
        self.assertEqual(ident, "2001:db8::1")

    @override_settings(TRUST_CLOUDFLARE_CONNECTING_IP=True)
    def test_cloudflare_header_trusted_only_when_explicitly_enabled(self):
        ident = self._ident_for(
            HTTP_CF_CONNECTING_IP="8.8.8.8", HTTP_X_FORWARDED_FOR="6.6.6.6, 7.7.7.7", REMOTE_ADDR="127.0.0.1"
        )
        self.assertEqual(ident, "8.8.8.8")

    def test_cloudflare_header_ignored_when_not_explicitly_enabled(self):
        # Default is off - no repo evidence Cloudflare fronts the API
        # today (see CONTACT-OPS-01's plan). Falls back to the ordinary
        # NUM_PROXIES-based resolution instead of ever trusting a
        # client-supplied header by default.
        ident = self._ident_for(
            HTTP_CF_CONNECTING_IP="8.8.8.8", HTTP_X_FORWARDED_FOR="6.6.6.6, 7.7.7.7", REMOTE_ADDR="127.0.0.1"
        )
        self.assertEqual(ident, "7.7.7.7")
