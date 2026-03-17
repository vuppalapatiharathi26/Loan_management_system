from fastapi import APIRouter, HTTPException, status

from app.schemas.homepage_cibil import (
    HomepageCibilEstimateRequest,
    HomepageCibilEstimateResponse,
)
from app.services.homepage_cibil_service import HomepageCibilService


router = APIRouter(prefix="/public/cibil", tags=["Public - CIBIL"])
service = HomepageCibilService()


@router.post("/estimate", response_model=HomepageCibilEstimateResponse)
async def estimate_cibil(payload: HomepageCibilEstimateRequest):
    try:
        return await service.estimate_and_store(payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

