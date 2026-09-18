from unittest.mock import patch

from django.test import TestCase

from apps.assistant.services.providers import GeminiAssistantProvider
from apps.assistant.services.public_knowledge import build_evidence_bundle
from apps.portfolio.models import Project
from apps.site_config.models import SiteSetting


class GeminiPromptBuildingTests(TestCase):
    """Regression coverage for a real bug caught during development: the
    system-instruction template embeds a literal JSON example (curly
    braces) alongside the actual evidence substitution - using str.format()
    on it raised KeyError on the literal braces. The provider now uses a
    plain placeholder replace(), which this test exercises end-to-end
    (evidence bundle -> prompt -> mocked Gemini call) without hitting the
    network."""

    def setUp(self):
        SiteSetting.objects.create(owner_name="Shahriyar Khan", public_email="owner@example.com")
        Project.objects.create(
            title="Prompt Project",
            slug="prompt-project",
            description="A Django booking platform used to prove prompt building works.",
            status="published",
        )

    @patch("apps.assistant.services.providers.generate_json")
    def test_prompt_is_built_without_raising_and_contains_the_evidence(self, mock_generate_json):
        bundle = build_evidence_bundle()
        mock_generate_json.return_value = {
            "answer": "Prompt Project is a published project.",
            "intent": "PROJECTS",
            "source_ids": ["project:prompt-project"],
            "recommended_project_slugs": ["prompt-project"],
            "recommended_service_slugs": [],
            "handoff": False,
            "handoff_reason": None,
        }

        answer = GeminiAssistantProvider().generate_grounded_answer(
            message="Tell me about Prompt Project", evidence_bundle=bundle, project_slugs={"prompt-project"}, service_slugs=set()
        )

        self.assertEqual(answer.intent, "PROJECTS")
        called_system_instruction = mock_generate_json.call_args.kwargs["system_instruction"]
        self.assertIn("prompt-project", called_system_instruction)
        self.assertIn("EXACTLY these keys", called_system_instruction)

    @patch("apps.assistant.services.providers.generate_json")
    def test_client_build_request_forces_project_discovery_routing(self, mock_generate_json):
        bundle = build_evidence_bundle()
        mock_generate_json.return_value = {
            "answer": "Yes, Shahriyar can help with a custom booking platform.",
            "intent": "SERVICES",
            "source_ids": ["project:prompt-project"],
            "recommended_project_slugs": ["prompt-project"],
            "recommended_service_slugs": [],
            "handoff": True,
            "handoff_reason": "Connect with Shahriyar to discuss the project.",
        }

        answer = GeminiAssistantProvider().generate_grounded_answer(
            message="I want to build a booking platform for my salon. Can Shahriyar help me?",
            evidence_bundle=bundle,
            project_slugs={"prompt-project"},
            service_slugs=set(),
        )

        self.assertEqual(answer.intent, "CLIENT_QUESTION")
        self.assertTrue(answer.handoff)
        self.assertEqual(answer.handoff_reason, "project_discovery")
