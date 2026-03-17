from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db

from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.services.audit_service import AuditService

router = APIRouter(
    prefix="/audit",
    tags=["Audit Logs"]
)

service = AuditService()


@router.get("")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),

    actor_role: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_id: Optional[str] = None,

    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,

    auth: AuthContext = Depends(get_current_user)
):
    # 🔐 SECURITY RULES

    # ADMIN → full access
    if auth.role == Role.ADMIN:

    # If actor_id is passed as manager_id (like BM001)
        if actor_id and not ObjectId.is_valid(actor_id):
            # db = get_database()
            # manager_collection = db["managers"]

            manager = await db["managers"].find_one(
                {"manager_id": actor_id}
            )

            if not manager:
                raise HTTPException(
                    status_code=404,
                    detail="Manager not found"
                )

            actor_id = str(manager["_id"])

        return await service.get_audit_logs(
            skip,
            limit,
            actor_role,
            action,
            entity_type,
            start_date,
            end_date,
            actor_id
        )


    # MANAGERS → see only their own logs
    if auth.role in [Role.BANK_MANAGER, Role.LOAN_MANAGER]:
        return await service.get_audit_logs(
            skip, limit,
            actor_role=auth.role.value,
            actor_id=auth.user_id
        )

    # USERS → only their own actions
    if auth.role == Role.USER:
        return await service.get_audit_logs(
            skip, limit,
            actor_role="USER",
            actor_id=auth.user_id
        )

    raise HTTPException(status_code=403, detail="Access denied")
