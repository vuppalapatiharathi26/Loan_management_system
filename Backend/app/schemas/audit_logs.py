from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    actor_id: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str
    remarks: str
    timestamp: datetime


class AuditLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    logs: List[AuditLogResponse]
