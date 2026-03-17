from fastapi import APIRouter, HTTPException, status
from app.schemas.loan_application import PublicCibilCheckRequest
from app.services.loan_application_service import LoanApplicationService

router = APIRouter(prefix="/public", tags=["Public"])
service = LoanApplicationService()


@router.post("/cibil-check")
async def cibil_check(payload: PublicCibilCheckRequest):
    try:
        return await service.public_cibil_check(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
