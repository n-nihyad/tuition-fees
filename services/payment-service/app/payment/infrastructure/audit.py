from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import Request
from pymongo.errors import PyMongoError


class AuditUnavailableError(RuntimeError):
    pass


async def write_audit_event(
    request: Request,
    *,
    event_type: str,
    payer_id: UUID,
    payment_id: UUID,
    details: dict[str, Any],
) -> None:
    try:
        await request.app.state.audit_events.insert_one(
            {
                "eventType": event_type,
                "payerId": str(payer_id),
                "paymentId": str(payment_id),
                "details": details,
                "createdAt": datetime.now(UTC),
            }
        )
    except PyMongoError as exc:
        raise AuditUnavailableError("MongoDB audit write failed") from exc
