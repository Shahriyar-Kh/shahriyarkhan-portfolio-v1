from django.test import RequestFactory, TestCase

from apps.assistant.services.usage import anonymous_key_hash, check_and_increment


class UsageHashingTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_same_client_identity_produces_the_same_hash(self):
        request_a = self.factory.post("/", REMOTE_ADDR="198.51.100.7")
        request_b = self.factory.post("/", REMOTE_ADDR="198.51.100.7")

        self.assertEqual(anonymous_key_hash(request_a), anonymous_key_hash(request_b))

    def test_different_client_identities_produce_different_hashes(self):
        request_a = self.factory.post("/", REMOTE_ADDR="198.51.100.7")
        request_b = self.factory.post("/", REMOTE_ADDR="198.51.100.8")

        self.assertNotEqual(anonymous_key_hash(request_a), anonymous_key_hash(request_b))

    def test_hash_never_contains_the_raw_ip_as_a_substring(self):
        request = self.factory.post("/", REMOTE_ADDR="198.51.100.7")

        self.assertNotIn("198.51.100.7", anonymous_key_hash(request))


class UsageQuotaTests(TestCase):
    def test_increments_up_to_the_limit_then_blocks(self):
        allowed_1, remaining_1 = check_and_increment("test-key", daily_limit=2)
        allowed_2, remaining_2 = check_and_increment("test-key", daily_limit=2)
        allowed_3, remaining_3 = check_and_increment("test-key", daily_limit=2)

        self.assertTrue(allowed_1)
        self.assertEqual(remaining_1, 1)
        self.assertTrue(allowed_2)
        self.assertEqual(remaining_2, 0)
        self.assertFalse(allowed_3)
        self.assertEqual(remaining_3, 0)

    def test_different_keys_have_independent_buckets(self):
        allowed_a, _ = check_and_increment("key-a", daily_limit=1)
        allowed_b, _ = check_and_increment("key-b", daily_limit=1)

        self.assertTrue(allowed_a)
        self.assertTrue(allowed_b)
