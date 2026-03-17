from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from io import BytesIO
from typing import Optional
 
from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.enums.loan import SystemDecision
from app.schemas.loan_decision import (
    LoanDecisionRequest,
    LoanFinalizeRequest,
    LoanEscalationRequest,
    LoanAutoDecisionRequest,
    NocRejectRequest,
)
from app.services.loan_manager_service import LoanManagerService
 
router = APIRouter(
    prefix="/manager/loan",
    tags=["Loan Manager"]
)
 
service = LoanManagerService()
 
# =========================
# LIST LOAN APPLICATIONS
# =========================
@router.get("/applications")
async def view_loans(
    system_decision: Optional[SystemDecision] = None,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    return await service.list_loans(system_decision)
 
# =========================
# FINALIZABLE LOANS
# (static route → must be above {loan_id})
# =========================
@router.get("/applications/finalizable")
async def get_finalizable_loans(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    return await service.list_loans_ready_for_finalization()
 
# =========================
# MANUAL DECISION
# =========================
@router.post("/applications/{loan_id}/decision")
async def decide_loan(
    loan_id: str,
    payload: LoanDecisionRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    try:
        await service.decide_loan(
            loan_id=loan_id,
            manager_id=auth.user_id,
            decision=payload.decision,
            reason=payload.reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
 
    return {"message": f"Loan {payload.decision.lower()}ed successfully"}
 
# =========================
# AUTO DECISION CONFIRMATION
# =========================
@router.post("/applications/{loan_id}/auto-decision")
async def confirm_auto_decision(
    loan_id: str,
    payload: LoanAutoDecisionRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    if payload.system_decision == SystemDecision.AUTO_APPROVED:
        await service.confirm_auto_approved(loan_id, auth.user_id)
        return {"message": "Loan auto-approved successfully"}
 
    if payload.system_decision == SystemDecision.AUTO_REJECTED:
        await service.confirm_auto_rejected(loan_id, auth.user_id)
        return {"message": "Loan auto-rejected successfully"}
 
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid system decision"
    )
 
# =========================
# ESCALATION (MANAGER → ADMIN)
# =========================
@router.post("/applications/{loan_id}/escalate")
async def escalate_loan(
    loan_id: str,
    payload: LoanEscalationRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    await service.escalate_to_admin(
        loan_id=loan_id,
        manager_id=auth.user_id,
        reason=payload.reason
    )
 
    return {"message": "Loan escalated to admin for final decision"}
 
# =========================
# VIEW ESCALATED LOANS
# =========================
@router.get("/applications/escalated")
async def get_escalated_loans(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    return await service.list_escalated_loans()


# =========================
# LOAN HISTORY (FINALIZED + CLOSED)
# =========================
@router.get("/applications/finalized")
async def get_finalized_loans(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )

    return await service.list_finalized_loans()
 
# =========================
# FINALIZATION
# =========================
@router.post("/applications/{loan_id}/finalize")
async def finalize_loan(
    loan_id: str,
    payload: LoanFinalizeRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )
 
    try:
        await service.finalize_loan(
            loan_id=loan_id,
            manager_id=auth.user_id,
            interest_rate=payload.interest_rate,
            tenure_months=payload.tenure_months
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
 
    return {"message": "Loan finalized successfully"}


# =========================
# NOC APPROVAL (POST-CLOSURE)
# =========================
@router.post("/applications/{loan_id}/noc/approve")
async def approve_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )

    try:
        return await service.approve_noc(loan_id=loan_id, manager_id=auth.user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/applications/{loan_id}/noc/reject")
async def reject_noc(
    loan_id: str,
    payload: NocRejectRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )

    try:
        return await service.reject_noc(loan_id=loan_id, manager_id=auth.user_id, reason=payload.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/applications/{loan_id}/noc/download")
async def download_noc(
    loan_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.LOAN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Loan Manager access required"
        )

    try:
        pdf_bytes, file_name = await service.generate_noc_pdf_for_manager(loan_id=loan_id)
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
