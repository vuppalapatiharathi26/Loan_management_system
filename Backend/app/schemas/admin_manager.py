from pydantic import BaseModel, Field, field_validator
from app.enums.role import Role
import re

class CreateManagerRequest(BaseModel):
    manager_id: str = Field(..., min_length=2, max_length=6)
    name: str
    phone: str
    role: Role
    password: str = Field(..., min_length=6, max_length=13)

    @field_validator("manager_id")
    @classmethod
    def validate_manager_id(cls, value: str):
        value = value.strip()
        if len(value) < 2 or len(value) > 6:
            raise ValueError("Manager ID must be between 2 and 6 characters")
        if not re.fullmatch(r"[A-Za-z0-9]+", value):
            raise ValueError("Manager ID must be alphanumeric")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        value = value.strip()
        if len(value) < 6 or len(value) > 13:
            raise ValueError("Password must be between 6 and 13 characters")
        return value


class CreateManagerResponse(BaseModel):
    manager_id: str
    role: Role
    message: str
