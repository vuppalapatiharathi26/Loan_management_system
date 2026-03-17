from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.services.account_service import AccountService
from app.utils.mongo_serializer import serialize_mongo
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta, time


class DigiTxRequest(BaseModel):
    amount: float = Field(..., gt=0)
    digi_pin: str = Field(..., min_length=4, max_length=6)

class DigiPinOnlyRequest(BaseModel):
    digi_pin: str = Field(..., min_length=4, max_length=6)

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"]
)

service = AccountService()


# =========================
# GET MY BALANCE
# =========================
@router.get("/me")
async def get_my_account(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.get_balance(auth.user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/me/bank-details")
async def get_my_bank_details(
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.get_bank_details(auth.user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =========================
# GET MY BALANCE (DIGI PIN VERIFIED)
# =========================
@router.post("/me/secure-balance")
async def get_my_account_secure(
    payload: DigiPinOnlyRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.get_balance_with_digipin(auth.user_id, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================
# DEPOSIT MONEY
# =========================
@router.post("/deposit", status_code=status.HTTP_200_OK)
async def deposit_money(
    amount: float = Query(..., gt=0),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.deposit(auth.user_id, amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================
# WITHDRAW MONEY
# =========================
@router.post("/withdraw", status_code=status.HTTP_200_OK)
async def withdraw_money(
    amount: float = Query(..., gt=0),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.withdraw(auth.user_id, amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================
# TRANSACTION HISTORY
# =========================
@router.get("/transactions")
async def get_transactions(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0, le=10_000),
    tx_type: str | None = Query(None, description="CREDIT or DEBIT"),
    date_from: str | None = Query(None, description="YYYY-MM-DD (inclusive)"),
    date_to: str | None = Query(None, description="YYYY-MM-DD (inclusive)"),
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    def parse_ymd(value: str | None) -> date | None:
        if not value or not str(value).strip():
            return None
        v = str(value).strip()
        try:
            return date.fromisoformat(v)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    d_from = parse_ymd(date_from)
    d_to = parse_ymd(date_to)
    if d_from and d_to and d_from > d_to:
        raise HTTPException(status_code=400, detail="date_from must be <= date_to")

    start_dt = datetime.combine(d_from, time.min) if d_from else None
    end_dt = (
        datetime.combine(d_to, time.min) + timedelta(days=1)
        if d_to else None
    )

    try:
        return await service.list_transactions_paged(
            auth.user_id,
            skip=skip,
            limit=limit,
            tx_type=tx_type,
            start=start_dt,
            end=end_dt
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================
# CREDIT (WITH DIGI PIN)
# =========================
@router.post("/credit")
async def credit_with_digipin(
    payload: DigiTxRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.credit_with_digipin(auth.user_id, payload.amount, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================
# DEBIT (WITH DIGI PIN)
# =========================
@router.post("/debit")
async def debit_with_digipin(
    payload: DigiTxRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await service.debit_with_digipin(auth.user_id, payload.amount, payload.digi_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
