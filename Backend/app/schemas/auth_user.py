from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re


# =========================
# USER REGISTRATION
# =========================
class UserRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=20)
    last_name: str = Field(..., min_length=2, max_length=20)
    phone: str = Field(..., min_length=10, max_length=10)
    aadhaar: str = Field(..., min_length=12, max_length=12)
    password: str = Field(..., min_length=6, max_length=13)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, value: str):
        value = value.strip()
        if len(value) < 2 or len(value) > 20:
            raise ValueError("Name must be between 2 and 20 characters")
        if re.search(r"\d", value):
            raise ValueError("Name must not contain numbers")
        if not re.fullmatch(r"[A-Za-z]+(?: [A-Za-z]+)*", value):
            raise ValueError("Name must contain only letters and spaces")

        normalized = " ".join(
            word[:1].upper() + word[1:].lower()
            for word in value.split()
        )
        if not re.fullmatch(r"[A-Z][a-z]*(?: [A-Z][a-z]*)*", normalized):
            raise ValueError("Each word in name must start with a capital letter")

        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str):
        if not re.fullmatch(r"\d{10}", value or ""):
            raise ValueError("Phone number must be exactly 10 digits")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        value = value.strip()
        if len(value) < 6 or len(value) > 13:
            raise ValueError("Password must be between 6 and 13 characters")
        return value


class UserRegisterResponse(BaseModel):
    user_id: str
    message: str


# =========================
# USER LOGIN (FLEXIBLE)
# =========================
class UserLoginRequest(BaseModel):
    aadhaar: Optional[str] = Field(None, min_length=12, max_length=12)
    password: Optional[str] = None
    digi_pin: Optional[str] = Field(None, min_length=4, max_length=6)


# =========================
# TOKEN RESPONSE
# =========================
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
