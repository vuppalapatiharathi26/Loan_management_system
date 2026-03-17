from datetime import date
from pydantic import BaseModel, Field, constr


IndianPhone = constr(pattern=r"^[6-9]\d{9}$")
EmailRegex = constr(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class HomepageCibilEstimateRequest(BaseModel):
    # Step 1 - Lead capture
    fullName: constr(min_length=3, strip_whitespace=True)
    phone: IndianPhone
    email: EmailRegex
    dob: date

    # Step 2 - Financial details
    netIncome: float = Field(..., gt=0)
    employmentType: constr(pattern=r"^(government|private|startup|freelancer|selfEmployed)$")
    experienceYears: float = Field(..., ge=0)
    totalEmi: float = Field(..., ge=0)
    missedEmiLast12Months: int = Field(..., ge=0)
    hasDefaulted: bool
    hasSettledAccount: bool
    creditUtilization: float = Field(..., ge=0, le=100)
    residenceType: constr(pattern=r"^(owned|rented|parents)$")
    addressYears: float = Field(..., ge=0)


class HomepageCibilEstimateResponse(BaseModel):
    score: int
    band: str
    breakdown: dict

