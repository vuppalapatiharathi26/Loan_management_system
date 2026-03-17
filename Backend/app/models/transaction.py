from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


TransactionType = Literal["CREDIT", "DEBIT"]
TransactionReference = Literal[
    "DEPOSIT",
    "WITHDRAWAL",
    "LOAN_DISBURSEMENT",
    "EMI_PAYMENT",
    "FULL_LOAN_REPAYMENT",
    "INTEREST_ONLY_PAYMENT",
    "CREDIT_DIGIPIN",
    "DEBIT_DIGIPIN",
    "ADJUSTMENT"
]


class Transaction(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")

    user_id: PyObjectId

    type: TransactionType
    amount: float = Field(..., gt=0)

    reference: TransactionReference

    loan_id: Optional[PyObjectId] = None
    emi_number: Optional[int] = None

    balance_after: float = Field(..., ge=0)

    created_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
