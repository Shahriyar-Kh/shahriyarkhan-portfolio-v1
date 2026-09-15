class SnapshotError(Exception):
    """Base error for safe snapshot-domain failures."""


class SnapshotValidationError(SnapshotError):
    """The proposed snapshot is structurally or semantically invalid."""


class SnapshotSourceUnavailable(SnapshotError):
    """A selected source is missing or no longer eligible."""


class SnapshotMutationError(SnapshotError):
    """A frozen version cannot be mutated in place."""


class LifecycleError(SnapshotError):
    code = "invalid_transition"


class ImmutableVersionError(LifecycleError):
    code = "immutable_version"


class StaleSnapshotError(SnapshotError):
    code = "stale_hash"


class MissingExportError(SnapshotError):
    code = "missing_export"


class ExportIntegrityError(SnapshotError):
    code = "export_integrity_failure"


class ExportGenerationError(SnapshotError):
    code = "export_generation_failure"


class ExportPermissionError(SnapshotError):
    code = "export_permission_denied"


class PublicationConflictError(SnapshotError):
    code = "publication_conflict"


class ApplicationTransitionError(SnapshotError):
    code = "invalid_application_transition"
