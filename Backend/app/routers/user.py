from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import Optional
from bson import ObjectId
from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.services.user_service import UserService
from app.schemas.user_kyc import UserKYCRequest, UserProfileUpdate
from app.schemas.kyc_edit_request import KycEditRequest
from app.schemas.user_pin import DigiPinRequest
from app.db.mongodb import db

router = APIRouter()
service = UserService()


# =========================
# GET MY PROFILE
# =========================
@router.get("/me")
async def get_my_profile(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    user = await service.get_user_by_id(auth.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# =========================
# SUBMIT KYC
# =========================
@router.post("/me/kyc", status_code=200)
async def submit_kyc(
    payload: UserKYCRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        await service.submit_kyc(auth.user_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "KYC completed successfully"}


# =========================
# SET DIGI PIN (OPTIONAL)
# =========================
@router.post("/me/digi-pin", status_code=200)
async def set_digi_pin(
    payload: DigiPinRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        await service.set_digi_pin(auth.user_id, payload.aadhaar, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Digi PIN set successfully"}


# =========================
# GET FULL DETAILS
# =========================
@router.get("/me/details")
async def get_my_full_details(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    return await service.get_user_full_details(auth.user_id)


# =========================
# UPDATE PROFILE
# =========================
@router.put("/me/profile-update", status_code=200)
async def update_my_profile(
    payload: UserProfileUpdate,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        await service.update_profile(auth.user_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Profile updated successfully"}


# =========================
# REQUEST KYC EDIT (USER)
# =========================
@router.post("/me/kyc-edit-request", status_code=200)
async def request_kyc_edit(
    payload: KycEditRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        await service.request_kyc_edit(auth.user_id, payload.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "KYC edit request submitted"}


# =========================
# GET ACCOUNT DETAILS
# =========================
@router.get("/me/account")
async def get_my_account_details(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        account = await db.accounts.find_one({"user_id": ObjectId(auth.user_id)})
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


# =========================
# GET MY DOCUMENTS
# =========================
@router.get("/me/documents")
async def get_my_documents(
    request: Request,
    doc_type: Optional[str] = Query(None),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    query = {"user_id": ObjectId(auth.user_id)}
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
