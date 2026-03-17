from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import Optional

from bson import ObjectId

from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.db.mongodb import db

from app.repositories.manager_repository import ManagerRepository
from app.repositories.user_repository import UserRepository
from app.schemas.kyc_draft import KycDraftRequest
from app.schemas.user_decision import UserApprovalDecisionRequest
from app.schemas.user_delete import (
    UserDeleteRequest,
    UserDeleteDecisionRequest
)

from app.services.bank_manager_service import BankManagerService


router = APIRouter(
    prefix="/manager/bank",
    tags=["Bank Manager"]
)

service = BankManagerService()
manager_repo = ManagerRepository()
user_repo = UserRepository()

# ======================================================
# MANAGER PROFILE
# ======================================================
@router.get("/me")
async def get_manager_profile(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    manager = await manager_repo.find_by_id(str(auth.user_id))
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    return {
        "manager_id": str(manager.get("_id")),
        "name": manager.get("name"),
        "phone": manager.get("phone"),
        "role": manager.get("role"),
    }

# ======================================================
# USER LIST (WITH DELETION VISIBILITY)
# ======================================================
@router.get("/users")
async def list_users(
    approval_status: Optional[str] = Query(None),
    kyc_status: Optional[str] = Query(None),
    deletion_requested: Optional[bool] = Query(None),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    return await service.list_users(
        approval_status=approval_status,
        kyc_status=kyc_status,
        deletion_requested=deletion_requested
    )


# ======================================================
# USER SEARCH (BY NAME)
# ======================================================
@router.get("/users/search")
async def search_users(
    q: str = Query(""),
    limit: int = Query(20, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    query = (q or "").strip()
    if not query:
        return {"users": []}

    cursor = user_repo.collection.find(
        {
            "name": {"$regex": query, "$options": "i"},
            "approved_by_manager_id": ObjectId(auth.user_id)
        }
    ).limit(limit)

    users = []
    async for u in cursor:
        users.append({
            "user_id": str(u["_id"]),
            "name": u.get("name"),
            "phone": u.get("phone"),
            "approval_status": u.get("approval_status"),
            "kyc_status": u.get("kyc_status"),
        })

    return {"users": users}


# ======================================================
# USER DETAILS
# ======================================================
@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        return await service.get_user_details(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ======================================================
# USER KYC REVIEW
# ======================================================
@router.get("/users/{user_id}/kyc")
async def review_user_kyc(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        return await service.get_user_kyc_details(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ======================================================
# USER KYC DRAFT UPDATE
# ======================================================
@router.patch("/users/{user_id}/kyc-draft")
async def save_kyc_draft(
    user_id: str,
    payload: KycDraftRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        res = await service.save_kyc_draft(
            manager_id=auth.user_id,
            user_id=user_id,
            draft=payload.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mode = (res or {}).get("mode")
    return {"message": "KYC updated" if mode == "KYC_UPDATED" else "KYC draft saved"}


# ======================================================
# ACCOUNT NUMBER + IFSC GENERATION
# ======================================================
@router.post("/users/{user_id}/account/generate")
async def generate_account_details(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        return await service.generate_account_details(
            manager_id=auth.user_id,
            user_id=user_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ======================================================
# USER DOCUMENTS (FOR KYC REVIEW)
# ======================================================
@router.get("/users/{user_id}/documents")
async def list_user_documents(
    user_id: str,
    request: Request,
    doc_type: Optional[str] = Query(None),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    query = {"user_id": ObjectId(user_id)}
    if doc_type:
        query["doc_type"] = (doc_type or "").strip().upper()

    cursor = db.user_documents.find(query).sort("uploaded_at", -1)
    items = []
    async for d in cursor:
        items.append({
            "document_id": str(d["_id"]),
            "doc_type": d.get("doc_type"),
            "original_name": d.get("original_name"),
            "content_type": d.get("content_type"),
            "uploaded_at": d.get("uploaded_at").isoformat() if d.get("uploaded_at") else None,
        })

    base = str(request.base_url).rstrip("/")
    return {
        "documents": [
            {**it, "url": f"{base}/uploads/identity-docs/{it['document_id']}"}
            for it in items
        ]
    }


# ======================================================
# USER APPROVAL / REJECTION
# ======================================================
@router.post("/users/{user_id}/decision")
async def decide_user(
    user_id: str,
    payload: UserApprovalDecisionRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        await service.decide_user(
            manager_id=auth.user_id,
            user_id=user_id,
            decision=payload.decision,
            reason=payload.reason,
            account_number=payload.account_number,
            ifsc_code=payload.ifsc_code
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "message": f"User {payload.decision.value.lower()} successfully"
    }


# ======================================================
# CLEAR KYC EDIT REQUEST
# ======================================================
@router.post("/users/{user_id}/kyc-edit/clear")
async def clear_kyc_edit_request(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        await service.clear_kyc_edit_request(
            manager_id=auth.user_id,
            user_id=user_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "KYC edit request cleared"}


# ======================================================
# USER DELETION (DIRECT EXECUTION BY BANK MANAGER)
# ======================================================
@router.post("/users/{user_id}/delete")
async def delete_user(
    user_id: str,
    payload: UserDeleteRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        await service.delete_user(
            manager_id=auth.user_id,
            user_id=user_id,
            reason=payload.reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "User deleted successfully"}


# ======================================================
# ADMIN → MANAGER USER DELETION ESCALATION
# ======================================================
@router.post("/users/{user_id}/delete/decision")
async def handle_user_deletion_escalation(
    user_id: str,
    payload: UserDeleteDecisionRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank Manager access required"
        )

    try:
        await service.handle_user_deletion_escalation(
            manager_id=auth.user_id,
            user_id=user_id,
            decision=payload.decision,
            reason=payload.reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Deletion escalation processed"}
