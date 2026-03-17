import pytest
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from fastapi.testclient import TestClient

from app.main import app
from app.enums.role import Role
from app.auth.dependencies import AuthContext, get_current_user
from app.enums.loan import SystemDecision, LoanType
from app.schemas.loan_application import LoanApplicationCreateRequest
from app.services.loan_application_service import LoanApplicationService, IdempotencyKeyExpired
from app.core.config import settings


class FakeLoanRepo:
    def __init__(self):
        self.store = {}
        self.return_none_once = False
        self.force_duplicate = False

    async def find_by_idempotency_key(self, key: str):
        if self.return_none_once:
            self.return_none_once = False
            return None
        return self.store.get(key)

    async def create(self, data: dict):
        if self.force_duplicate or data["idempotency_key"] in self.store:
            raise DuplicateKeyError("dup", 11000, {})
        _id = ObjectId()
        doc = dict(data)
        doc["_id"] = _id
        self.store[data["idempotency_key"]] = doc
        return _id


class FakeUserRepo:
    async def find_by_id(self, user_id: str):
        return {
            "_id": ObjectId(user_id),
            "kyc_status": "COMPLETED",
            "approval_status": "APPROVED",
            "is_minor": False
        }


class FakeCreditRuleService:
    async def evaluate_cibil(self, score: int):
        return SystemDecision.AUTO_APPROVED


def make_payload():
    return LoanApplicationCreateRequest(
        loan_type=LoanType.PERSONAL,
        loan_amount=100000,
        tenure_months=12,
        reason="Need funds for medical expenses",
        income_slip_url="https://example.com/slip.pdf",
        monthly_income=50000,
        occupation="employee",
        pending_emis=0,
        previous_loans=0
    )


@pytest.mark.asyncio
async def test_idempotency_duplicate_returns_same_loan_id():
    service = LoanApplicationService()
    repo = FakeLoanRepo()
    service.repo = repo
    service.user_repo = FakeUserRepo()
    service.credit_rule_service = FakeCreditRuleService()

    payload = make_payload()
    user_id = str(ObjectId())

    first_id, reused = await service.create_loan_application(
        user_id=user_id,
        payload=payload,
        idempotency_key="key-123"
    )
    assert reused is False

    second_id, reused = await service.create_loan_application(
        user_id=user_id,
        payload=payload,
        idempotency_key="key-123"
    )
    assert reused is True
    assert first_id == second_id


@pytest.mark.asyncio
async def test_idempotency_duplicate_key_race_returns_existing():
    service = LoanApplicationService()
    repo = FakeLoanRepo()
    repo.return_none_once = True
    repo.force_duplicate = True

    existing_id = ObjectId()
    repo.store["key-race"] = {
        "_id": existing_id,
        "idempotency_key": "key-race",
        "idempotency_created_at": datetime.utcnow()
    }

    service.repo = repo
    service.user_repo = FakeUserRepo()
    service.credit_rule_service = FakeCreditRuleService()

    payload = make_payload()
    user_id = str(ObjectId())

    loan_id, reused = await service.create_loan_application(
        user_id=user_id,
        payload=payload,
        idempotency_key="key-race"
    )
    assert reused is True
    assert loan_id == str(existing_id)


@pytest.mark.asyncio
async def test_idempotency_expired_key_raises():
    service = LoanApplicationService()
    repo = FakeLoanRepo()
    service.repo = repo
    service.user_repo = FakeUserRepo()
    service.credit_rule_service = FakeCreditRuleService()

    old = datetime.utcnow() - timedelta(hours=settings.IDEMPOTENCY_WINDOW_HOURS + 1)
    repo.store["key-old"] = {
        "_id": ObjectId(),
        "idempotency_key": "key-old",
        "idempotency_created_at": old
    }

    payload = make_payload()
    user_id = str(ObjectId())

    with pytest.raises(IdempotencyKeyExpired):
        await service.create_loan_application(
            user_id=user_id,
            payload=payload,
            idempotency_key="key-old"
        )


def test_missing_idempotency_header_returns_400():
    def override_auth():
        return AuthContext(user_id=str(ObjectId()), role=Role.USER)

    app.dependency_overrides[get_current_user] = override_auth
    client = TestClient(app)

    payload = make_payload().model_dump()
    response = client.post("/loans", json=payload)

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Missing Idempotency-Key header"
