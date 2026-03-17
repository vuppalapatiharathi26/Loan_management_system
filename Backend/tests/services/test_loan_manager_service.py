import pytest
from datetime import datetime
from bson import ObjectId

from app.services.loan_manager_service import LoanManagerService
from app.enums.loan import LoanApplicationStatus, SystemDecision
from app.schemas.loan_decision import LoanDecision


# ======================================================
# FAKE REPOSITORIES
# ======================================================

class FakeLoanApplicationRepo:
    def __init__(self, loan: dict):
        self.loan = loan
        self.updated = {}

    async def find_by_id(self, loan_id: str):
        return self.loan

    @property
    def collection(self):
        return self

    async def update_one(self, query, update):
        self.updated.update(update.get("$set", {}))
        self.loan.update(update.get("$set", {}))


class FakeLoanRepo:
    def __init__(self):
        self.created_loan = None

    async def create(self, payload: dict):
        self.created_loan = payload
        return ObjectId("507f1f77bcf86cd799439011")


class FakeAuditRepo:
    def __init__(self):
        self.logs = []

    async def create(self, log: dict):
        self.logs.append(log)


class FakeAccountService:
    def __init__(self):
        self.deposits = []

    async def deposit(self, user_id: str, amount: float, **kwargs):
        self.deposits.append((user_id, amount, kwargs))


# ======================================================
# SERVICE FACTORY
# ======================================================

def make_service(loan: dict) -> LoanManagerService:
    service = LoanManagerService()
    service.loan_app_repo = FakeLoanApplicationRepo(loan)
    service.loan_repo = FakeLoanRepo()
    service.audit_repo = FakeAuditRepo()
    service.account_service = FakeAccountService()
    return service


# ======================================================
# TESTS
# ======================================================

@pytest.mark.asyncio
async def test_manual_decision_approve_success():
    loan = {
        "_id": ObjectId(),
        "system_decision": SystemDecision.MANUAL_REVIEW,
        "status": LoanApplicationStatus.PENDING,
        "active_loan_id": ObjectId(),
        "emi_preview": 1000.0,
        "disbursed": True,
        "loan_amount": 100000,
        "interest_rate": 10.0,
        "tenure_months": 12
    }

    service = make_service(loan)

    await service.decide_loan(
        loan_id=str(loan["_id"]),
        manager_id=str(ObjectId()),
        decision=LoanDecision.APPROVE,
        reason="Income verified"
    )

    assert loan["status"] == LoanApplicationStatus.APPROVED
    assert "decision_reason" not in loan or loan["decision_reason"] is None


@pytest.mark.asyncio
async def test_manual_decision_not_allowed_for_auto():
    loan = {
        "_id": ObjectId(),
        "system_decision": SystemDecision.AUTO_APPROVED,
        "status": LoanApplicationStatus.PENDING
    }

    service = make_service(loan)

    with pytest.raises(ValueError, match="MANUAL_REVIEW"):
        await service.decide_loan(
            loan_id=str(loan["_id"]),
            manager_id=str(ObjectId()),
            decision=LoanDecision.REJECT,
            reason="Not allowed"
        )


@pytest.mark.asyncio
async def test_confirm_auto_approved_success():
    loan = {
        "_id": ObjectId(),
        "system_decision": SystemDecision.AUTO_APPROVED,
        "status": LoanApplicationStatus.PENDING,
        "active_loan_id": ObjectId(),
        "disbursed": True,
        "loan_amount": 100000,
        "interest_rate": 10.0,
        "tenure_months": 12
    }

    service = make_service(loan)

    await service.confirm_auto_approved(
        loan_id=str(loan["_id"]),
        manager_id=str(ObjectId())
    )

    assert loan["status"] == LoanApplicationStatus.APPROVED


@pytest.mark.asyncio
async def test_confirm_auto_rejected_success():
    loan = {
        "_id": ObjectId(),
        "system_decision": SystemDecision.AUTO_REJECTED,
        "status": LoanApplicationStatus.PENDING
    }

    service = make_service(loan)

    await service.confirm_auto_rejected(
        loan_id=str(loan["_id"]),
        manager_id=str(ObjectId())
    )

    assert loan["status"] == LoanApplicationStatus.REJECTED


@pytest.mark.asyncio
async def test_escalate_to_admin_sets_flag():
    loan = {
        "_id": ObjectId(),
        "system_decision": SystemDecision.MANUAL_REVIEW,
        "status": LoanApplicationStatus.PENDING
    }

    service = make_service(loan)

    await service.escalate_to_admin(
        loan_id=str(loan["_id"]),
        manager_id=str(ObjectId()),
        reason="High value loan"
    )

    assert loan["escalated"] is True
    assert loan["escalated_reason"] == "High value loan"


@pytest.mark.asyncio
async def test_finalize_loan_success():
    loan = {
        "_id": ObjectId(),
        "user_id": ObjectId(),
        "loan_amount": 100000,
        "status": LoanApplicationStatus.APPROVED
    }

    service = make_service(loan)

    result = await service.finalize_loan(
        loan_id=str(loan["_id"]),
        interest_rate=None,
        tenure_months=0,
        manager_id=str(ObjectId())
    )

    assert loan["status"] == "FINALIZED"
    assert result["message"] == "Loan finalized successfully"
