from datetime import datetime, timedelta
from typing import Optional
from bson.decimal128 import Decimal128
from bson import ObjectId

from app.db.mongodb import db
from app.repositories.loan_application_repository import LoanApplicationRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.user_repository import UserRepository
from app.repositories.manager_repository import ManagerRepository
from app.services.loan_application_service import calculate_emi
from app.services.noc_pdf_service import NOCPdfService
from app.enums.loan import LoanApplicationStatus, SystemDecision
from app.schemas.loan_decision import LoanDecision
from app.services.account_service import AccountService


def convert_decimal(value):
    if isinstance(value, Decimal128):
        return float(value.to_decimal())
    return float(value) if value is not None else None


class LoanManagerService:

    def __init__(self):
        self.loan_app_repo = LoanApplicationRepository()
        self.loan_repo = LoanRepository()
        self.audit_repo = AuditLogRepository()
        self.user_repo = UserRepository()
        self.manager_repo = ManagerRepository()
        self.account_service = AccountService()
        self.noc_pdf_service = NOCPdfService()

    # -----------------------------
    # Internal audit helper
    # -----------------------------
    async def _log_audit(
        self,
        actor_id: str,
        action: str,
        entity_id: str,
        entity_type: str = "LOAN_APPLICATION",
        remarks: str | None = None,
        actor_role: str = "LOAN_MANAGER",
    ):
        """Create a standardized audit entry."""
        try:
            await self.audit_repo.create({
                "actor_id": actor_id,
                "actor_role": actor_role,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "remarks": remarks,
                "timestamp": datetime.utcnow()
            })
        except Exception:
            # keep business logic resilient to audit write failures
            return

    async def _resolve_manager_name(self, manager_id: ObjectId | None) -> str | None:
        if not manager_id:
            return None
        try:
            manager = await self.manager_repo.find_by_id(str(manager_id))
            if manager and manager.get("name"):
                return str(manager.get("name"))
        except Exception:
            return None
        return None

    # =====================================================
    # INTERNAL: CREATE ACTIVE LOAN + EMI SCHEDULE
    # =====================================================
    async def _create_active_loan_and_emis(
        self,
        loan_app: dict,
        interest_rate,
        tenure_months: int
    ):
        # If an active loan already exists, return it (avoid duplicate EMIs)
        if loan_app.get("active_loan_id"):
            active_id = loan_app["active_loan_id"]
            emi_amount = convert_decimal(loan_app.get("emi_preview")) or 0.0
            return active_id, emi_amount

        principal = float(loan_app["loan_amount"].to_decimal())

        rate = (
            float(interest_rate.to_decimal())
            if hasattr(interest_rate, "to_decimal")
            else float(interest_rate)
        )

        emi_amount = calculate_emi(principal, rate, tenure_months)

        active_loan_id = await self.loan_repo.create({
            "loan_application_id": loan_app["_id"],
            "user_id": loan_app["user_id"],
            "loan_amount": loan_app["loan_amount"],
            "interest_rate": rate,
            "tenure_months": tenure_months,
            "emi_amount": emi_amount,
            "status": "ACTIVE",
            "created_at": datetime.utcnow()
        })

        due_date = datetime.utcnow()
        for i in range(1, tenure_months + 1):
            due_date += timedelta(days=30)
            await db.loan_repayments.insert_one({
                "loan_id": active_loan_id,
                "user_id": loan_app["user_id"],
                "emi_number": i,
                "emi_amount": emi_amount,
                "due_date": due_date,
                "status": "PENDING",
                "attempts": 0,
                "created_at": datetime.utcnow()
            })

        await self.loan_app_repo.collection.update_one(
            {"_id": loan_app["_id"]},
            {
                "$set": {
                    "active_loan_id": active_loan_id,
                    "emi_created_at": datetime.utcnow()
                }
            }
        )

        return active_loan_id, emi_amount

    # =====================================================
    # LIST ALL LOAN APPLICATIONS
    # =====================================================
    async def list_loans(self, system_decision: Optional[str] = None):
        query = {}
        if system_decision:
            query["system_decision"] = system_decision

        cursor = self.loan_app_repo.collection.find(query).sort([
            ("applied_at", -1),
            ("_id", -1),
        ])

        result = []
        async for loan in cursor:
            user_doc = None
            try:
                user_doc = await self.user_repo.find_by_id(str(loan["user_id"]))
            except Exception:
                user_doc = None
            noc_manager_name = await self._resolve_manager_name(loan.get("noc_approved_by"))

            result.append({
                "loan_id": str(loan["_id"]),
                "user_id": str(loan["user_id"]),
                "user_name": user_doc.get("name") if user_doc else None,
                "loan_type": loan.get("loan_type"),
                "loan_amount": convert_decimal(loan.get("loan_amount")),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": convert_decimal(loan.get("interest_rate")),
                "emi_preview": convert_decimal(loan.get("emi_preview")),
                "cibil_score": loan.get("cibil_score"),
                "system_decision": loan.get("system_decision"),
                "loan_status": loan.get("status"),
                "active_loan_id": str(loan.get("active_loan_id"))
                    if loan.get("active_loan_id") else None,
                "decision_reason": loan.get("decision_reason"),
                "applied_at": loan.get("applied_at"),
                "escalated": loan.get("escalated", False),
                "escalated_at": loan.get("escalated_at"),
                "finalized_at": loan.get("finalized_at"),
                "disbursed": loan.get("disbursed", False),
                "disbursed_at": loan.get("disbursed_at"),
                "income_slip_url": loan.get("income_slip_url"),
                "noc_status": loan.get("noc_status"),
                "noc_requested_at": loan.get("noc_requested_at"),
                "noc_approved_at": loan.get("noc_approved_at"),
                "noc_generated_at": loan.get("noc_generated_at"),
                "noc_reference_no": loan.get("noc_reference_no"),
                "noc_approved_by_name": noc_manager_name,
                "noc_rejected_at": loan.get("noc_rejected_at"),
                "noc_rejection_reason": loan.get("noc_rejection_reason"),
            })

        return result


    # =====================================================
    # MANUAL DECISION (APPROVAL / REJECTION)
    # =====================================================
    async def decide_loan(
        self,
        loan_id: str,
        manager_id: str,
        decision: LoanDecision,
        reason: Optional[str]
    ):
        loan = await self.loan_app_repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan not found")

        # If escalated to admin, manager cannot decide
        if loan.get("escalated", False):
            raise ValueError("Loan is currently escalated to admin and cannot be decided by manager")

        if loan.get("status") == LoanApplicationStatus.FINALIZED:
            raise ValueError("Loan already finalized and cannot be modified")

        if loan.get("status") == LoanApplicationStatus.REJECTED and decision == LoanDecision.APPROVE:
            raise ValueError("Cannot approve a loan that was already rejected")

        if loan.get("status") == LoanApplicationStatus.APPROVED and decision == LoanDecision.REJECT:
            raise ValueError("Cannot reject a loan that was already approved")

        if loan["system_decision"] != SystemDecision.MANUAL_REVIEW:
            raise ValueError("Only MANUAL_REVIEW loans can be manually decided")

        if decision == LoanDecision.REJECT:
            if not reason or not str(reason).strip():
                raise ValueError("Reject reason is required")
            await self.loan_app_repo.collection.update_one(
                {"_id": ObjectId(loan_id)},
                {
                    "$set": {
                        "status": LoanApplicationStatus.REJECTED,
                        "decision_reason": reason,
                        "decided_by": ObjectId(manager_id),
                        "decided_at": datetime.utcnow()
                    }
                }
            )
            # Audit: manual rejection
            await self._log_audit(
                actor_id=manager_id,
                action="LOAN_REJECTED",
                entity_id=loan_id,
                remarks=reason
            )
            return

        # APPROVE path
        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": LoanApplicationStatus.APPROVED,
                    "decided_by": ObjectId(manager_id),
                    "decided_at": datetime.utcnow()
                }
            }
        )
        # Audit: manual approval
        await self._log_audit(
            actor_id=manager_id,
            action="LOAN_APPROVED",
            entity_id=loan_id
        )

        # Create active loan and EMIs only if not already created
        if not loan.get("active_loan_id"):
            active_id, emi_amt = await self._create_active_loan_and_emis(
                loan,
                interest_rate=loan["interest_rate"],
                tenure_months=loan["tenure_months"]
            )
        else:
            active_id = loan.get("active_loan_id")
            emi_amt = convert_decimal(loan.get("emi_preview")) or 0.0

        # Disburse loan amount to user's account only if not already disbursed
        if not loan.get("disbursed"):
            try:
                principal = convert_decimal(loan.get("loan_amount"))
                await self.account_service.deposit(
                    str(loan["user_id"]),
                    principal,
                    reference="LOAN_DISBURSEMENT",
                    loan_id=str(active_id) if active_id else None,
                    manager_id=manager_id
                )
                await self.loan_app_repo.collection.update_one(
                    {"_id": loan["_id"]},
                    {"$set": {"disbursed": True, "disbursed_at": datetime.utcnow()}}
                )
            except Exception:
                await self.audit_repo.create({
                    "actor_id": manager_id,
                    "actor_role": "LOAN_MANAGER",
                    "action": "DISBURSE_FAILED",
                    "entity_type": "LOAN_APPLICATION",
                    "entity_id": loan_id,
                    "timestamp": datetime.utcnow()
                })

    # =====================================================
    # ESCALATE TO ADMIN (MANAGER ACTION)
    # =====================================================
    async def escalate_to_admin(self, loan_id: str, manager_id: str, reason: Optional[str]):
        loan = await self.loan_app_repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan not found")

        if loan.get("status") == LoanApplicationStatus.REJECTED:
            raise ValueError("Cannot escalate a rejected loan")

        if loan.get("status") == LoanApplicationStatus.FINALIZED:
            raise ValueError("Cannot escalate a finalized loan")

        if loan.get("status") == LoanApplicationStatus.APPROVED:
            raise ValueError("Cannot escalate a loan that is already approved")

        # mark escalated and record reason
        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "escalated": True,
                    "escalated_reason": reason,
                    "escalated_by": ObjectId(manager_id),
                    "escalated_at": datetime.utcnow(),
                    "status": LoanApplicationStatus.ESCALATED
                }
            }
        )

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "LOAN_MANAGER",
            "action": "LOAN_ESCALATED_TO_ADMIN",
            "entity_type": "LOAN_APPLICATION",
            "entity_id": loan_id,
            "timestamp": datetime.utcnow()
        })

        # Notify admin portal so escalations are visible immediately.
        try:
            await db.admin_notifications.insert_one({
                "type": "LOAN_ESCALATED",
                "loan_id": ObjectId(loan_id),
                "user_id": loan.get("user_id"),
                "manager_id": ObjectId(manager_id),
                "message": "Loan escalated to admin for review",
                "reason": reason,
                "is_read": False,
                "created_at": datetime.utcnow(),
            })
        except Exception:
            # Notification failures must not block escalation.
            pass

    # =====================================================
    # AUTO APPROVED CONFIRMATION
    # =====================================================
    async def confirm_auto_approved(self, loan_id: str, manager_id: str):
        loan = await self.loan_app_repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan not found")

        if loan["system_decision"] != SystemDecision.AUTO_APPROVED:
            raise ValueError("Loan is not auto-approved")

        if loan.get("status") == LoanApplicationStatus.APPROVED:
            raise ValueError("Loan already approved")

        if loan.get("status") == LoanApplicationStatus.FINALIZED:
            raise ValueError("Loan already finalized and cannot be modified")

        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": LoanApplicationStatus.APPROVED,
                    "confirmed_by": ObjectId(manager_id),
                    "confirmed_at": datetime.utcnow()
                }
            }
        )

        # Audit: auto-approved confirmation
        await self._log_audit(
            actor_id=manager_id,
            action="LOAN_AUTO_APPROVED_CONFIRMED",
            entity_id=loan_id
        )

        if not loan.get("active_loan_id"):
            active_id, emi_amt = await self._create_active_loan_and_emis(
                loan,
                interest_rate=loan["interest_rate"],
                tenure_months=loan["tenure_months"]
            )
        else:
            active_id = loan.get("active_loan_id")

        # Disburse loan amount to user's account only if not already disbursed
        if not loan.get("disbursed"):
            try:
                principal = convert_decimal(loan.get("loan_amount"))
                await self.account_service.deposit(
                    str(loan["user_id"]),
                    principal,
                    reference="LOAN_DISBURSEMENT",
                    loan_id=str(active_id) if active_id else None,
                    manager_id=manager_id
                )
                await self.loan_app_repo.collection.update_one(
                    {"_id": loan["_id"]},
                    {"$set": {"disbursed": True, "disbursed_at": datetime.utcnow()}}
                )
            except Exception:
                await self.audit_repo.create({
                    "actor_id": manager_id,
                    "actor_role": "LOAN_MANAGER",
                    "action": "DISBURSE_FAILED",
                    "entity_type": "LOAN_APPLICATION",
                    "entity_id": loan_id,
                    "timestamp": datetime.utcnow()
                })

    # =====================================================
    # AUTO REJECTED CONFIRMATION
    # =====================================================
    async def confirm_auto_rejected(self, loan_id: str, manager_id: str):
        loan = await self.loan_app_repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan not found")

        if loan["system_decision"] != SystemDecision.AUTO_REJECTED:
            raise ValueError("Loan is not auto-rejected")

        if loan.get("status") == LoanApplicationStatus.REJECTED:
            raise ValueError("Loan already rejected")

        if loan.get("status") == LoanApplicationStatus.FINALIZED:
            raise ValueError("Loan already finalized and cannot be modified")

        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": LoanApplicationStatus.REJECTED,
                    "confirmed_by": ObjectId(manager_id),
                    "confirmed_at": datetime.utcnow()
                }
            }
        )
        # Audit: auto-rejected confirmation
        await self._log_audit(
            actor_id=manager_id,
            action="LOAN_AUTO_REJECTED_CONFIRMED",
            entity_id=loan_id
        )

    # =====================================================
    # FINALIZE LOAN (ONLY ESCALATED LOANS)
    # =====================================================
    async def finalize_loan(self, loan_id: str, manager_id: str, interest_rate=None, tenure_months: int = 0):
        loan_app = await self.loan_app_repo.find_by_id(loan_id)
        if not loan_app:
            raise ValueError("Loan application not found")

        if loan_app.get("status") == LoanApplicationStatus.FINALIZED:
            raise ValueError("Loan already finalized")

        # Allow finalize for ANY approved loan (not only escalated)
        if loan_app["status"] != LoanApplicationStatus.APPROVED:
            raise ValueError("Loan must be approved before finalization")

        # If an active loan already exists and manager provided new terms, update active loan's terms
        if loan_app.get("active_loan_id"):
            active_id = loan_app.get("active_loan_id")

            if interest_rate is not None and tenure_months:
                # recompute EMI using principal and new terms
                principal = convert_decimal(loan_app.get("loan_amount"))
                rate = (
                    float(interest_rate.to_decimal())
                    if hasattr(interest_rate, "to_decimal")
                    else float(interest_rate)
                )
                emi_amt = calculate_emi(principal, rate, tenure_months)

                # update active loan record
                await self.loan_repo.collection.update_one(
                    {"_id": ObjectId(active_id)},
                    {
                        "$set": {
                            "interest_rate": rate,
                            "tenure_months": tenure_months,
                            "emi_amount": emi_amt,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

                # Delete old EMI repayments (unpaid only)
                await db.loan_repayments.delete_many({
                    "loan_id": ObjectId(active_id),
                    "status": "PENDING"
                })

                # Create new EMI repayments with updated terms
                due_date = datetime.utcnow()
                for i in range(1, tenure_months + 1):
                    due_date += timedelta(days=30)
                    await db.loan_repayments.insert_one({
                        "loan_id": ObjectId(active_id),
                        "user_id": loan_app["user_id"],
                        "emi_number": i,
                        "emi_amount": emi_amt,
                        "due_date": due_date,
                        "status": "PENDING",
                        "attempts": 0,
                        "created_at": datetime.utcnow()
                    })

                # update loan application snapshot fields
                await self.loan_app_repo.collection.update_one(
                    {"_id": loan_app["_id"]},
                    {
                        "$set": {
                            "interest_rate": interest_rate,
                            "tenure_months": tenure_months,
                            "emi_preview": emi_amt
                        }
                    }
                )
        else:
            # No active loan yet: create it if manager provided terms
            if interest_rate is not None and tenure_months:
                active_id, emi_amt = await self._create_active_loan_and_emis(
                    loan_app,
                    interest_rate=interest_rate,
                    tenure_months=tenure_months
                )

                # Attempt disbursement if not already disbursed
                if not loan_app.get("disbursed"):
                    try:
                        principal = convert_decimal(loan_app.get("loan_amount"))
                        await self.account_service.deposit(
                            str(loan_app["user_id"]),
                            principal,
                            reference="LOAN_DISBURSEMENT",
                            loan_id=str(active_id) if active_id else None,
                            manager_id=manager_id
                        )
                        await self.loan_app_repo.collection.update_one(
                            {"_id": loan_app["_id"]},
                            {"$set": {"disbursed": True, "disbursed_at": datetime.utcnow()}}
                        )
                    except Exception:
                        await self.audit_repo.create({
                            "actor_id": manager_id,
                            "actor_role": "LOAN_MANAGER",
                            "action": "DISBURSE_FAILED",
                            "entity_type": "LOAN_APPLICATION",
                            "entity_id": loan_id,
                            "timestamp": datetime.utcnow()
                        })

        # mark finalized (manager finalization is allowed for any approved loan)
        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": LoanApplicationStatus.FINALIZED,
                    "finalized_by": ObjectId(manager_id),
                    "finalized_at": datetime.utcnow()
                }
            }
        )

        await self.audit_repo.create({
            "actor_id": manager_id,
            "actor_role": "LOAN_MANAGER",
            "action": "LOAN_FINALIZED",
            "entity_type": "LOAN_APPLICATION",
            "entity_id": loan_id,
            "timestamp": datetime.utcnow()
        })

        return {"message": "Loan finalized successfully"}

    # =====================================================
    # APPROVE NOC AFTER LOAN CLOSURE
    # =====================================================
    async def approve_noc(self, loan_id: str, manager_id: str):
        loan_app = await self.loan_app_repo.find_by_id(loan_id)
        if not loan_app:
            raise ValueError("Loan application not found")

        if loan_app.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("NOC can only be approved after loan closure")

        if loan_app.get("noc_status") not in ["REQUESTED", "PENDING"]:
            raise ValueError("NOC approval requires a user-raised request")

        now = datetime.utcnow()
        reference_no = loan_app.get("noc_reference_no") or f"NOC-{loan_id[-8:].upper()}"

        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "noc_status": "APPROVED",
                    "noc_approved_by": ObjectId(manager_id),
                    "noc_approved_at": now,
                    "noc_reference_no": reference_no,
                    "noc_rejected_at": None,
                    "noc_rejection_reason": None,
                }
            }
        )

        await self._log_audit(
            actor_id=manager_id,
            action="NOC_APPROVED",
            entity_id=loan_id,
            remarks=f"NOC reference {reference_no}",
        )

        return {
            "message": "NOC approved successfully",
            "noc_reference_no": reference_no,
            "noc_status": "APPROVED",
        }

    async def reject_noc(self, loan_id: str, manager_id: str, reason: str):
        loan_app = await self.loan_app_repo.find_by_id(loan_id)
        if not loan_app:
            raise ValueError("Loan application not found")

        if loan_app.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("NOC can only be rejected after loan closure")

        if loan_app.get("noc_status") not in ["REQUESTED", "PENDING"]:
            raise ValueError("NOC rejection requires a user-raised request")

        clean_reason = str(reason or "").strip()
        if len(clean_reason) < 5:
            raise ValueError("Rejection reason must be at least 5 characters")

        now = datetime.utcnow()
        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "noc_status": "REJECTED",
                    "noc_rejected_by": ObjectId(manager_id),
                    "noc_rejected_at": now,
                    "noc_rejection_reason": clean_reason,
                },
                "$unset": {
                    "noc_approved_by": "",
                    "noc_approved_at": "",
                    "noc_generated_at": "",
                },
            },
        )

        await self._log_audit(
            actor_id=manager_id,
            action="NOC_REJECTED",
            entity_id=loan_id,
            remarks=clean_reason,
        )

        return {
            "message": "NOC rejected successfully",
            "noc_status": "REJECTED",
            "rejected_at": now,
            "rejection_reason": clean_reason,
        }

    async def generate_noc_pdf_for_manager(self, loan_id: str):
        loan_app = await self.loan_app_repo.find_by_id(loan_id)
        if not loan_app:
            raise ValueError("Loan application not found")

        if loan_app.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("Loan is not closed yet")
        if loan_app.get("noc_status") != "APPROVED":
            raise ValueError("NOC is pending approval")

        user = await self.user_repo.find_by_id(str(loan_app.get("user_id")))
        if not user:
            raise ValueError("User not found")

        manager_name = "Loan Manager"
        approved_by = loan_app.get("noc_approved_by")
        if approved_by:
            manager = await self.manager_repo.find_by_id(str(approved_by))
            if manager and manager.get("name"):
                manager_name = str(manager.get("name"))

        generated_at = datetime.utcnow()
        reference_no = loan_app.get("noc_reference_no") or f"NOC-{loan_id[-8:].upper()}"

        amount_raw = loan_app.get("loan_amount")
        loan_amount = float(amount_raw.to_decimal()) if hasattr(amount_raw, "to_decimal") else float(amount_raw or 0.0)

        pdf_bytes = self.noc_pdf_service.generate_pdf(
            reference_no=reference_no,
            borrower_name=str(user.get("name") or "Borrower"),
            loan_id=str(loan_app["_id"]),
            loan_type=str(loan_app.get("loan_type") or ""),
            loan_amount=loan_amount,
            closed_at=loan_app.get("closed_at"),
            manager_name=manager_name,
            generated_at=generated_at,
        )

        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {"$set": {"noc_generated_at": generated_at, "noc_reference_no": reference_no}},
        )

        return pdf_bytes, f"Monify_NOC_{loan_id}.pdf"
    # =====================================================
    # LIST LOAN HISTORY (CLOSED ONLY)
    # =====================================================
    async def list_finalized_loans(self):
        cursor = self.loan_app_repo.collection.find({
            "status": LoanApplicationStatus.CLOSED
        })

        result = []
        async for loan in cursor:
            user_doc = None
            try:
                user_doc = await self.user_repo.find_by_id(str(loan["user_id"]))
            except Exception:
                user_doc = None

            result.append({
                "loan_id": str(loan["_id"]),
                "active_loan_id": str(loan.get("active_loan_id"))
                if loan.get("active_loan_id") else None,
                "user_id": str(loan["user_id"]),
                "user_name": user_doc.get("name") if user_doc else None,
                "loan_type": loan.get("loan_type"),
                "loan_amount": convert_decimal(loan.get("loan_amount")),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": convert_decimal(loan.get("interest_rate")),
                "emi_preview": convert_decimal(loan.get("emi_preview")),
                "cibil_score": loan.get("cibil_score"),
                "loan_status": loan.get("status"),
                "system_decision": loan.get("system_decision"),
                "applied_at": loan.get("applied_at"),
                "finalized_at": loan.get("finalized_at"),
                "finalized_by": str(loan.get("finalized_by"))
                if loan.get("finalized_by") else None,
                "income_slip_url": loan.get("income_slip_url"),
                "noc_status": loan.get("noc_status"),
                "noc_requested_at": loan.get("noc_requested_at"),
                "noc_approved_at": loan.get("noc_approved_at"),
                "noc_generated_at": loan.get("noc_generated_at"),
                "noc_reference_no": loan.get("noc_reference_no"),
                "noc_rejected_at": loan.get("noc_rejected_at"),
                "noc_rejection_reason": loan.get("noc_rejection_reason"),
            })

        return result

    # =====================================================
    # LIST LOANS READY FOR FINALIZATION
    # =====================================================
    async def list_loans_ready_for_finalization(self):
        cursor = self.loan_app_repo.collection.find({
            "escalated": True,
            "status": LoanApplicationStatus.APPROVED
        })

        result = []
        async for loan in cursor:
            user_doc = None
            try:
                user_doc = await self.user_repo.find_by_id(str(loan["user_id"]))
            except Exception:
                user_doc = None

            result.append({
                "loan_id": str(loan["_id"]),
                "user_id": str(loan["user_id"]),
                "user_name": user_doc.get("name") if user_doc else None,
                "loan_type": loan.get("loan_type"),
                "loan_amount": convert_decimal(loan.get("loan_amount")),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": convert_decimal(loan.get("interest_rate")),
                "emi_preview": convert_decimal(loan.get("emi_preview")),
                "cibil_score": loan.get("cibil_score"),
                "system_decision": loan.get("system_decision"),
                "loan_status": loan.get("status"),
                "active_loan_id": str(loan.get("active_loan_id"))
                if loan.get("active_loan_id") else None,
                "escalated_reason": loan.get("escalated_reason"),
                "escalated_at": loan.get("escalated_at"),
                "income_slip_url": loan.get("income_slip_url"),
                "noc_status": loan.get("noc_status"),
                "noc_requested_at": loan.get("noc_requested_at"),
                "noc_rejected_at": loan.get("noc_rejected_at"),
                "noc_rejection_reason": loan.get("noc_rejection_reason"),
            })

        return result

    # =====================================================
    # LIST ESCALATED LOANS (ALL STATUSES)
    # =====================================================
    async def list_escalated_loans(self):
        cursor = self.loan_app_repo.collection.find({
            "escalated": True
        })

        result = []
        async for loan in cursor:
            user_doc = None
            try:
                user_doc = await self.user_repo.find_by_id(str(loan["user_id"]))
            except Exception:
                user_doc = None

            result.append({
                "loan_id": str(loan["_id"]),
                "user_id": str(loan["user_id"]),
                "user_name": user_doc.get("name") if user_doc else None,
                "loan_type": loan.get("loan_type"),
                "loan_amount": convert_decimal(loan.get("loan_amount")),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": convert_decimal(loan.get("interest_rate")),
                "emi_preview": convert_decimal(loan.get("emi_preview")),
                "cibil_score": loan.get("cibil_score"),
                "system_decision": loan.get("system_decision"),
                "loan_status": loan.get("status"),
                "active_loan_id": str(loan.get("active_loan_id"))
                if loan.get("active_loan_id") else None,
                "escalated_reason": loan.get("escalated_reason"),
                "escalated_at": loan.get("escalated_at"),
                "finalized_at": loan.get("finalized_at"),
                "income_slip_url": loan.get("income_slip_url"),
                "noc_status": loan.get("noc_status"),
                "noc_requested_at": loan.get("noc_requested_at"),
                "noc_approved_at": loan.get("noc_approved_at"),
                "noc_generated_at": loan.get("noc_generated_at"),
                "noc_reference_no": loan.get("noc_reference_no"),
                "noc_rejected_at": loan.get("noc_rejected_at"),
                "noc_rejection_reason": loan.get("noc_rejection_reason"),
            })

        return result
