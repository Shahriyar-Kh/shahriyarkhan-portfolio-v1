# CONTACT-OPS-01: adds reference IDs, submission idempotency, intent/
# source metadata, honeypot result, and per-channel (email/Sheets)
# delivery tracking to both enquiry models, and unifies their two
# divergent `status` enums into one shared ReviewStatus.
#
# Backfills are written inline (not imported from apps.inquiries.models)
# per standard Django practice, so this migration keeps working
# unchanged even if the live model code changes later.
import random

import apps.inquiries.models
from django.db import migrations, models

REFERENCE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
REFERENCE_ID_LENGTH = 8
REFERENCE_ID_PREFIX = "SK-"


def backfill_reference_ids(apps, schema_editor):
    """Every pre-existing row starts with reference_id="" (the AddField
    below has no unique constraint yet, specifically so this step can
    run first) - assign each one a real, unique reference ID before the
    later AlterField makes the column unique. Reverse is intentionally a
    no-op: unapplying this migration drops the column entirely (via the
    paired AddField's own reversal), so there is nothing meaningful to
    restore for this step specifically."""
    for model_name in ("ContactMessage", "ServiceRequest"):
        Model = apps.get_model("inquiries", model_name)
        existing = set(Model.objects.exclude(reference_id="").values_list("reference_id", flat=True))
        for obj in Model.objects.filter(reference_id=""):
            candidate = REFERENCE_ID_PREFIX + "".join(
                random.choices(REFERENCE_ID_ALPHABET, k=REFERENCE_ID_LENGTH)
            )
            while candidate in existing:
                candidate = REFERENCE_ID_PREFIX + "".join(
                    random.choices(REFERENCE_ID_ALPHABET, k=REFERENCE_ID_LENGTH)
                )
            existing.add(candidate)
            obj.reference_id = candidate
            obj.save(update_fields=["reference_id"])


# 1:1 per model, so reversal is unambiguous PROVIDED no new row has since
# been created with one of the new values (the standard, accepted
# limitation of any lossy forward data migration reversed after new data
# has accumulated - not specific to this one).
CONTACT_MESSAGE_STATUS_FORWARD_MAP = {
    "read": "reviewed",
    "replied": "contacted",
    "archived": "closed",
}
SERVICE_REQUEST_STATUS_FORWARD_MAP = {
    "in_progress": "contacted",
}


def remap_status_forward(apps, schema_editor):
    ContactMessage = apps.get_model("inquiries", "ContactMessage")
    for old_value, new_value in CONTACT_MESSAGE_STATUS_FORWARD_MAP.items():
        ContactMessage.objects.filter(status=old_value).update(status=new_value)

    ServiceRequest = apps.get_model("inquiries", "ServiceRequest")
    for old_value, new_value in SERVICE_REQUEST_STATUS_FORWARD_MAP.items():
        ServiceRequest.objects.filter(status=old_value).update(status=new_value)


def remap_status_reverse(apps, schema_editor):
    ContactMessage = apps.get_model("inquiries", "ContactMessage")
    for old_value, new_value in CONTACT_MESSAGE_STATUS_FORWARD_MAP.items():
        ContactMessage.objects.filter(status=new_value).update(status=old_value)

    ServiceRequest = apps.get_model("inquiries", "ServiceRequest")
    for old_value, new_value in SERVICE_REQUEST_STATUS_FORWARD_MAP.items():
        ServiceRequest.objects.filter(status=new_value).update(status=old_value)


class Migration(migrations.Migration):

    dependencies = [
        ('inquiries', '0001_initial'),
    ]

    operations = [
        # --- Simple additive fields: all have real, safe defaults, so
        # every pre-existing row backfills cleanly with no data migration
        # needed. ---
        migrations.AddField(
            model_name='contactmessage',
            name='email_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='email_error',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='email_last_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='email_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed'), ('skipped', 'Skipped')], default='pending', max_length=16),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='honeypot_triggered',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='intent',
            field=models.CharField(blank=True, max_length=32, validators=[apps.inquiries.models.validate_intent]),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='sheets_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='sheets_error',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='sheets_last_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='sheets_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('synced', 'Synced'), ('failed', 'Failed'), ('skipped', 'Skipped'), ('not_configured', 'Not configured')], default='pending', max_length=16),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='source_page',
            field=models.CharField(blank=True, max_length=200, validators=[apps.inquiries.models.validate_source_page]),
        ),
        # NULL for any pre-existing row and for any client that doesn't
        # send one - Postgres/SQLite treat multiple NULLs in a unique
        # column as distinct, so this is safe as-is with no backfill.
        migrations.AddField(
            model_name='contactmessage',
            name='submission_id',
            field=models.UUIDField(blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='email_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='email_error',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='email_last_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='email_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed'), ('skipped', 'Skipped')], default='pending', max_length=16),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='honeypot_triggered',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='intent',
            field=models.CharField(blank=True, max_length=32, validators=[apps.inquiries.models.validate_intent]),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='sheets_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='sheets_error',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='sheets_last_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='sheets_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('synced', 'Synced'), ('failed', 'Failed'), ('skipped', 'Skipped'), ('not_configured', 'Not configured')], default='pending', max_length=16),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='submission_id',
            field=models.UUIDField(blank=True, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='source_page',
            field=models.CharField(blank=True, max_length=200, validators=[apps.inquiries.models.validate_source_page]),
        ),

        # --- reference_id: added WITHOUT a unique constraint first so
        # pre-existing rows (all defaulting to "") don't collide, backfilled
        # with real unique values, THEN made unique. ---
        migrations.AddField(
            model_name='contactmessage',
            name='reference_id',
            field=models.CharField(blank=True, default='', editable=False, max_length=20),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='reference_id',
            field=models.CharField(blank=True, default='', editable=False, max_length=20),
        ),
        migrations.RunPython(backfill_reference_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='contactmessage',
            name='reference_id',
            field=models.CharField(blank=True, editable=False, max_length=20, unique=True),
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='reference_id',
            field=models.CharField(blank=True, editable=False, max_length=20, unique=True),
        ),

        # --- status: unify the two models' divergent enums into the
        # shared ReviewStatus, remapping existing values (real reverse,
        # not a no-op) so no pre-existing row is left with a status value
        # outside the new choices. ---
        migrations.AlterField(
            model_name='contactmessage',
            name='status',
            field=models.CharField(choices=[('new', 'New'), ('reviewed', 'Reviewed'), ('contacted', 'Contacted'), ('qualified', 'Qualified'), ('closed', 'Closed'), ('spam', 'Spam')], default='new', max_length=12),
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='status',
            field=models.CharField(choices=[('new', 'New'), ('reviewed', 'Reviewed'), ('contacted', 'Contacted'), ('qualified', 'Qualified'), ('closed', 'Closed'), ('spam', 'Spam')], default='new', max_length=12),
        ),
        migrations.RunPython(remap_status_forward, remap_status_reverse),
    ]
