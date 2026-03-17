from app.db.mongodb import db
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogRepository:
    def __init__(self):
        self.collection = db.audit_logs

    async def create(self, log: dict):
        await self.collection.insert_one(log)

    async def get_logs(
        self,
        query: Dict[str, Any],
        skip: int,
        limit: int
    ):
        total = await self.collection.count_documents(query)

        cursor = (
            self.collection
            .find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )

        logs = []
        async for log in cursor:
            logs.append(log)

        return total, logs
