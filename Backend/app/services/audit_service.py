from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.repositories.audit_log_repository import AuditLogRepository
from app.utils.mongo_serializer import serialize_mongo


class AuditService:
    def __init__(self):
        self.repo = AuditLogRepository()

    async def get_audit_logs(
        self,
        skip: int,
        limit: int,
        actor_role: Optional[str] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        actor_id: Optional[str] = None
    ):
        query: Dict[str, Any] = {}

        if actor_role:
            query["actor_role"] = actor_role

        if action:
            query["action"] = action

        if entity_type:
            query["entity_type"] = entity_type

        if actor_id:
            query["actor_id"] = actor_id

        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date

        total, logs = await self.repo.get_logs(query, skip, limit)

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "logs": serialize_mongo(logs)
        }
