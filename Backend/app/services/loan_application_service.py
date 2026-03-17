from datetime import datetime, timedelta
from bson import Decimal128, ObjectId
from pymongo.errors import DuplicateKeyError
from app.repositories.loan_application_repository import LoanApplicationRepository
from app.repositories.user_repository import UserRepository
from app.enums.loan import LoanApplicationStatus, SystemDecision
from app.enums.user import KYCStatus, UserApprovalStatus
from app.services.credit_rule_service import CreditRuleService
from app.services.noc_pdf_service import NOCPdfService
from app.core.config import settings
 
 
# =====================================================
# CIBIL CALCULATION
# =====================================================
def calculate_cibil(payload: dict) -> int:
    score = 300
 
    if payload["monthly_income"] * 12 >= payload["loan_amount"]:
        score += 180
    else:
        score += 90
 
    if payload["occupation"].lower() in ["employee", "government", "it"]:
        score += 120
    else:
        score += 60
 
    score += 120 if payload.get("previous_loans", 0) == 0 else 60
    score += 60 if payload.get("pending_emis", 0) == 0 else 20
 
    return min(score, 900)
 
 
def system_decision(cibil: int) -> SystemDecision:
    if cibil >= 750:
        return SystemDecision.AUTO_APPROVED
    elif 550 <= cibil < 750:
        return SystemDecision.MANUAL_REVIEW
    return SystemDecision.AUTO_REJECTED


class IdempotencyKeyExpired(ValueError):
    pass
 
 
# =====================================================
# EMI CALCULATION
# =====================================================
def calculate_emi(amount: float, rate: float, tenure: int) -> float:
    r = rate / (12 * 100)
    emi = (amount * r * ((1 + r) ** tenure)) / (((1 + r) ** tenure) - 1)
    return round(emi, 2)
 
 
