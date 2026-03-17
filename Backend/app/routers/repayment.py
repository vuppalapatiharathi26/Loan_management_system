from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Header
from typing import Optional
from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.services.repayment_service import RepaymentService
from app.utils.mongo_serializer import serialize_mongo
from pydantic import BaseModel, Field
import stripe

router = APIRouter(
    prefix="/repayments",
    tags=["Repayments"]
)

service = RepaymentService()

class DigiPinOnlyRequest(BaseModel):
    digi_pin: str = Field(..., min_length=4, max_length=6)

class StripeVerifyRequest(BaseModel):
    payment_intent_id: str = Field(..., min_length=5)

# =====================================================
# LIST EMI SCHEDULE BY LOAN
# =====================================================
@router.get("/loan")
@router.get("/loan/{loan_id}")
async def get_emi_schedule(
    loan_id: Optional[str] = None,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    emis = await service.list_emis(
        user_id=auth.user_id,
        loan_id=loan_id
    )

    return {
        "loan_id": loan_id,
        "emis": emis
    }


# =====================================================
# PAY EMI
# =====================================================
@router.post("/emis/{emi_id}/pay", status_code=status.HTTP_200_OK)
async def pay_emi(
    emi_id: str,
    payload: DigiPinOnlyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.pay_emi(
            emi_id=emi_id,
            user_id=auth.user_id,
            digi_pin=payload.digi_pin
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/summary/{loan_application_id}")
async def get_repayment_summary(
    loan_application_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.get_repayment_summary(auth.user_id, loan_application_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/loan/{loan_application_id}/pay-emi", status_code=status.HTTP_200_OK)
async def pay_next_emi(
    loan_application_id: str,
    payload: DigiPinOnlyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.pay_next_emi(auth.user_id, loan_application_id, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/loan/{loan_application_id}/pay-full", status_code=status.HTTP_200_OK)
async def pay_full_amount(
    loan_application_id: str,
    payload: DigiPinOnlyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.pay_full_amount(auth.user_id, loan_application_id, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/loan/{loan_application_id}/pay-interest", status_code=status.HTTP_200_OK)
async def pay_interest_only(
    loan_application_id: str,
    payload: DigiPinOnlyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.pay_interest_only(auth.user_id, loan_application_id, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =====================================================
# STRIPE PAYMENT INTENTS
# =====================================================
@router.post("/stripe/emi/{emi_id}/intent", status_code=status.HTTP_200_OK)
async def create_stripe_intent_for_emi(
    emi_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.create_stripe_payment_intent_for_emi(auth.user_id, emi_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/loan/{loan_application_id}/pay-full/intent", status_code=status.HTTP_200_OK)
async def create_stripe_intent_for_full(
    loan_application_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.create_stripe_payment_intent_for_full(auth.user_id, loan_application_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/loan/{loan_application_id}/pay-interest/intent", status_code=status.HTTP_200_OK)
async def create_stripe_intent_for_interest(
    loan_application_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.create_stripe_payment_intent_for_interest(auth.user_id, loan_application_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature")
):
    payload = await request.body()
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = service._get_stripe_service().construct_event(
            payload=payload,
            sig_header=stripe_signature
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        return await service.handle_stripe_webhook(event)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/verify", status_code=status.HTTP_200_OK)
async def verify_stripe_payment(
    payload: StripeVerifyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.verify_stripe_payment_intent(payload.payment_intent_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =====================================================
# REPAYMENT HISTORY (ALL EMIs)
# =====================================================
@router.get("/history")
async def get_repayment_history(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    history = await service.list_repayments_by_user(auth.user_id)
    return serialize_mongo(history)
