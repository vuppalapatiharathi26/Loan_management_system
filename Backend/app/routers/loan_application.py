from fastapi import APIRouter, Header, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from typing import Optional
from app.schemas.loan_application import (
    LoanApplicationCreateRequest,
    LoanPreviewRequest,
    LoanApplicationResponse
)
from app.services.loan_application_service import LoanApplicationService, IdempotencyKeyExpired
from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
 
router = APIRouter(prefix="/loans", tags=["Loans"])
service = LoanApplicationService()
 
 
# =========================
# APPLY LOAN
# =========================
@router.post("", response_model=LoanApplicationResponse, status_code=201)
async def apply_loan(
    payload: LoanApplicationCreateRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Idempotency-Key header"
        )

    try:
        loan_id, reused = await service.create_loan_application(
            user_id=auth.user_id,
            payload=payload,
            idempotency_key=idempotency_key
        )
    except IdempotencyKeyExpired as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
 
    if reused:
        return LoanApplicationResponse(
            loan_id=loan_id,
            status="EXISTING",
            message="Loan application already exists"
        )
 
    return LoanApplicationResponse(
        loan_id=loan_id,
        status="CREATED",
        message="Loan application submitted successfully"
    )
 
 
# =========================
# GET LOANS (OPTIONAL loan_id)
# =========================
@router.get("")
async def get_loans(
    loan_id: Optional[str] = Query(None, description="Loan ID (optional)"),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)
 
    # 🔹 If loan_id provided → fetch single loan
    if loan_id:
        return await service.get_loan_application(loan_id)
 
    # 🔹 Else → fetch all loans of the user
    return await service.get_user_loans(auth.user_id)


@router.get("/{loan_id}/details")
async def get_loan_details(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    try:
        return await service.get_user_loan_details(auth.user_id, loan_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{loan_id}/noc")
async def get_loan_noc_details(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    try:
        return await service.get_user_noc_details(auth.user_id, loan_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{loan_id}/noc/request")
async def request_loan_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    try:
        return await service.request_noc(auth.user_id, loan_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{loan_id}/noc/download")
async def download_loan_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    try:
        pdf_bytes, file_name = await service.generate_user_noc_pdf(auth.user_id, loan_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


# =========================
# LOAN PREVIEW
# =========================
@router.post("/preview")
async def loan_preview(
    payload: LoanPreviewRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403)

    try:
        return await service.preview_loan(auth.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
