from pydantic import BaseModel, Field, field_validator
from datetime import date
from app.enums.user import Gender
import re


class AddressSchema(BaseModel):
    line1: str
    city: str
    state: str
    pincode: str = Field(..., min_length=6, max_length=6)

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str):
        if not re.fullmatch(r"\d{6}", value or ""):
            raise ValueError("Pincode must be exactly 6 digits")
        return value


class NomineeSchema(BaseModel):
    name: str = Field(..., min_length=4, max_length=20)
    relation: str

    @field_validator("name")
    @classmethod
    def validate_nominee_name(cls, value: str):
        value = value.strip()
        if len(value) < 4 or len(value) > 20:
            raise ValueError("Nominee name must be between 4 and 20 characters")
        return value


class GuarantorSchema(BaseModel):
    name: str = Field(..., min_length=4, max_length=20)
    relation: str
    contact_no: str = Field(..., min_length=10, max_length=10)

    @field_validator("name")
    @classmethod
    def validate_guarantor_name(cls, value: str):
        value = value.strip()
        if len(value) < 4 or len(value) > 20:
            raise ValueError("Guarantor name must be between 4 and 20 characters")
        return value

    @field_validator("contact_no")
    @classmethod
    def validate_guarantor_contact(cls, value: str):
        if not re.fullmatch(r"\d{10}", value or ""):
            raise ValueError("Guarantor contact number must be exactly 10 digits")
        return value


class UserKYCRequest(BaseModel):
    aadhaar: str = Field(..., min_length=12, max_length=12)
    pan: str = Field(..., min_length=10, max_length=10)
    dob: date
    gender: Gender
    occupation: str = Field(..., min_length=2, max_length=15)
    address: AddressSchema
    nominee: NomineeSchema | None = None
    guarantor: GuarantorSchema | None = None

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, value: str):
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{10}", value):
            raise ValueError("PAN must be exactly 10 alphanumeric characters")
        return value

    @field_validator("occupation")
    @classmethod
    def validate_occupation(cls, value: str):
        value = value.strip()
        if len(value) < 2 or len(value) > 15:
            raise ValueError("Occupation must be between 2 and 15 characters")
        return value


class UserProfileUpdate(BaseModel):
    pan: str = Field(..., min_length=10, max_length=10)
    dob: date
    gender: Gender
    occupation: str = Field(..., min_length=2, max_length=15)
    address: AddressSchema
    nominee: NomineeSchema | None = None
    guarantor: GuarantorSchema | None = None

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, value: str):
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{10}", value):
            raise ValueError("PAN must be exactly 10 alphanumeric characters")
        return value

    @field_validator("occupation")
    @classmethod
    def validate_occupation(cls, value: str):
        value = value.strip()
        if len(value) < 2 or len(value) > 15:
            raise ValueError("Occupation must be between 2 and 15 characters")
        return value
