from pydantic import BaseModel, Field, HttpUrl, field_validator
from app.enums.loan import LoanType, LoanApplicationStatus, SystemDecision
from typing import Optional

class LoanApplicationCreateRequest(BaseModel):
    loan_type: LoanType

    loan_amount: float = Field(
        ...,
        ge=1,
        le=5_000_000,
        description="Loan amount must be between 1 and 50 lakhs"
    )

    tenure_months: int = Field(
        ...,
        ge=1,
        le=360,
        description="Tenure must be between 1 and 360 months"
    )

    reason: str = Field(
        ...,
        min_length=10,
        description="Reason must be meaningful"
    )

    income_slip_url: HttpUrl

    monthly_income: float = Field(
        ...,
        ge=1,
        le=1_000_000,
        description="Monthly income must be between 1 and 10 lakhs"
    )

    occupation: str = Field(
        ...,
        min_length=1,
        max_length=25
    )

    pending_emis: int = Field(
        default=0,
        ge=0
    )

    previous_loans: int = Field(
        default=0,
        ge=0
    )

    @field_validator("occupation")
    @classmethod
    def normalize_occupation(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Occupation cannot be empty")
        return value


class LoanPreviewRequest(BaseModel):
    loan_amount: float = Field(..., ge=1, le=5_000_000, description="Loan amount must be between 1 and 50 lakhs")
    tenure_months: int = Field(..., ge=1, le=360, description="Tenure must be between 1 and 360 months")
    monthly_income: float = Field(..., ge=1, le=1_000_000, description="Monthly income must be between 1 and 10 lakhs")
    occupation: str = Field(..., min_length=1, max_length=25)
    income_slip_url: HttpUrl
    pending_emis: int = Field(..., ge=0)
    previous_loans: int = Field(..., ge=0)

    @field_validator("occupation")
    @classmethod
    def normalize_occupation(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Occupation cannot be empty")
        return value


class PublicCibilCheckRequest(BaseModel):
    loan_amount: float = Field(
        ...,
        ge=1,
        le=5_000_000,
        description="Loan amount must be between 1 and 50 lakhs"
    )
    monthly_income: float = Field(..., ge=1, le=1_000_000, description="Monthly income must be between 1 and 10 lakhs")
    occupation: str = Field(..., min_length=1, max_length=25)
    pending_emis: int = Field(default=0, ge=0)
    previous_loans: int = Field(default=0, ge=0)

    @field_validator("occupation")
    @classmethod
    def normalize_occupation(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Occupation cannot be empty")
        return value


class LoanApplicationResponse(BaseModel):
    loan_id: str
    status: str
    message: str

class LoanApplicationDetailResponse(BaseModel):
    loan_id: str
    user_id: str

    loan_type: LoanType
    loan_amount: str
    tenure_months: int

    reason: str
    income_slip_url: str

    cibil_score: Optional[int]
    risk_category: Optional[str]
    system_decision: Optional[SystemDecision]

    status: LoanApplicationStatus
    applied_at: str
