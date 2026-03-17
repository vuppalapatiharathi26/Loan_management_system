from datetime import date
from pydantic import BaseModel, Field

from app.enums.user import Gender
from app.schemas.user_kyc import AddressSchema


class KycDraftRequest(BaseModel):
    aadhaar: str = Field(..., min_length=12, max_length=12)
    pan: str
    dob: date
    gender: Gender
    occupation: str
    address: AddressSchema
