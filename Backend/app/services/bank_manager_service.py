from datetime import datetime, date
import secrets
from typing import Optional

from app.repositories.user_repository import UserRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.loan_application_repository import LoanApplicationRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.account_repository import AccountRepository

from app.enums.user import KYCStatus, UserApprovalStatus
from app.schemas.user_decision import UserDecision
from app.schemas.user_delete import DeleteDecision


class BankManagerService:
    STATE_IFSC_SUFFIX = {
        "Andhra Pradesh": "000001",
        "Arunachal Pradesh": "000002",
        "Assam": "000003",
        "Bihar": "000004",
        "Chhattisgarh": "000005",
        "Goa": "000006",
        "Gujarat": "000007",
        "Haryana": "000008",
        "Himachal Pradesh": "000009",
        "Jharkhand": "000010",
        "Karnataka": "000011",
        "Kerala": "000012",
        "Madhya Pradesh": "000013",
        "Maharashtra": "000014",
        "Manipur": "000015",
        "Meghalaya": "000016",
        "Mizoram": "000017",
        "Nagaland": "000018",
        "Odisha": "000019",
        "Punjab": "000020",
        "Rajasthan": "000021",
        "Sikkim": "000022",
        "Tamil Nadu": "000023",
        "Telangana": "000024",
        "Tripura": "000025",
        "Uttar Pradesh": "000026",
        "Uttarakhand": "000027",
        "West Bengal": "000028",
    }

    def __init__(self):
        self.user_repo = UserRepository()
        self.loan_repo = LoanApplicationRepository()
        self.active_loan_repo = LoanRepository()
        self.audit_repo = AuditLogRepository()
        self.account_repo = AccountRepository()

    def _get_ifsc_for_state(self, state: str) -> str:
        normalized = (state or "").strip()
        suffix = self.STATE_IFSC_SUFFIX.get(normalized)
        if not suffix:
            raise ValueError("Invalid or unsupported state for IFSC generation")
        return f"MONI0{suffix}"

    async def _generate_unique_account_number(self) -> str:
        for _ in range(20):
            candidate = "".join(secrets.choice("0123456789") for _ in range(12))
            existing = await self.account_repo.find_by_account_number(candidate)
            if not existing:
                pending = await self.user_repo.collection.find_one(
                    {"pending_account.account_number": candidate},
                    {"_id": 1}
                )
                if not pending:
                    return candidate
        raise ValueError("Unable to generate unique account number. Try again.")

    # ========================
    # USER APPROVAL / REJECTION
    # ========================
    async def decide_user(
        self,
        manager_id: str,
        user_id: str,
        decision: UserDecision,
        reason: Optional[str],
        account_number: Optional[str] = None,
        ifsc_code: Optional[str] = None
    ):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("kyc_status") != KYCStatus.COMPLETED:
            raise ValueError("KYC not completed")

        if user.get("approval_status") != UserApprovalStatus.PENDING:
            raise ValueError("User already processed")

        if decision == UserDecision.REJECT and not reason:
            raise ValueError("Rejection reason is mandatory")

        approval_status = (
            UserApprovalStatus.APPROVED
            if decision == UserDecision.APPROVE
            else UserApprovalStatus.REJECTED
        )

        if decision == UserDecision.APPROVE:
            draft = user.get("kyc_review_draft")
            if draft:
                update_data = {
                    "aadhaar": draft.get("aadhaar") or user.get("aadhaar"),
                    "pan": draft.get("pan") or user.get("pan"),
                    "dob": draft.get("dob") or user.get("dob"),
                    "gender": draft.get("gender") or user.get("gender"),
                    "occupation": draft.get("occupation") or user.get("occupation"),
                    "address": draft.get("address") or user.get("address"),
                    "updated_at": datetime.utcnow(),
                }
                await self.user_repo.update_kyc(user_id, update_data)
                await self.user_repo.collection.update_one(
                    {"_id": user["_id"]},
                    {"$unset": {"kyc_review_draft": "", "kyc_review_draft_updated_at": "", "kyc_review_draft_by": ""}}
                )

            pending_account = user.get("pending_account") or {}
            acc_number = account_number or pending_account.get("account_number")
            ifsc = ifsc_code or pending_account.get("ifsc_code")
            if not acc_number or not ifsc:
                raise ValueError("Account details not generated")
            if not acc_number.isdigit() or len(acc_number) != 12:
                raise ValueError("Invalid account number")
            if not (ifsc.startswith("MONI0") and len(ifsc) == 11):
                raise ValueError("Invalid IFSC code")

            existing = await self.account_repo.find_by_account_number(acc_number)
            if existing and str(existing.get("user_id")) != str(user["_id"]):
                raise ValueError("Account number already assigned")

        await self.user_repo.update_approval_status(
            user_id=user_id,
            approval_status=approval_status,
            approved_by_manager_id=manager_id
        )

        if decision == UserDecision.APPROVE:
            if not await self.account_repo.exists(user_id):
                await self.account_repo.create_account(user_id, acc_number, ifsc)
            else:
                await self.account_repo.update_account_details(user_id, acc_number, ifsc)
            await self.user_repo.collection.update_one(
                {"_id": user["_id"]},
                {"$unset": {"pending_account": ""}}
            )

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "BANK_MANAGER",
            "action": f"USER_{decision.value}",
            "entity_type": "USER",
            "entity_id": user_id,
            "remarks": reason,
            "timestamp": datetime.utcnow()
        })

    # ========================
    # LIST USERS
    # ========================
    async def list_users(
        self,
        approval_status: Optional[str] = None,
        kyc_status: Optional[str] = None,
        deletion_requested: Optional[bool] = None
    ):
        users_cursor = await self.user_repo.list_users(
            approval_status=approval_status,
            kyc_status=kyc_status,
            deletion_requested=deletion_requested
        )

        users = []
        async for user in users_cursor:
            users.append({
                "user_id": str(user["_id"]),
                "name": user.get("name"),
                "phone": user.get("phone"),
                "kyc_status": user.get("kyc_status"),
                "approval_status": user.get("approval_status"),
                "is_minor": user.get("is_minor", False),
                "aadhaar": user.get("aadhaar"),
                "deletion_requested": user.get("deletion_requested", False),
                "kyc_edit_requested": user.get("kyc_edit_requested", False),
                "kyc_edit_request_reason": user.get("kyc_edit_request_reason"),
                "kyc_edit_requested_at": (
                    user.get("kyc_edit_requested_at").isoformat()
                    if user.get("kyc_edit_requested_at") else None
                ),
                "created_at": user.get("created_at").isoformat()
                if user.get("created_at") else None
            })

        return users

    # ========================
    # USER DETAILS
    # ========================
    async def get_user_details(self, user_id: str):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        account = await self.account_repo.get_by_user_id(user_id)

        return {
            "user_id": str(user["_id"]),
            "name": user.get("name"),
            "phone": user.get("phone"),
            "kyc_status": user.get("kyc_status"),
            "approval_status": user.get("approval_status"),
            "is_minor": user.get("is_minor", False),
            "aadhaar": user.get("aadhaar"),
            "pan": user.get("pan"),
            "dob": user.get("dob").isoformat() if user.get("dob") else None,
            "gender": user.get("gender"),
          "occupation": user.get("occupation"),
          "address": user.get("address"),
          "account_number": account.get("account_number") if account else None,
          "ifsc_code": account.get("ifsc_code") if account else None,
          "kyc_edit_request": {
              "requested": bool(user.get("kyc_edit_requested")),
              "reason": user.get("kyc_edit_request_reason"),
              "requested_at": (
                  user.get("kyc_edit_requested_at").isoformat()
                  if user.get("kyc_edit_requested_at") else None
              ),
          },
          "created_at": user.get("created_at").isoformat(),
          "updated_at": user.get("updated_at").isoformat()
          if user.get("updated_at") else None
          }

    # ========================
    # USER KYC DETAILS
    # ========================
    async def get_user_kyc_details(self, user_id: str):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("kyc_status") != KYCStatus.COMPLETED:
            raise ValueError("KYC not completed")

        if user.get("approval_status") == UserApprovalStatus.DELETED:
            raise ValueError("User is deleted")

        return {
            "user_id": str(user["_id"]),
            "name": user.get("name"),
            "phone": user.get("phone"),
            "kyc": {
                "aadhaar": user.get("aadhaar"),
                "pan": user.get("pan"),
                "dob": user.get("dob").isoformat() if user.get("dob") else None,
                "gender": user.get("gender"),
                "occupation": user.get("occupation"),
                "address": user.get("address")
            },
            "kyc_draft": user.get("kyc_review_draft"),
          "pending_account": user.get("pending_account"),
          "kyc_edit_request": {
              "requested": bool(user.get("kyc_edit_requested")),
              "reason": user.get("kyc_edit_request_reason"),
              "requested_at": (
                  user.get("kyc_edit_requested_at").isoformat()
                  if user.get("kyc_edit_requested_at") else None
              ),
          },
          "approval_status": user.get("approval_status"),
          "approved_by_manager_id": (
              str(user.get("approved_by_manager_id"))
              if user.get("approved_by_manager_id") else None
          ),
            "created_at": user.get("created_at").isoformat()
        }

    async def save_kyc_draft(self, manager_id: str, user_id: str, draft: dict):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("kyc_status") != KYCStatus.COMPLETED:
            raise ValueError("KYC not completed")

        approval_status = user.get("approval_status")
        if approval_status not in (UserApprovalStatus.PENDING, UserApprovalStatus.APPROVED):
            raise ValueError("User is not editable in the current state")
        if not user.get("kyc_edit_requested"):
            raise ValueError("User has not requested KYC edit")

        draft_payload = dict(draft)
        dob = draft_payload.get("dob")
        if isinstance(dob, date) and not isinstance(dob, datetime):
            draft_payload["dob"] = datetime.combine(dob, datetime.min.time())

        # While pending, manager saves a draft for the user to review (and for approval apply).
        if approval_status == UserApprovalStatus.PENDING:
            next_state = ((draft_payload.get("address") or {}).get("state") or "").strip()
            update_data = {
                "kyc_review_draft": draft_payload,
                "kyc_review_draft_updated_at": datetime.utcnow(),
                "kyc_review_draft_by": manager_id
            }
            pending_account = user.get("pending_account") or None
            if pending_account and next_state:
                update_data["pending_account"] = {
                    **pending_account,
                    "state": next_state,
                    "ifsc_code": self._get_ifsc_for_state(next_state)
                }
            await self.user_repo.collection.update_one(
                {"_id": user["_id"]},
                {"$set": update_data}
            )
            return {"mode": "DRAFT_SAVED"}

        # After approval, user profile is locked. Any manager edits should directly update
        # the user's stored KYC so it reflects immediately in /users/me/details.
        update_data = {
            "aadhaar": draft_payload.get("aadhaar") or user.get("aadhaar"),
            "pan": draft_payload.get("pan") or user.get("pan"),
            "dob": draft_payload.get("dob") or user.get("dob"),
            "gender": draft_payload.get("gender") or user.get("gender"),
            "occupation": draft_payload.get("occupation") or user.get("occupation"),
            "address": draft_payload.get("address") or user.get("address"),
            "nominee": draft_payload.get("nominee") if "nominee" in draft_payload else user.get("nominee"),
            "guarantor": draft_payload.get("guarantor") if "guarantor" in draft_payload else user.get("guarantor"),
            "updated_at": datetime.utcnow(),
        }
        await self.user_repo.update_kyc(user_id, update_data)
        next_state = ((update_data.get("address") or {}).get("state") or "").strip()
        if next_state:
            account = await self.account_repo.get_by_user_id(user_id)
            if account and account.get("account_number"):
                await self.account_repo.update_account_details(
                    user_id,
                    account.get("account_number"),
                    self._get_ifsc_for_state(next_state)
                )
        await self.user_repo.collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {"kyc_review_draft": "", "kyc_review_draft_updated_at": "", "kyc_review_draft_by": ""}}
        )

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "BANK_MANAGER",
            "action": "KYC_UPDATED_AFTER_APPROVAL",
            "entity_type": "USER",
            "entity_id": user_id,
            "timestamp": datetime.utcnow()
        })
        return {"mode": "KYC_UPDATED"}

    # ========================
    # CLEAR KYC EDIT REQUEST
    # ========================
    async def clear_kyc_edit_request(self, manager_id: str, user_id: str):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        await self.user_repo.collection.update_one(
            {"_id": user["_id"]},
            {
                "$unset": {
                    "kyc_edit_requested": "",
                    "kyc_edit_request_reason": "",
                    "kyc_edit_requested_at": "",
                    "kyc_edit_requested_by": ""
                },
                "$set": {
                    "kyc_edit_cleared_by": manager_id,
                    "kyc_edit_cleared_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def generate_account_details(self, manager_id: str, user_id: str):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("kyc_status") != KYCStatus.COMPLETED:
            raise ValueError("KYC not completed")

        if user.get("approval_status") != UserApprovalStatus.PENDING:
            raise ValueError("User already processed")

        draft = user.get("kyc_review_draft") or {}
        state = (draft.get("address") or {}).get("state") or (user.get("address") or {}).get("state")
        if not state:
            raise ValueError("State is required for IFSC generation")

        ifsc = self._get_ifsc_for_state(state)
        account_number = await self._generate_unique_account_number()

        pending = {
            "account_number": account_number,
            "ifsc_code": ifsc,
            "generated_at": datetime.utcnow(),
            "generated_by": manager_id,
            "state": state
        }
        await self.user_repo.collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"pending_account": pending}}
        )
        return pending

    # ========================
    # DIRECT USER DELETION
    # ========================
    async def delete_user(
        self,
        manager_id: str,
        user_id: str,
        reason: str
    ):
        if not reason:
            raise ValueError("Deletion reason is mandatory")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("approval_status") == UserApprovalStatus.DELETED:
            raise ValueError("User already deleted")

        active_loans = await self.loan_repo.count_active_loans(user_id)
        if active_loans > 0:
            raise ValueError("User has active loans")
        active_disbursed = await self.active_loan_repo.count_active_by_user(user_id)
        if active_disbursed > 0:
            raise ValueError("User has active loans")

        await self.user_repo.soft_delete_user(
            user_id=user_id,
            deleted_by=manager_id
        )

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "BANK_MANAGER",
            "action": "USER_DELETED",
            "entity_type": "USER",
            "entity_id": user_id,
            "remarks": reason,
            "timestamp": datetime.utcnow()
        })

    # ========================
    # ADMIN -> MANAGER DELETION ESCALATION
    # ========================
    async def handle_user_deletion_escalation(
        self,
        manager_id: str,
        user_id: str,
        decision: DeleteDecision,
        reason: Optional[str]
    ):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.get("deletion_requested", False):
            raise ValueError("No deletion request found for this user")

        if decision == DeleteDecision.APPROVE and not reason:
            raise ValueError("Reason is mandatory for deletion approval")

        if decision == DeleteDecision.APPROVE:
            active_loans = await self.loan_repo.count_active_loans(user_id)
            if active_loans > 0:
                raise ValueError("User has active loans")
            active_disbursed = await self.active_loan_repo.count_active_by_user(user_id)
            if active_disbursed > 0:
                raise ValueError("User has active loans")

            await self.user_repo.soft_delete_user(
                user_id=user_id,
                deleted_by=manager_id
            )

            await self.user_repo.clear_deletion_request(user_id)
            action = "USER_DELETE_APPROVED"

        else:
            await self.user_repo.clear_deletion_request(user_id)
            action = "USER_DELETE_REJECTED"

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "BANK_MANAGER",
            "action": action,
            "entity_type": "USER",
            "entity_id": user_id,
            "remarks": reason,
            "timestamp": datetime.utcnow()
        })
