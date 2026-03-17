from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from io import BytesIO
from bson import ObjectId

from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.services.admin_service import AdminService
from app.schemas.admin_manager import CreateManagerRequest
from app.schemas.admin_loan_escalation import AdminLoanDecisionRequest
from app.utils.mongo_serializer import serialize_mongo
from app.db.mongodb import db
from typing import Optional

router = APIRouter(prefix="/admin", tags=["Admin"])
service = AdminService()

# ========================
# ADMIN SELF
# ========================
@router.get("/me")
async def admin_me(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return {
        "admin_id": auth.user_id,
        "role": "ADMIN"
    }

# ========================
# MANAGER MANAGEMENT
# ========================
@router.get("/managers")
async def list_managers(
    status: str | None = None,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return await service.list_managers(status)



@router.post("/managers")
async def create_manager(
    payload: CreateManagerRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    try:
        manager = await service.create_manager(payload)
        return manager
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/managers/{manager_id}")
async def update_manager(
    manager_id: str,
    payload: dict,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    await service.update_manager(manager_id, payload)
    return {"message": "Manager updated successfully"}


@router.patch("/managers/{manager_id}/disable")
async def disable_manager(
    manager_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    await service.disable_manager(manager_id)
    return {"message": "Manager disabled successfully"}

@router.patch("/managers/{manager_id}/enable")
async def enable_manager(
    manager_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    await service.enable_manager(manager_id)
    return {"message": "Manager enabled successfully"}



@router.delete("/managers/{manager_id}")
async def delete_manager(
    manager_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    await service.delete_manager(manager_id, admin_id=auth.user_id)
    return {"message": "Manager deleted successfully"}

# ========================
# USER OVERSIGHT (ADMIN → MANAGER)
# ========================
@router.get("/users")
async def list_users(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return await service.list_users()


@router.post("/users/{user_id}/delete-request")
async def request_user_deletion(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    await service.request_user_deletion(
        user_id=user_id,
        admin_id=auth.user_id
    )

    return {"message": "User deletion request sent to bank manager"}

# ========================
# USER TRANSACTIONS
# ========================
@router.get("/users/{user_id}/transactions")
async def get_user_transactions(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    try:
        return await service.list_user_transactions(user_id=user_id,
            skip=skip,
            limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ========================
# USER ACCOUNT DETAILS
# ========================
@router.get("/users/{user_id}/account")
async def get_user_account(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    try:
        account = await db.accounts.find_one({"user_id": ObjectId(user_id)})
        if not account:
            return {}
        
        return {
            "account_number": account.get("account_number"),
            "ifsc_code": account.get("ifsc_code"),
            "generated_at": account.get("created_at").isoformat() if account.get("created_at") else None,
            "generated_by": account.get("updated_at").isoformat() if account.get("updated_at") else None,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching account details: {str(e)}"
        )


# ========================
# USER DOCUMENTS
# ========================
@router.get("/users/{user_id}/documents")
async def list_user_documents(
    user_id: str,
    request: Request,
    doc_type: Optional[str] = Query(None),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    query = {"user_id": ObjectId(user_id)}
    if doc_type:
        query["doc_type"] = (doc_type or "").strip().upper()

    try:
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching documents: {str(e)}"
        )

# ========================
# LOAN OVERSIGHT (ESCALATED ONLY)
# ========================
@router.get("/loans")
async def list_loans(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    loans = await service.list_loans()
    return serialize_mongo(loans)


@router.get("/loans/escalated")
async def get_escalated_loans(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    loans = await service.get_escalated_loans()
    return serialize_mongo(loans)


@router.post("/loans/{loan_id}/decision")
async def decide_escalated_loan(
    loan_id: str,
    payload: AdminLoanDecisionRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    try:
        await service.decide_escalated_loan(
            admin_id=auth.user_id,
            loan_id=loan_id,
            decision=payload.decision,
            reason=payload.reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Admin decision applied to escalated loan"}


@router.get("/notifications")
async def list_admin_notifications(
    unread_only: bool = Query(False),
    active_only: bool = Query(True),
    limit: int = Query(25, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    notifications = await service.list_notifications(
        unread_only=unread_only,
        active_only=active_only,
        limit=limit,
    )
    return serialize_mongo(notifications)

@router.patch("/notifications/read-all")
async def mark_admin_notifications_read(
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return await service.mark_all_notifications_read()


@router.get("/loans/{loan_id}/noc")
async def get_loan_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    try:
        return await service.get_loan_noc(loan_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/loans/{loan_id}/noc/download")
async def download_loan_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    try:
        pdf_bytes, file_name = await service.download_loan_noc(loan_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
