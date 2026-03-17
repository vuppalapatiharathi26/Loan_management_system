from fastapi import APIRouter, HTTPException, status

from app.schemas.auth_user import (
    UserRegisterRequest,
    UserRegisterResponse,
    UserLoginRequest,
    TokenResponse
)
from app.services.user_service import UserService

router = APIRouter(
    tags=["Auth - User"]
)

service = UserService()

# =========================
# USER REGISTRATION
# =========================
@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(payload: UserRegisterRequest):
    try:
        user_id = await service.register_user(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return UserRegisterResponse(
        user_id=user_id,
        message="Registration successful. Please complete KYC."
    )

# =========================
# USER LOGIN
# =========================
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def login_user(payload: UserLoginRequest):
    try:
        token = await service.login_user_flexible(
            aadhaar=payload.aadhaar,
            password=payload.password,
            digi_pin=payload.digi_pin
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    return TokenResponse(access_token=token)
