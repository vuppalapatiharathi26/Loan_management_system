from pydantic import BaseModel, Field


class DigiPinRequest(BaseModel):
    aadhaar: str = Field(..., min_length=12, max_length=12)
    digi_pin: str = Field(..., min_length=4, max_length=6)