# =====================================================
# LOAN APPLICATION SERVICE
# =====================================================
class LoanApplicationService:
    def __init__(self):
        self.repo = LoanApplicationRepository()
        self.user_repo = UserRepository()
        self.credit_rule_service = CreditRuleService()
        self.noc_pdf_service = NOCPdfService()

    def _is_idempotency_expired(self, created_at: datetime) -> bool:
        window = settings.IDEMPOTENCY_WINDOW_HOURS
        if not window or window <= 0:
            return False
        return datetime.utcnow() - created_at > timedelta(hours=window)

    def _validate_loan_amount_range(self, loan_amount: float):
        eligible_min = 1
        eligible_max = 5_000_000
        if loan_amount < eligible_min or loan_amount > eligible_max:
            raise ValueError(
                f"Loan amount must be between Rs.{eligible_min:,} and Rs.{eligible_max:,}"
            )
        return eligible_min, eligible_max

    def _get_eligibility_level(self, decision: SystemDecision) -> str:
        if decision == SystemDecision.AUTO_APPROVED:
            return "HIGH"
        if decision == SystemDecision.MANUAL_REVIEW:
            return "MEDIUM"
        return "LOW"
 
    # -------------------------------------------------
    # CREATE LOAN APPLICATION
    # -------------------------------------------------
    async def create_loan_application(
        self,
        user_id: str,
        payload,
        idempotency_key: str
    ):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")
 
        await self._validate_user_eligibility(user)
 
        existing = await self.repo.find_by_idempotency_key(idempotency_key)
        if existing:
            created_at = existing.get("idempotency_created_at") or existing.get("applied_at")
            if created_at and self._is_idempotency_expired(created_at):
                raise IdempotencyKeyExpired("Idempotency key expired. Please retry with a new key.")
            return str(existing["_id"]), True
 
        cibil = calculate_cibil(payload.dict())
        decision = await self.credit_rule_service.evaluate_cibil(cibil)
 
        interest = await self.credit_rule_service.get_interest_rate(cibil)
 
        emi = calculate_emi(
            payload.loan_amount,
            interest,
            payload.tenure_months
        )
 
        loan_doc = {
            "user_id": user["_id"],
            "loan_type": payload.loan_type,
            "loan_amount": Decimal128(str(payload.loan_amount)),
            "tenure_months": payload.tenure_months,
            "reason": payload.reason,
            "income_slip_url": str(payload.income_slip_url),

            "cibil_score": cibil,
            "system_decision": decision,
            "interest_rate": Decimal128(str(interest)),
            "emi_preview": Decimal128(str(emi)),

            "status": LoanApplicationStatus.PENDING,
            "applied_at": datetime.utcnow(),
            "idempotency_key": idempotency_key,
            "idempotency_created_at": datetime.utcnow()
        }
 
        loan_id = await self.repo.create(loan_doc)
        return str(loan_id), False

    # -------------------------------------------------
    # PREVIEW (server-side EMI + decision) - NO PERSIST
    # -------------------------------------------------
    async def preview_loan(self, user_id: str, payload):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # Validate that KYC completed and approved before preview/apply
        await self._validate_user_eligibility(user)

        eligible_min, eligible_max = self._validate_loan_amount_range(payload.loan_amount)

        cibil = calculate_cibil(payload.dict())
        decision = await self.credit_rule_service.evaluate_cibil(cibil)
        interest = await self.credit_rule_service.get_interest_rate(cibil)

        emi = calculate_emi(
            payload.loan_amount,
            interest,
            payload.tenure_months
        )

        return {
            "cibil_score": cibil,
            "system_decision": decision,
            "interest_rate": interest,
            "emi": emi,
            "eligible_min_amount": eligible_min,
            "eligible_max_amount": eligible_max
        }

    # -------------------------------------------------
    # PUBLIC CIBIL CHECK (homepage pre-check) - NO AUTH
    # -------------------------------------------------
    async def public_cibil_check(self, payload):
        eligible_min, eligible_max = self._validate_loan_amount_range(payload.loan_amount)

        cibil = calculate_cibil(payload.dict())
        decision = await self.credit_rule_service.evaluate_cibil(cibil)
        interest = await self.credit_rule_service.get_interest_rate(cibil)

        return {
            "cibil_score": cibil,
            "system_decision": decision,
            "eligibility_level": self._get_eligibility_level(decision),
            "interest_rate": interest,
            "eligible_min_amount": eligible_min,
            "eligible_max_amount": eligible_max
        }
 
    # -------------------------------------------------
    # GET SINGLE LOAN
    # -------------------------------------------------
    async def get_loan_application(self, loan_id: str):
        loan = await self.repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan application not found")
 
        return {
            "loan_id": str(loan["_id"]),
            "user_id": str(loan["user_id"]),
            "loan_type": loan.get("loan_type"),
            "loan_amount": float(loan["loan_amount"].to_decimal()),
            "tenure_months": loan["tenure_months"],
            "interest_rate": float(loan["interest_rate"].to_decimal()),
            "emi_preview": float(loan["emi_preview"].to_decimal()),
            "cibil_score": loan["cibil_score"],
            "system_decision": loan["system_decision"],
            "status": loan["status"],
            "applied_at": loan.get("applied_at"),
        }
 
    # -------------------------------------------------
    # GET ALL LOANS OF A USER  ✅ REQUIRED
    # -------------------------------------------------
    async def get_user_loans(self, user_id: str):
        from app.db.mongodb import db
        from bson import Decimal128
        
        cursor = self.repo.collection.find(
            {"user_id": ObjectId(user_id)}
        ).sort("applied_at", -1)
 
        loans = []
        async for loan in cursor:
            # Get updated tenure and interest from active loan if it exists
            tenure_months = loan.get("tenure_months")
            interest_rate = loan.get("interest_rate")
            emi_preview = loan.get("emi_preview")
            
            if loan.get("active_loan_id"):
                active_loan_data = await db.loans.find_one(
                    {"_id": ObjectId(loan.get("active_loan_id"))}
                )
                if active_loan_data:
                    # Update with values from active loan if they exist
                    tenure_months = active_loan_data.get("tenure_months", tenure_months)
                    interest_rate = active_loan_data.get("interest_rate", interest_rate)
                    emi_preview = active_loan_data.get("emi_amount", emi_preview)
            
            # Convert values to appropriate types
            if isinstance(interest_rate, Decimal128):
                interest_rate = float(interest_rate.to_decimal())
            elif interest_rate is not None:
                interest_rate = float(interest_rate)
            else:
                interest_rate = None
                
            if isinstance(emi_preview, Decimal128):
                emi_preview = float(emi_preview.to_decimal())
            elif emi_preview is not None:
                emi_preview = float(emi_preview)
            else:
                emi_preview = None
            
            loans.append({
                "loan_id": str(loan["_id"]),
                "loan_type": loan.get("loan_type"),
                "loan_amount": float(loan["loan_amount"].to_decimal()),
                "tenure_months": tenure_months,
                "status": loan.get("status"),
                "system_decision": loan.get("system_decision"),
                "interest_rate": interest_rate,
                "emi_preview": emi_preview,
                "active_loan_id": (
                    str(loan["active_loan_id"])
                    if loan.get("active_loan_id") else None
                ),
                "disbursed": bool(loan.get("disbursed", False)),
                "disbursed_at": loan.get("disbursed_at"),
                "applied_at": loan.get("applied_at"),
                "noc_status": loan.get("noc_status"),
                "noc_requested_at": loan.get("noc_requested_at"),
                "noc_approved_at": loan.get("noc_approved_at"),
                "noc_generated_at": loan.get("noc_generated_at"),
                "noc_reference_no": loan.get("noc_reference_no"),
                "noc_rejected_at": loan.get("noc_rejected_at"),
                "noc_rejection_reason": loan.get("noc_rejection_reason"),
            })
 
        return loans

    # -------------------------------------------------
    # USER LOAN DETAILS (FOR HISTORY DETAILS VIEW)
    # -------------------------------------------------
    async def get_user_loan_details(self, user_id: str, loan_id: str):
        from app.db.mongodb import db
        from bson import ObjectId, Decimal128

        def to_float(val):
            if val is None:
                return None
            if isinstance(val, Decimal128):
                return float(val.to_decimal())
            if hasattr(val, "to_decimal"):
                return float(val.to_decimal())
            try:
                return float(val)
            except Exception:
                return None

        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.repo.collection.find_one(
            {"_id": ObjectId(loan_id), "user_id": ObjectId(user_id)}
        )
        if not loan:
            raise ValueError("Loan not found")

        active_loan_id = loan.get("active_loan_id")
        active_loan = None
        active_status = None
        closed_at = None
        if active_loan_id:
            active_loan = await db.loans.find_one({"_id": active_loan_id})
            if active_loan:
                active_status = active_loan.get("status")
                closed_at = active_loan.get("closed_at")

        # Determine approver (loan manager) - best effort.
        approver_obj_id = (
            loan.get("finalized_by")
            or loan.get("decided_by")
            or loan.get("confirmed_by")
            or loan.get("escalated_by")
        )
        approver = None
        if approver_obj_id:
            mgr = await db.managers.find_one(
                {"_id": approver_obj_id},
                {"name": 1, "phone": 1, "manager_id": 1}
            )
            if mgr:
                approver = {
                    "id": str(mgr["_id"]),
                    "manager_id": mgr.get("manager_id"),
                    "name": mgr.get("name"),
                    "phone": mgr.get("phone"),
                }
            else:
                approver = {"id": str(approver_obj_id)}

        noc_approver = None
        noc_approver_obj = loan.get("noc_approved_by")
        if noc_approver_obj:
            noc_mgr = await db.managers.find_one(
                {"_id": noc_approver_obj},
                {"name": 1, "phone": 1, "manager_id": 1}
            )
            if noc_mgr:
                noc_approver = {
                    "id": str(noc_mgr["_id"]),
                    "manager_id": noc_mgr.get("manager_id"),
                    "name": noc_mgr.get("name"),
                    "phone": noc_mgr.get("phone"),
                }
            else:
                noc_approver = {"id": str(noc_approver_obj)}

        # Repayment summary (if active loan exists)
        total_emis = 0
        paid_emis = 0
        pending_emis = 0
        outstanding_amount = 0.0
        if active_loan_id:
            cursor = db.loan_repayments.find(
                {"loan_id": active_loan_id, "user_id": ObjectId(user_id)}
            )
            async for r in cursor:
                total_emis += 1
                if r.get("status") == "PAID":
                    paid_emis += 1
                else:
                    pending_emis += 1
                    amt = r.get("emi_amount")
                    if hasattr(amt, "to_decimal"):
                        amt = float(amt.to_decimal())
                    outstanding_amount += float(amt or 0)
            outstanding_amount = round(outstanding_amount, 2)

        # Prefer active-loan snapshot values if present
        tenure_months = loan.get("tenure_months")
        interest_rate = loan.get("interest_rate")
        emi_amount = loan.get("emi_preview")
        if active_loan:
            tenure_months = active_loan.get("tenure_months", tenure_months)
            interest_rate = active_loan.get("interest_rate", interest_rate)
            emi_amount = active_loan.get("emi_amount", emi_amount)

        return {
            "loan_id": str(loan["_id"]),
            "loan_type": loan.get("loan_type"),
            "loan_amount": to_float(loan.get("loan_amount")) or 0.0,
            "tenure_months": int(tenure_months) if tenure_months is not None else None,
            "application_status": loan.get("status"),
            "system_decision": loan.get("system_decision"),
            "interest_rate": to_float(interest_rate),
            "emi_amount": to_float(emi_amount),
            "disbursed": bool(loan.get("disbursed", False)),
            "disbursed_at": loan.get("disbursed_at"),
            "applied_at": loan.get("applied_at"),
            "active_loan_id": str(active_loan_id) if active_loan_id else None,
            "active_loan_status": active_status,
            "closed_at": closed_at,
            "repayments": {
                "total_emis": total_emis,
                "paid_emis": paid_emis,
                "pending_emis": pending_emis,
                "emi_remaining": pending_emis,
                "outstanding_amount": outstanding_amount,
            },
            # Penalties are not implemented yet; keep contract stable.
            "penalties": [],
            "penalties_total": 0.0,
            "approved_by": approver,
            "noc": {
                "status": loan.get("noc_status") or "NOT_REQUESTED",
                "requested_at": loan.get("noc_requested_at"),
                "reference_no": loan.get("noc_reference_no"),
                "approved_at": loan.get("noc_approved_at"),
                "generated_at": loan.get("noc_generated_at"),
                "rejected_at": loan.get("noc_rejected_at"),
                "rejection_reason": loan.get("noc_rejection_reason"),
                "approved_by": noc_approver,
                "can_request": bool(
                    loan.get("status") == LoanApplicationStatus.CLOSED
                    and (loan.get("noc_status") in [None, "NOT_REQUESTED", "REJECTED"])
                ),
                "can_download": bool(
                    loan.get("status") == LoanApplicationStatus.CLOSED
                    and loan.get("noc_status") == "APPROVED"
                ),
            },
        }

    async def get_user_noc_details(self, user_id: str, loan_id: str):
        from app.db.mongodb import db

        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.repo.collection.find_one(
            {"_id": ObjectId(loan_id), "user_id": ObjectId(user_id)}
        )
        if not loan:
            raise ValueError("Loan not found")

        if loan.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("Loan is not closed yet")

        noc_approver = None
        noc_approver_obj = loan.get("noc_approved_by")
        if noc_approver_obj:
            mgr = await db.managers.find_one(
                {"_id": noc_approver_obj},
                {"name": 1, "phone": 1, "manager_id": 1}
            )
            if mgr:
                noc_approver = {
                    "id": str(mgr["_id"]),
                    "manager_id": mgr.get("manager_id"),
                    "name": mgr.get("name"),
                    "phone": mgr.get("phone"),
                }
            else:
                noc_approver = {"id": str(noc_approver_obj)}

        return {
            "loan_id": str(loan["_id"]),
            "status": loan.get("noc_status") or "NOT_REQUESTED",
            "requested_at": loan.get("noc_requested_at"),
            "reference_no": loan.get("noc_reference_no"),
            "approved_at": loan.get("noc_approved_at"),
            "generated_at": loan.get("noc_generated_at"),
            "rejected_at": loan.get("noc_rejected_at"),
            "rejection_reason": loan.get("noc_rejection_reason"),
            "approved_by": noc_approver,
            "can_request": bool(loan.get("noc_status") in [None, "NOT_REQUESTED", "REJECTED"]),
            "can_download": bool(loan.get("noc_status") == "APPROVED"),
        }

    async def request_noc(self, user_id: str, loan_id: str):
        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.repo.collection.find_one(
            {"_id": ObjectId(loan_id), "user_id": ObjectId(user_id)}
        )
        if not loan:
            raise ValueError("Loan not found")

        if loan.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("NOC can only be requested after loan closure")

        current_status = loan.get("noc_status")
        if current_status in ["REQUESTED", "PENDING"]:
            raise ValueError("NOC request already raised and pending Loan Manager action")
        if current_status == "APPROVED":
            raise ValueError("NOC already approved")

        now = datetime.utcnow()
        await self.repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "noc_status": "REQUESTED",
                    "noc_requested_at": now,
                },
                "$unset": {
                    "noc_approved_by": "",
                    "noc_approved_at": "",
                    "noc_generated_at": "",
                    "noc_rejected_by": "",
                    "noc_rejected_at": "",
                    "noc_rejection_reason": "",
                },
            },
        )

        return {
            "message": "NOC request raised successfully",
            "noc_status": "REQUESTED",
            "requested_at": now,
        }

    async def generate_user_noc_pdf(self, user_id: str, loan_id: str):
        from app.db.mongodb import db

        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.repo.collection.find_one(
            {"_id": ObjectId(loan_id), "user_id": ObjectId(user_id)}
        )
        if not loan:
            raise ValueError("Loan not found")

        if loan.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("Loan is not closed yet")

        if loan.get("noc_status") != "APPROVED":
            raise ValueError("NOC is pending Loan Manager approval")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        noc_approver_obj = loan.get("noc_approved_by")
        manager_name = "Loan Manager"
        if noc_approver_obj:
            manager = await db.managers.find_one({"_id": noc_approver_obj}, {"name": 1})
            if manager and manager.get("name"):
                manager_name = str(manager.get("name"))

        closed_at = loan.get("closed_at")
        generated_at = datetime.utcnow()
        reference_no = loan.get("noc_reference_no") or f"NOC-{loan_id[-8:].upper()}"

        pdf_bytes = self.noc_pdf_service.generate_pdf(
            reference_no=reference_no,
            borrower_name=str(user.get("name") or "Borrower"),
            loan_id=str(loan["_id"]),
            loan_type=str(loan.get("loan_type") or ""),
            loan_amount=float(loan.get("loan_amount").to_decimal()) if hasattr(loan.get("loan_amount"), "to_decimal") else float(loan.get("loan_amount") or 0.0),
            closed_at=closed_at,
            manager_name=manager_name,
            generated_at=generated_at,
        )

        await self.repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "noc_generated_at": generated_at,
                    "noc_reference_no": reference_no,
                }
            }
        )

        file_name = f"Monify_NOC_{str(loan['_id'])}.pdf"
        return pdf_bytes, file_name
 
    # -------------------------------------------------
    # USER ELIGIBILITY CHECK
    # -------------------------------------------------
    async def _validate_user_eligibility(self, user: dict):
        if user["kyc_status"] != KYCStatus.COMPLETED:
            raise ValueError("KYC not completed")
 
        if user["approval_status"] != UserApprovalStatus.APPROVED:
            raise ValueError("User not approved by bank")
 
        if user.get("is_minor", False):
            raise ValueError("Minor users are not eligible for loans")

        # Block second loan applications until previous loan is fully closed.
        open_loan_count = await self.repo.collection.count_documents({
            "user_id": user["_id"],
            "status": {
                "$in": [
                    LoanApplicationStatus.PENDING,
                    LoanApplicationStatus.MANUAL_REVIEW,
                    LoanApplicationStatus.ESCALATED,
                    LoanApplicationStatus.APPROVED,
                    LoanApplicationStatus.FINALIZED
                ]
            }
        })

        if open_loan_count > 0:
            raise ValueError(
                "You already have an existing pending/active loan. "
                "Close the current loan before applying for a new one."
            )

