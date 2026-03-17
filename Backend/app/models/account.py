from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class Account(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")

    user_id: PyObjectId
    balance: float = Field(..., ge=0)
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
