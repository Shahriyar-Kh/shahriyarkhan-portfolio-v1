from django.db import models


class AssistantUsageBucket(models.Model):
    """Anonymous, privacy-preserving daily quota counter for the public
    assistant API (PORTFOLIO-ASSISTANTS-01, section 10).

    Deliberately does NOT store a raw IP address, user agent, or any other
    directly-identifying value - `anonymous_key_hash` is an HMAC-SHA256 of
    a per-request identity string (see services/usage.py), keyed by a
    server-only secret. That makes each row unreversible back to a real
    visitor while still being stable for the same visitor within one UTC
    day, which is all a daily quota needs. No visitor conversation content
    is stored anywhere in this app - see PublicAssistantQueryView, which
    never persists `message` or `answer`.
    """

    anonymous_key_hash = models.CharField(max_length=64, db_index=True)
    bucket_date = models.DateField(db_index=True)
    request_count = models.PositiveIntegerField(default=0)
    blocked_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("anonymous_key_hash", "bucket_date"),
                name="assistant_usage_bucket_key_date_unique",
            ),
        ]
        ordering = ("-bucket_date",)

    def __str__(self) -> str:
        return f"{self.anonymous_key_hash[:8]}… - {self.bucket_date} ({self.request_count})"
