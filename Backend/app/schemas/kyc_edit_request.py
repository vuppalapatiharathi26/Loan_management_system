from pydantic import BaseModel


class KycEditRequest(BaseModel):
    reason: str
