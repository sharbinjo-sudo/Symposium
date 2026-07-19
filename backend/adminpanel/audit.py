from .models import AuditLog


def log_admin_action(*, admin, action: str, entity_type: str, entity_id: str, metadata: dict | None = None) -> None:
  AuditLog.objects.create(
    admin=admin,
    action=action,
    entity_type=entity_type,
    entity_id=entity_id,
    metadata=metadata or {}
  )

