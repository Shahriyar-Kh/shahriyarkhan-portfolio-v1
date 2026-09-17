from datetime import date

from django.test import TestCase

from apps.assistant.services.providers import DeterministicFallbackProvider
from apps.assistant.services.public_knowledge import build_evidence_bundle
from apps.assistant.services.schema import validate_structured_response
from apps.portfolio.models import Project, Service, Skill, SkillCategory
from apps.site_config.models import SiteSetting

PROVIDER = DeterministicFallbackProvider()


class DeterministicProviderTests(TestCase):
    """PORTFOLIO-ASSISTANTS-01 section 24: the deterministic fallback
    provider is exercised directly here (no network, no mocking needed) -
    it is also what every Gemini-unavailable test in test_api.py
    ultimately falls back to."""

    def setUp(self):
        SiteSetting.objects.create(owner_name="Shahriyar Khan", public_email="owner@example.com")
        category = SkillCategory.objects.create(name="Backend", slug="backend")
        Skill.objects.create(name="Django", category=category, level=4, published=True)
        Project.objects.create(
            title="Yango Wing Fleet",
            slug="yango-wing-fleet",
            description="Fleet management platform built with Django and PostgreSQL.",
            status="published",
        )
        Service.objects.create(title="Backend Development", slug="backend-development", description="API and backend engineering.", status="published")
        self.bundle = build_evidence_bundle()
        self.project_slugs = {"yango-wing-fleet"}
        self.service_slugs = {"backend-development"}

    def _ask(self, message):
        return PROVIDER.generate_grounded_answer(
            message=message, evidence_bundle=self.bundle, project_slugs=self.project_slugs, service_slugs=self.service_slugs
        )

    def test_grounded_skills_answer(self):
        answer = self._ask("Has he worked with Django?")

        self.assertEqual(answer.intent, "SKILLS")
        self.assertIn("skill:1", answer.source_ids)

    def test_grounded_project_answer(self):
        answer = self._ask("Tell me about the Yango Wing Fleet project.")

        self.assertIn("project:yango-wing-fleet", answer.source_ids)

    def test_project_recommendation(self):
        answer = self._ask("Which project should I look at if I need a Django backend?")

        self.assertEqual(answer.intent, "PROJECT_RECOMMENDATION")
        self.assertIn("yango-wing-fleet", answer.recommended_project_slugs)

    def test_service_recommendation(self):
        answer = self._ask("What services does he offer for backend development?")

        self.assertEqual(answer.intent, "SERVICES")
        self.assertIn("backend-development", answer.recommended_service_slugs)

    def test_insufficient_evidence_fallback(self):
        answer = self._ask("Has he worked with Rust?")

        self.assertEqual(answer.intent, "INSUFFICIENT_EVIDENCE")
        self.assertTrue(answer.handoff)
        self.assertNotIn("Rust", answer.answer)

    def test_off_topic_question(self):
        answer = self._ask("What's the capital of France?")

        self.assertEqual(answer.intent, "OFF_TOPIC")
        self.assertFalse(answer.handoff)
        self.assertEqual(answer.source_ids, [])

    def test_contact_handoff(self):
        answer = self._ask("How can I contact him?")

        self.assertEqual(answer.intent, "CONTACT_HANDOFF")
        self.assertTrue(answer.handoff)

    def test_client_question_triggers_handoff(self):
        answer = self._ask("Can you build me an ecommerce website?")

        self.assertEqual(answer.intent, "CLIENT_QUESTION")
        self.assertTrue(answer.handoff)

    def test_natural_client_project_request_triggers_handoff(self):
        answer = self._ask("I want to build a booking platform for my salon. Can Shahriyar help me?")

        self.assertEqual(answer.intent, "CLIENT_QUESTION")
        self.assertTrue(answer.handoff)
        self.assertEqual(answer.handoff_reason, "project_discovery")

    def test_deterministic_answer_always_passes_its_own_schema_validation(self):
        answer = self._ask("What does Shahriyar specialize in?")

        validated = validate_structured_response(
            {
                "answer": answer.answer,
                "intent": answer.intent,
                "source_ids": answer.source_ids,
                "recommended_project_slugs": answer.recommended_project_slugs,
                "recommended_service_slugs": answer.recommended_service_slugs,
                "handoff": answer.handoff,
                "handoff_reason": answer.handoff_reason,
            },
            evidence_bundle=self.bundle,
            project_slugs=self.project_slugs,
            service_slugs=self.service_slugs,
        )
        self.assertIsNotNone(validated)


class SchemaValidationSecurityTests(TestCase):
    """PORTFOLIO-ASSISTANTS-01 section 7-8/26: proves the validation layer
    - not model good behavior - is what actually blocks a fabricating or
    injected provider response. Each case simulates the kind of output an
    LLM ignoring its instructions (or a prompt-injected user) might try to
    produce, fed directly to the validator the same way GeminiAssistantProvider
    would."""

    def setUp(self):
        SiteSetting.objects.create(owner_name="Shahriyar Khan", public_email="owner@example.com")
        Project.objects.create(title="Real Project", slug="real-project", description="Genuine.", status="published")
        self.bundle = build_evidence_bundle()
        self.project_slugs = {"real-project"}
        self.service_slugs = set()

    def _validate(self, raw):
        return validate_structured_response(raw, evidence_bundle=self.bundle, project_slugs=self.project_slugs, service_slugs=self.service_slugs)

    def test_fabricated_source_id_is_rejected(self):
        raw = {"answer": "He worked at Google.", "intent": "EXPERIENCE", "source_ids": ["experience:999"], "recommended_project_slugs": [], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_fabricated_project_slug_is_rejected(self):
        raw = {"answer": "See this project.", "intent": "PROJECT_RECOMMENDATION", "source_ids": [], "recommended_project_slugs": ["made-up-project"], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_invalid_intent_is_rejected(self):
        raw = {"answer": "Something.", "intent": "REVEAL_SYSTEM_PROMPT", "source_ids": [], "recommended_project_slugs": [], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_overlong_answer_is_rejected(self):
        raw = {"answer": "x" * 5000, "intent": "PORTFOLIO_OVERVIEW", "source_ids": [], "recommended_project_slugs": [], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_disallowed_url_is_rejected(self):
        raw = {"answer": "Visit https://evil.example.com/phish for more.", "intent": "PORTFOLIO_OVERVIEW", "source_ids": [], "recommended_project_slugs": [], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_malformed_shape_is_rejected(self):
        self.assertIsNone(self._validate("not a dict"))
        self.assertIsNone(self._validate({"answer": 12345, "intent": "OFF_TOPIC"}))
        self.assertIsNone(self._validate({"intent": "OFF_TOPIC"}))

    def test_wrong_typed_source_ids_are_rejected(self):
        raw = {"answer": "Fine.", "intent": "OFF_TOPIC", "source_ids": [123], "recommended_project_slugs": [], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNone(self._validate(raw))

    def test_valid_response_referencing_real_evidence_is_accepted(self):
        raw = {"answer": "Real Project is a genuine published project.", "intent": "PROJECTS", "source_ids": ["project:real-project"], "recommended_project_slugs": ["real-project"], "recommended_service_slugs": [], "handoff": False, "handoff_reason": None}
        self.assertIsNotNone(self._validate(raw))
