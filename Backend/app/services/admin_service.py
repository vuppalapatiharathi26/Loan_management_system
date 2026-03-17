from datetime import datetime
from bson import ObjectId
from bson.decimal128 import Decimal128
from app.repositories.user_repository import UserRepository
from app.auth.password import hash_password
from app.enums.role import Role
from app.enums.loan import LoanApplicationStatus
from app.schemas.loan_decision import LoanDecision

from app.repositories.manager_repository import ManagerRepository
from app.repositories.user_repository import UserRepository
from app.repositories.loan_application_repository import LoanApplicationRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.transaction_repository import TransactionRepository
from app.utils.mongo_serializer import serialize_mongo
from app.services.noc_pdf_service import NOCPdfService
from app.db.mongodb import db


class AdminService:
    def __init__(self):
        self.manager_repo = ManagerRepository()
        self.user_repo = UserRepository()
        self.loan_repo = LoanApplicationRepository()
        self.audit_repo = AuditLogRepository()
        self.tx_repo = TransactionRepository()
        self.noc_pdf_service = NOCPdfService()
    def _convert_decimal(self, value):
        if isinstance(value, Decimal128):
            return float(value.to_decimal())
        return float(value) if value is not None else None

    # ========================
    # MANAGER MANAGEMENT
    # ========================
    async def create_manager(self, payload):
        if payload.role not in [Role.BANK_MANAGER, Role.LOAN_MANAGER]:
            raise ValueError("Invalid manager role")

        existing = await self.manager_repo.find_by_manager_id(payload.manager_id)
        if existing:
            raise ValueError("Manager ID already exists")

        manager_doc = {
            "manager_id": payload.manager_id,
            "name": payload.name,
            "phone": payload.phone,
            "role": payload.role,
            "password_hash": hash_password(payload.password),
            "status": "ACTIVE",
            "approved_by_admin": True,
            "created_at": datetime.utcnow()
        }

        result = await self.manager_repo.create(manager_doc)
        
        return {
            "manager_id": payload.manager_id,
            "name": payload.name,
            "phone": payload.phone,
            "role": payload.role,
            "status": "ACTIVE",
            "created_at": manager_doc["created_at"].isoformat()
        }

    async def list_managers(self, status: str | None = None):
        query = {}
        if status:
            query["status"] = status
        else:
            # exclude soft-deleted managers from default listing
            query["is_deleted"] = {"$ne": True}

        cursor = self.manager_repo.collection.find(query)
        managers = []

        async for m in cursor:
            managers.append({
                "manager_id": m.get("manager_id"),
                "name": m.get("name"),
                "phone": m.get("phone"),
                "role": m.get("role"),
                "status": m.get("status"),
                "created_at": m.get("created_at").isoformat()
                if m.get("created_at") else None
            })

        return managers


    async def update_manager(self, manager_id: str, payload: dict):
        result = await self.manager_repo.collection.update_one(
            {"manager_id": manager_id},
            {"$set": payload}
        )
        if result.matched_count == 0:
            raise ValueError("Manager not found")

    async def disable_manager(self, manager_id: str):
        result = await self.manager_repo.collection.update_one(
            {"manager_id": manager_id},
            {"$set": {"status": "DISABLED", "updated_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            raise ValueError("Manager not found")
        
    async def enable_manager(self, manager_id: str):
        result = await self.manager_repo.collection.update_one(
            {"manager_id": manager_id},
            {"$set": {"status": "ACTIVE", "updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise ValueError("Manager not found")


    async def delete_manager(self, manager_id: str, admin_id: str):
        # Soft-delete manager and reassign/escalate dependent resources.
        manager = await self.manager_repo.find_by_manager_id(manager_id)
        if not manager:
            raise ValueError("Manager not found")

        # perform soft delete on manager
        await self.manager_repo.soft_delete(manager_id, deleted_by=admin_id)

        # Create audit log for manager deletion
        await self.audit_repo.create({
            "actor_id": admin_id,
            "actor_role": "ADMIN",
            "action": "MANAGER_DELETED",
            "entity_type": "MANAGER",
            "entity_id": manager_id,
            "remarks": f"Manager {manager_id} soft-deleted by admin {admin_id}",
            "timestamp": datetime.utcnow()
        })

        # If the manager was a LOAN_MANAGER, escalate their active/pending loan applications
        if manager.get("role") == Role.LOAN_MANAGER:
            # Escalate loan applications that the manager may have been handling.
            # We consider loans where decided_by / escalated_by / confirmed_by / finalized_by reference this manager
            from bson import ObjectId

            manager_obj_id = None
            try:
                if ObjectId.is_valid(str(manager.get("_id"))):
                    manager_obj_id = ObjectId(str(manager.get("_id")))
            except Exception:
                manager_obj_id = None

            # Build a filter to find loan applications potentially acted on by this manager
            filter_query = {
                "$or": [
                    {"decided_by": manager_obj_id} if manager_obj_id else {},
                    {"escalated_by": manager_obj_id} if manager_obj_id else {},
                    {"confirmed_by": manager_obj_id} if manager_obj_id else {},
                    {"finalized_by": manager_obj_id} if manager_obj_id else {}
                ]
            }

            # Clean empty dicts from $or
            filter_query["$or"] = [q for q in filter_query["$or"] if q]
            if len(filter_query["$or"]) > 0:
                # Only escalate loan applications that are not already escalated or finalized/rejected
                update_selector = {
                    "$set": {
                        "escalated": True,
                        "escalated_reason": "Manager deleted - auto escalation",
                        "escalated_by": manager_obj_id if manager_obj_id else None,
                        "escalated_at": datetime.utcnow(),
                        "status": LoanApplicationStatus.ESCALATED
                    }
                }

                result = await self.loan_repo.collection.update_many(
                    {
                        "$and": [
                            filter_query,
                            {"status": {"$nin": [LoanApplicationStatus.FINALIZED, LoanApplicationStatus.REJECTED]}}
                        ]
                    },
                    update_selector
                )

                # Create audit logs for updated loans
                if result.modified_count > 0:
                    cursor = self.loan_repo.collection.find({"escalated_reason": "Manager deleted - auto escalation"})
                    async for loan in cursor:
                        await self.audit_repo.create({
                            "actor_id": admin_id,
                            "actor_role": "ADMIN",
                            "action": "LOAN_AUTOMATICALLY_ESCALATED",
                            "entity_type": "LOAN_APPLICATION",
                            "entity_id": str(loan.get("_id")),
                            "remarks": f"Escalated due to manager {manager_id} deletion",
                            "timestamp": datetime.utcnow()
                        })

        # If the manager was a BANK_MANAGER, remove approvals assigned by them (avoid orphaned approval refs)
        if manager.get("role") == Role.BANK_MANAGER:
            from bson import ObjectId
            manager_obj_id = None
            try:
                if ObjectId.is_valid(str(manager.get("_id"))):
                    manager_obj_id = ObjectId(str(manager.get("_id")))
            except Exception:
                manager_obj_id = None

            if manager_obj_id:
                # Clear approved_by_manager_id for users who were approved by this manager
                res = await self.user_repo.collection.update_many(
                    {"approved_by_manager_id": manager_obj_id},
                    {"$set": {"approved_by_manager_id": None}}
                )

                if res.modified_count > 0:
                    # create audit entries for affected users
                    cursor = self.user_repo.collection.find({"approved_by_manager_id": None, "approval_status": {"$in": ["APPROVED", "DELETED"]}})
                    async for user in cursor:
                        await self.audit_repo.create({
                            "actor_id": admin_id,
                            "actor_role": "ADMIN",
                            "action": "USER_APPROVAL_REASSIGNED",
                            "entity_type": "USER",
                            "entity_id": str(user.get("_id")),
                            "remarks": f"Cleared approved_by_manager_id due to bank manager {manager_id} deletion",
                            "timestamp": datetime.utcnow()
                        })

    # ========================
    # USER OVERSIGHT
    # ========================
    async def list_users(self):
        cursor = self.user_repo.collection.find()
        users = []

        async for u in cursor:
            users.append({
                "user_id": str(u["_id"]),
                "name": u.get("name"),
                "phone": u.get("phone"),
                "kyc_status": u.get("kyc_status"),
                "approval_status": u.get("approval_status"),
                "deletion_requested": u.get("deletion_requested", False),
                "created_at": u.get("created_at").isoformat()
                if u.get("created_at") else None
            })

        return users

    async def request_user_deletion(self, user_id: str, admin_id: str):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user ID")

        result = await self.user_repo.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "deletion_requested": True,
                    "deletion_requested_by": ObjectId(admin_id),
                    "deletion_requested_at": datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            raise ValueError("User not found")

        await self.audit_repo.create({
            "actor_id": admin_id,
            "actor_role": "ADMIN",
            "action": "USER_DELETE_REQUESTED",
            "entity_type": "USER",
            "entity_id": user_id,
            "remarks": None,
            "timestamp": datetime.utcnow()
        })

    async def list_user_transactions(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 10
    ):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user ID")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        total = await self.tx_repo.count_by_user(user_id)

        transactions = await self.tx_repo.list_by_user(
            user_id=user_id,
            skip=skip,
            limit=limit
        )

        return {
            "transactions": serialize_mongo(transactions),
            "total": total,
            "skip": skip,
            "limit": limit,
        }


    # ========================
    # LOAN OVERSIGHT
    # ========================
    async def list_loans(self):
        cursor = self.loan_repo.collection.find()
        loans = []

        async for loan in cursor:
            noc_manager_name = None
            noc_approved_by = loan.get("noc_approved_by")
            if noc_approved_by:
                manager = await self.manager_repo.find_by_id(str(noc_approved_by))
                if manager and manager.get("name"):
                    noc_manager_name = str(manager.get("name"))

            loans.append({
                "loan_id": str(loan["_id"]),
                "user_id": str(loan.get("user_id")),
                "loan_status": loan.get("status"),
                "loan_amount": self._convert_decimal(loan.get("loan_amount")),
                "loan_type": loan.get("loan_type"),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": self._convert_decimal(loan.get("interest_rate")),
                "emi_preview": self._convert_decimal(loan.get("emi_preview")),
                "noc_status": loan.get("noc_status"),
                "noc_reference_no": loan.get("noc_reference_no"),
                "noc_approved_at": loan.get("noc_approved_at"),
                "noc_generated_at": loan.get("noc_generated_at"),
                "noc_approved_by_name": noc_manager_name,
            })

        return loans

    async def get_loan_noc(self, loan_id: str):
        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.loan_repo.collection.find_one({"_id": ObjectId(loan_id)})
        if not loan:
            raise ValueError("Loan not found")
        if loan.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("Loan is not closed yet")

        manager_name = None
        noc_approved_by = loan.get("noc_approved_by")
        if noc_approved_by:
            manager = await self.manager_repo.find_by_id(str(noc_approved_by))
            if manager and manager.get("name"):
                manager_name = str(manager.get("name"))

        return {
            "loan_id": str(loan["_id"]),
            "status": loan.get("noc_status") or "PENDING",
            "reference_no": loan.get("noc_reference_no"),
            "approved_at": loan.get("noc_approved_at"),
            "generated_at": loan.get("noc_generated_at"),
            "approved_by_name": manager_name,
            "can_view": bool(loan.get("noc_status") == "APPROVED"),
        }

    async def download_loan_noc(self, loan_id: str):
        if not ObjectId.is_valid(loan_id):
            raise ValueError("Invalid loan id")

        loan = await self.loan_repo.collection.find_one({"_id": ObjectId(loan_id)})
        if not loan:
            raise ValueError("Loan not found")
        if loan.get("status") != LoanApplicationStatus.CLOSED:
            raise ValueError("Loan is not closed yet")
        if loan.get("noc_status") != "APPROVED":
            raise ValueError("NOC is not approved yet")

        user = await self.user_repo.find_by_id(str(loan.get("user_id")))
        if not user:
            raise ValueError("User not found")

        manager_name = "Loan Manager"
        noc_approved_by = loan.get("noc_approved_by")
        if noc_approved_by:
            manager = await self.manager_repo.find_by_id(str(noc_approved_by))
            if manager and manager.get("name"):
                manager_name = str(manager.get("name"))

        now = datetime.utcnow()
        reference_no = loan.get("noc_reference_no") or f"NOC-{loan_id[-8:].upper()}"
        amount_raw = loan.get("loan_amount")
        loan_amount = float(amount_raw.to_decimal()) if hasattr(amount_raw, "to_decimal") else float(amount_raw or 0.0)

        pdf_bytes = self.noc_pdf_service.generate_pdf(
            reference_no=reference_no,
            borrower_name=str(user.get("name") or "Borrower"),
            loan_id=str(loan["_id"]),
            loan_type=str(loan.get("loan_type") or ""),
            loan_amount=loan_amount,
            closed_at=loan.get("closed_at"),
            manager_name=manager_name,
            generated_at=now,
        )

        await self.loan_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {"$set": {"noc_generated_at": now, "noc_reference_no": reference_no}},
        )

        return pdf_bytes, f"Monify_NOC_{loan_id}.pdf"



    async def get_escalated_loans(self):
        cursor = self.loan_repo.collection.find(
            {"escalated": True}
        )

        loans = []
        async for loan in cursor:
            user_doc = None
            try:
                user_doc = await self.user_repo.find_by_id(str(loan["user_id"]))
            except Exception:
                user_doc = None

            loans.append({
                "loan_id": str(loan["_id"]),
                "user_id": str(loan["user_id"]),
                "user_name": user_doc.get("name") if user_doc else None,
                "loan_status": loan.get("status"),
                "system_decision": loan.get("system_decision"),
                "escalated_reason": loan.get("escalated_reason"),
                "escalated_at": loan.get("escalated_at").isoformat()
                if loan.get("escalated_at") else None,
                "loan_amount": self._convert_decimal(loan.get("loan_amount")),
                "loan_type": loan.get("loan_type"),
                "tenure_months": loan.get("tenure_months"),
                "interest_rate": self._convert_decimal(loan.get("interest_rate")),
                "emi_preview": self._convert_decimal(loan.get("emi_preview")),
                "cibil_score": loan.get("cibil_score"),
                "decision_reason": loan.get("decision_reason"),
                "active_loan_id": str(loan.get("active_loan_id")) if loan.get("active_loan_id") else None,
                "applied_at": loan.get("applied_at"),
                "finalized_at": loan.get("finalized_at"),
                "disbursed": loan.get("disbursed", False),
                "disbursed_at": loan.get("disbursed_at")
            })

        return loans


    async def decide_escalated_loan(
    self,
    loan_id: str,
    decision: LoanDecision,
    reason: str | None,
    admin_id: str
):
        loan = await self.loan_repo.find_by_id(loan_id)
        if not loan:
            raise ValueError("Loan not found")

        if not loan.get("escalated", False):
            raise ValueError("Loan is not escalated to admin")

        new_status = (
            LoanApplicationStatus.APPROVED
            if decision == LoanDecision.APPROVE
            else LoanApplicationStatus.REJECTED
        )

        await self.loan_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": new_status,
                    "admin_decision_reason": reason,
                    "admin_decided_at": datetime.utcnow(),
                    "admin_id": ObjectId(admin_id),
                    "escalated": False  # 🔒 close escalation
                }
            }
        )

        await self.audit_repo.create({
            "actor_id": admin_id,
            "actor_role": "ADMIN",
            "action": f"ADMIN_{decision.value}",
            "entity_type": "LOAN_APPLICATION",
            "entity_id": loan_id,
            "remarks": reason,
            "timestamp": datetime.utcnow()
        })

        # Resolve related escalation notifications once admin has decided.
        await db.admin_notifications.update_many(
            {"loan_id": ObjectId(loan_id)},
            {"$set": {"is_read": True, "read_at": datetime.utcnow(), "resolved_at": datetime.utcnow()}},
        )

    async def list_notifications(self, unread_only: bool = False, limit: int = 25, active_only: bool = True):
        query = {}
        if unread_only:
            query["is_read"] = {"$ne": True}

        cursor = (
            db.admin_notifications
            .find(query)
            .sort("created_at", -1)
            .limit(limit)
        )

        items = []
        async for item in cursor:
            loan_id = item.get("loan_id")
            if active_only and loan_id:
                loan = await self.loan_repo.collection.find_one(
                    {"_id": loan_id},
                    {"escalated": 1},
                )
                if not loan or not loan.get("escalated", False):
                    continue

            user_name = None
            manager_name = None

            user_id = item.get("user_id")
            manager_id = item.get("manager_id")

            if user_id:
                user = await self.user_repo.find_by_id(str(user_id))
                if user:
                    user_name = user.get("name")

            if manager_id:
                manager = await self.manager_repo.find_by_id(str(manager_id))
                if manager:
                    manager_name = manager.get("name")

            items.append({
                "notification_id": str(item.get("_id")),
                "type": item.get("type"),
                "message": item.get("message"),
                "loan_id": str(loan_id) if loan_id else None,
                "user_id": str(user_id) if user_id else None,
                "user_name": user_name,
                "manager_id": str(manager_id) if manager_id else None,
                "manager_name": manager_name,
                "reason": item.get("reason"),
                "is_read": item.get("is_read", False),
                "created_at": item.get("created_at").isoformat() if item.get("created_at") else None,
            })

        return items

    async def mark_all_notifications_read(self):
        result = await db.admin_notifications.update_many(
            {"is_read": {"$ne": True}},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}},
        )
        return {"updated": result.modified_count}
