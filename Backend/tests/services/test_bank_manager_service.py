import pytest
from datetime import datetime

from app.services.bank_manager_service import BankManagerService
from app.enums.user import KYCStatus, UserApprovalStatus
from app.schemas.user_decision import UserDecision
from app.schemas.user_delete import DeleteDecision


# ======================================================
# FAKE REPOSITORIES (UNIT TEST ISOLATION)
# ======================================================

class FakeUserRepo:
    def __init__(self, user: dict):
        self.user = user
        self.deleted = False
        self.deletion_cleared = False
        self.collection = self.FakeCollection(self.user)

    class FakeCollection:
        def __init__(self, user: dict):
            self.user = user

        async def update_one(self, _filter, update):
            if "$set" in update:
                for k, v in update["$set"].items():
                    self.user[k] = v
            if "$unset" in update:
                for k in update["$unset"].keys():
                    self.user.pop(k, None)

        async def find_one(self, _filter, _proj=None):
            # Only used for pending_account uniqueness checks
            return None

    async def find_by_id(self, user_id):
        return self.user

    async def update_approval_status(self, user_id, approval_status, approved_by_manager_id):
        self.user["approval_status"] = approval_status
        self.user["approved_by_manager_id"] = approved_by_manager_id
        self.user["updated_at"] = datetime.utcnow()

    async def soft_delete_user(self, user_id, deleted_by):
        self.user["approval_status"] = UserApprovalStatus.DELETED
        self.user["deleted_by"] = deleted_by
        self.user["updated_at"] = datetime.utcnow()
        self.deleted = True

    async def list_users(self, **kwargs):
        async def _iter():
            yield self.user
        return _iter()

    async def clear_deletion_request(self, user_id):
        self.user.pop("deletion_requested", None)
        self.user.pop("deletion_requested_by", None)
        self.deletion_cleared = True

    async def update_kyc(self, user_id, update_data: dict):
        for k, v in update_data.items():
            self.user[k] = v


class FakeLoanRepo:
    def __init__(self, active_loans: int = 0):
        self.active_loans = active_loans

    async def count_active_loans(self, user_id):
        return self.active_loans


class FakeActiveLoanRepo:
    def __init__(self, active_loans: int = 0):
        self.active_loans = active_loans

    async def count_active_by_user(self, user_id):
        return self.active_loans


class FakeAuditRepo:
    def __init__(self):
        self.logs = []

    async def create(self, log):
        self.logs.append(log)


class FakeAccountRepo:
    def __init__(self):
        self.created = False
        self.updated = False
        self.last = None

    async def exists(self, user_id: str) -> bool:
        return False

    async def create_account(self, user_id: str, account_number: str | None = None, ifsc_code: str | None = None):
        self.created = True
        self.last = (user_id, account_number, ifsc_code)

    async def update_account_details(self, user_id: str, account_number: str, ifsc_code: str):
        self.updated = True
        self.last = (user_id, account_number, ifsc_code)

    async def find_by_account_number(self, account_number: str):
        return None

    async def get_by_user_id(self, user_id: str):
        return None


# ======================================================
# TEST SETUP HELPER
# ======================================================

def make_service(user: dict, active_loans: int = 0) -> BankManagerService:
    service = BankManagerService()
    service.user_repo = FakeUserRepo(user)
    service.loan_repo = FakeLoanRepo(active_loans)
    service.active_loan_repo = FakeActiveLoanRepo(active_loans)
    service.audit_repo = FakeAuditRepo()
    service.account_repo = FakeAccountRepo()
    return service


# ======================================================
# TESTS — USER APPROVAL / REJECTION
# ======================================================

@pytest.mark.asyncio
async def test_approve_user_success():
    user = {
        "_id": "u1",
        "kyc_status": KYCStatus.COMPLETED,
        "approval_status": UserApprovalStatus.PENDING,
        "pending_account": {"account_number": "123456789012", "ifsc_code": "MONI0000001"}
    }

    service = make_service(user)

    await service.decide_user(
        manager_id="m1",
        user_id="u1",
        decision=UserDecision.APPROVE,
        reason=None
    )

    assert user["approval_status"] == UserApprovalStatus.APPROVED


@pytest.mark.asyncio
async def test_reject_user_without_reason_fails():
    user = {
        "_id": "u1",
        "kyc_status": KYCStatus.COMPLETED,
        "approval_status": UserApprovalStatus.PENDING
    }

    service = make_service(user)

    with pytest.raises(ValueError, match="Rejection reason"):
        await service.decide_user(
            manager_id="m1",
            user_id="u1",
            decision=UserDecision.REJECT,
            reason=None
        )


@pytest.mark.asyncio
async def test_reject_user_success():
    user = {
        "_id": "u1",
        "kyc_status": KYCStatus.COMPLETED,
        "approval_status": UserApprovalStatus.PENDING
    }

    service = make_service(user)

    await service.decide_user(
        manager_id="m1",
        user_id="u1",
        decision=UserDecision.REJECT,
        reason="Invalid documents"
    )

    assert user["approval_status"] == UserApprovalStatus.REJECTED


# ======================================================
# TESTS — DIRECT USER DELETION
# ======================================================

@pytest.mark.asyncio
async def test_delete_user_with_active_loans_fails():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED
    }

    service = make_service(user, active_loans=1)

    with pytest.raises(ValueError, match="active loans"):
        await service.delete_user(
            manager_id="m1",
            user_id="u1",
            reason="Admin instruction"
        )


@pytest.mark.asyncio
async def test_delete_user_without_reason_fails():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED
    }

    service = make_service(user)

    with pytest.raises(ValueError, match="Deletion reason"):
        await service.delete_user(
            manager_id="m1",
            user_id="u1",
            reason=""
        )


@pytest.mark.asyncio
async def test_delete_user_success():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED
    }

    service = make_service(user)

    await service.delete_user(
        manager_id="m1",
        user_id="u1",
        reason="Account closed"
    )

    assert user["approval_status"] == UserApprovalStatus.DELETED
    assert service.user_repo.deleted is True


# ======================================================
# TESTS — ADMIN → MANAGER DELETION ESCALATION
# ======================================================

@pytest.mark.asyncio
async def test_admin_deletion_escalation_without_request_fails():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED
    }

    service = make_service(user)

    with pytest.raises(ValueError, match="No deletion request"):
        await service.handle_user_deletion_escalation(
            manager_id="m1",
            user_id="u1",
            decision=DeleteDecision.APPROVE,
            reason="Compliance"
        )


@pytest.mark.asyncio
async def test_admin_deletion_escalation_approve_success():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED,
        "deletion_requested": True
    }

    service = make_service(user)

    await service.handle_user_deletion_escalation(
        manager_id="m1",
        user_id="u1",
        decision=DeleteDecision.APPROVE,
        reason="Compliance"
    )

    assert user["approval_status"] == UserApprovalStatus.DELETED
    assert service.user_repo.deletion_cleared is True


@pytest.mark.asyncio
async def test_admin_deletion_escalation_reject():
    user = {
        "_id": "u1",
        "approval_status": UserApprovalStatus.APPROVED,
        "deletion_requested": True
    }

    service = make_service(user)

    await service.handle_user_deletion_escalation(
        manager_id="m1",
        user_id="u1",
        decision=DeleteDecision.REJECT,
        reason="Not eligible"
    )

    assert user["approval_status"] == UserApprovalStatus.APPROVED
    assert service.user_repo.deletion_cleared is True
