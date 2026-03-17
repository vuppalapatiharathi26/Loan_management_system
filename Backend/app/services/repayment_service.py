from app.repositories.account_repository import AccountRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.repayment_repository import RepaymentRepository
from app.repositories.loan_application_repository import LoanApplicationRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.user_repository import UserRepository
from app.repositories.payment_repository import PaymentRepository
from app.services.stripe_service import StripeService
from app.core.config import settings
from app.db.mongodb import db
from bson import ObjectId
from app.utils.mongo_serializer import serialize_mongo
from typing import Optional
from datetime import datetime
from app.enums.loan import LoanApplicationStatus
from app.auth.password import verify_password


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if hasattr(value, "to_decimal"):
        return float(value.to_decimal())
    return float(value)

class RepaymentService:
    def __init__(self):
        self.account_repo = AccountRepository()
        self.tx_repo = TransactionRepository()
        self.repayment_repo = RepaymentRepository()
        self.loan_app_repo = LoanApplicationRepository()
        self.loan_repo = LoanRepository()
        self.user_repo = UserRepository()
        self.payment_repo = PaymentRepository()

    def _get_stripe_service(self) -> StripeService:
        return StripeService()

    async def _get_account_balance(self, user_id: str) -> float:
        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            return 0.0
        return float(account.get("balance") or 0.0)

    async def _verify_digipin(self, user_id: str, digi_pin: str):
        if not digi_pin or not (4 <= len(digi_pin) <= 6) or not digi_pin.isdigit():
            raise ValueError("Enter a valid 4-6 digit DigiPIN")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.get("digi_pin_hash"):
            raise ValueError("Digi PIN not set")

        if not verify_password(digi_pin, user["digi_pin_hash"]):
            raise ValueError("Invalid Digi PIN")

    async def _mark_closed_if_no_pending(
        self,
        *,
        loan_id: str,
        loan_application_id: str
    ):
        pending_count = await self.repayment_repo.collection.count_documents(
            {"loan_id": ObjectId(loan_id), "status": "PENDING"}
        )

        if pending_count > 0:
            return

        now = datetime.utcnow()
        await self.loan_repo.collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "status": "CLOSED",
                    "closed_at": now,
                    "updated_at": now
                }
            }
        )

        await self.loan_app_repo.collection.update_one(
            {"_id": ObjectId(loan_application_id)},
            {
                "$set": {
                    "status": LoanApplicationStatus.CLOSED,
                    "closed_at": now,
                    "noc_status": "NOT_REQUESTED"
                }
            }
        )

    async def _get_user_loan_context(self, user_id: str, loan_application_id: str):
        if not ObjectId.is_valid(loan_application_id):
            raise ValueError("Invalid loan application id")

        loan_app = await self.loan_app_repo.collection.find_one(
            {
                "_id": ObjectId(loan_application_id),
                "user_id": ObjectId(user_id)
            }
        )
        if not loan_app:
            raise ValueError("Loan application not found")

        active_loan_id = loan_app.get("active_loan_id")
        if not active_loan_id:
            raise ValueError("No active loan found for this application")

        loan = await self.loan_repo.collection.find_one({"_id": active_loan_id})
        if not loan:
            raise ValueError("Active loan not found")

        return loan_app, loan

    async def _debit_user_account(
        self,
        *,
        user_id: str,
        digi_pin: str,
        amount: float,
        reference: str,
        loan_id: str,
        emi_number: Optional[int] = None
    ):
        if amount <= 0:
            raise ValueError("Amount must be positive")

        await self._verify_digipin(user_id, digi_pin)

        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        if account["balance"] < amount:
            raise ValueError("Insufficient balance")

        new_balance = account["balance"] - amount
        await self.account_repo.update_balance(user_id, new_balance)

        await self.tx_repo.create(
            user_id=user_id,
            tx_type="DEBIT",
            amount=amount,
            reference=reference,
            loan_id=loan_id,
            emi_number=emi_number,
            balance_after=new_balance
        )

        return new_balance

    async def list_emis(self, user_id: str, loan_id: Optional[str] = None):

        if loan_id:
            emis = await self.repayment_repo.list_by_user_and_loan(
                user_id=user_id,
                loan_id=loan_id
            )
        else:
            emis = await self.repayment_repo.list_by_user(user_id)

        return serialize_mongo(emis)


    async def list_repayments_by_user(self, user_id: str):
        emis = await self.repayment_repo.list_paid_by_user(user_id)
        return serialize_mongo(emis)

    async def pay_emi(self, emi_id: str, user_id: str, digi_pin: str):
        emi = await self.repayment_repo.get_by_id(emi_id)
        if not emi:
            raise ValueError("EMI not found")

        if emi["status"] == "PAID":
            raise ValueError("EMI already paid")

        await self._verify_digipin(user_id, digi_pin)

        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        emi_amount = float(emi["emi_amount"])

        if account["balance"] < emi_amount:
            await self.repayment_repo.increment_attempt(emi_id)
            raise ValueError("Insufficient balance")

        # 1️⃣ Debit balance
        new_balance = account["balance"] - emi_amount
        await self.account_repo.update_balance(user_id, new_balance)

        # 2️⃣ Mark EMI paid
        await self.repayment_repo.mark_paid(emi_id)

        # 3️⃣ Ledger entry
        await self.tx_repo.create(
            user_id=user_id,
            tx_type="DEBIT",
            amount=emi_amount,
            reference="EMI_PAYMENT",
            loan_id=str(emi["loan_id"]),
            emi_number=emi["emi_number"],
            balance_after=new_balance
        )

        loan = await self.loan_repo.collection.find_one({"_id": emi["loan_id"]})
        if loan:
            await self._mark_closed_if_no_pending(
                loan_id=str(emi["loan_id"]),
                loan_application_id=str(loan["loan_application_id"])
            )

        return {
            "message": "EMI paid successfully",
            "remaining_balance": new_balance
        }

    async def get_repayment_summary(self, user_id: str, loan_application_id: str):
        loan_app, loan = await self._get_user_loan_context(user_id, loan_application_id)

        active_loan_id = str(loan["_id"])
        emis = await self.repayment_repo.list_by_user_and_loan(user_id, active_loan_id)
        serialized = serialize_mongo(emis)

        pending_emis = [e for e in serialized if e.get("status") == "PENDING"]
        paid_emis = [e for e in serialized if e.get("status") == "PAID"]

        outstanding_amount = round(
            sum(float(e.get("emi_amount") or 0) for e in pending_emis),
            2
        )

        principal = _to_float(loan.get("loan_amount") or loan_app.get("loan_amount"))
        annual_rate = _to_float(loan.get("interest_rate") or loan_app.get("interest_rate"))
        outstanding_principal = round(
            principal * (len(pending_emis) / max(1, int(loan.get("tenure_months", 1)))),
            2
        )
        interest_due_now = round((outstanding_principal * annual_rate) / (12 * 100), 2)

        return {
            "loan_application_id": loan_application_id,
            "active_loan_id": active_loan_id,
            "loan_status": loan_app.get("status"),
            "disbursed": bool(loan_app.get("disbursed")),
            "total_emis": len(serialized),
            "paid_emis": len(paid_emis),
            "pending_emis": len(pending_emis),
            "outstanding_amount": outstanding_amount,
            "interest_due_now": max(interest_due_now, 0.0),
            "emis": serialized
        }

    async def pay_next_emi(self, user_id: str, loan_application_id: str, digi_pin: str):
        _, loan = await self._get_user_loan_context(user_id, loan_application_id)
        active_loan_id = str(loan["_id"])

        pending = await self.repayment_repo.list_pending_by_user_and_loan(user_id, active_loan_id)
        if not pending:
            raise ValueError("No pending EMI found")

        next_emi = pending[0]
        return await self.pay_emi(str(next_emi["_id"]), user_id, digi_pin)

    async def pay_full_amount(self, user_id: str, loan_application_id: str, digi_pin: str):
        loan_app, loan = await self._get_user_loan_context(user_id, loan_application_id)
        active_loan_id = str(loan["_id"])

        pending = await self.repayment_repo.list_pending_by_user_and_loan(user_id, active_loan_id)
        if not pending:
            raise ValueError("Loan is already fully paid")

        total_due = round(sum(float(emi.get("emi_amount") or 0) for emi in pending), 2)
        remaining_balance = await self._debit_user_account(
            user_id=user_id,
            digi_pin=digi_pin,
            amount=total_due,
            reference="FULL_LOAN_REPAYMENT",
            loan_id=active_loan_id
        )

        await self.repayment_repo.mark_many_paid([emi["_id"] for emi in pending])
        await self._mark_closed_if_no_pending(
            loan_id=active_loan_id,
            loan_application_id=str(loan_app["_id"])
        )

        return {
            "message": "Full repayment completed and loan closed",
            "amount_paid": total_due,
            "remaining_balance": remaining_balance
        }

    async def pay_interest_only(self, user_id: str, loan_application_id: str, digi_pin: str):
        loan_app, loan = await self._get_user_loan_context(user_id, loan_application_id)
        active_loan_id = str(loan["_id"])

        pending = await self.repayment_repo.list_pending_by_user_and_loan(user_id, active_loan_id)
        if not pending:
            raise ValueError("No pending EMI found")

        principal = _to_float(loan.get("loan_amount") or loan_app.get("loan_amount"))
        annual_rate = _to_float(loan.get("interest_rate") or loan_app.get("interest_rate"))
        tenure = max(1, int(loan.get("tenure_months", 1)))
        outstanding_principal = principal * (len(pending) / tenure)
        interest_due = round((outstanding_principal * annual_rate) / (12 * 100), 2)

        if interest_due <= 0:
            raise ValueError("No interest due")

        next_emi_number = int(pending[0].get("emi_number", 0))
        remaining_balance = await self._debit_user_account(
            user_id=user_id,
            digi_pin=digi_pin,
            amount=interest_due,
            reference="INTEREST_ONLY_PAYMENT",
            loan_id=active_loan_id,
            emi_number=next_emi_number
        )

        return {
            "message": "Interest-only amount paid successfully",
            "amount_paid": interest_due,
            "remaining_balance": remaining_balance
        }

    # =====================================================
    # STRIPE PAYMENT INTENTS
    # =====================================================
    async def create_stripe_payment_intent_for_emi(self, user_id: str, emi_id: str):
        emi = await self.repayment_repo.get_by_id(emi_id)
        if not emi:
            raise ValueError("EMI not found")
        if str(emi.get("user_id")) != str(user_id):
            raise ValueError("Access denied for this EMI")
        if emi.get("status") == "PAID":
            raise ValueError("EMI already paid")

        amount = float(emi.get("emi_amount") or 0.0)
        if amount <= 0:
            raise ValueError("Invalid EMI amount")

        payment_id = await self.payment_repo.create({
            "provider": "STRIPE",
            "status": "CREATED",
            "purpose": "EMI",
            "user_id": ObjectId(user_id),
            "loan_id": emi.get("loan_id"),
            "emi_id": emi.get("_id"),
            "amount_expected": amount,
            "currency": settings.STRIPE_CURRENCY
        })

        stripe_service = self._get_stripe_service()
        metadata = {
            "payment_id": str(payment_id),
            "emi_id": str(emi.get("_id")),
            "user_id": str(user_id),
            "purpose": "EMI"
        }
        intent = stripe_service.create_payment_intent(
            amount=amount,
            currency=settings.STRIPE_CURRENCY,
            metadata=metadata,
            idempotency_key=str(payment_id)
        )

        await self.payment_repo.attach_intent(str(payment_id), intent.id, intent.status)

        return {
            "payment_id": str(payment_id),
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "amount": amount,
            "currency": settings.STRIPE_CURRENCY
        }

    async def create_stripe_payment_intent_for_full(self, user_id: str, loan_application_id: str):
        loan_app, loan = await self._get_user_loan_context(user_id, loan_application_id)
        active_loan_id = str(loan["_id"])

        pending = await self.repayment_repo.list_pending_by_user_and_loan(user_id, active_loan_id)
        if not pending:
            raise ValueError("Loan is already fully paid")

        total_due = round(sum(float(emi.get("emi_amount") or 0) for emi in pending), 2)
        if total_due <= 0:
            raise ValueError("Invalid repayment amount")

        emi_ids = [emi["_id"] for emi in pending]

        payment_id = await self.payment_repo.create({
            "provider": "STRIPE",
            "status": "CREATED",
            "purpose": "FULL",
            "user_id": ObjectId(user_id),
            "loan_id": ObjectId(active_loan_id),
            "loan_application_id": ObjectId(loan_application_id),
            "emi_ids": emi_ids,
            "amount_expected": total_due,
            "currency": settings.STRIPE_CURRENCY
        })

        stripe_service = self._get_stripe_service()
        metadata = {
            "payment_id": str(payment_id),
            "loan_application_id": str(loan_application_id),
            "user_id": str(user_id),
            "purpose": "FULL"
        }
        intent = stripe_service.create_payment_intent(
            amount=total_due,
            currency=settings.STRIPE_CURRENCY,
            metadata=metadata,
            idempotency_key=str(payment_id)
        )

        await self.payment_repo.attach_intent(str(payment_id), intent.id, intent.status)

        return {
            "payment_id": str(payment_id),
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "amount": total_due,
            "currency": settings.STRIPE_CURRENCY
        }

    async def create_stripe_payment_intent_for_interest(self, user_id: str, loan_application_id: str):
        loan_app, loan = await self._get_user_loan_context(user_id, loan_application_id)
        active_loan_id = str(loan["_id"])

        pending = await self.repayment_repo.list_pending_by_user_and_loan(user_id, active_loan_id)
        if not pending:
            raise ValueError("No pending EMI found")

        principal = _to_float(loan.get("loan_amount") or loan_app.get("loan_amount"))
        annual_rate = _to_float(loan.get("interest_rate") or loan_app.get("interest_rate"))
        tenure = max(1, int(loan.get("tenure_months", 1)))
        outstanding_principal = principal * (len(pending) / tenure)
        interest_due = round((outstanding_principal * annual_rate) / (12 * 100), 2)

        if interest_due <= 0:
            raise ValueError("No interest due")

        next_emi_number = int(pending[0].get("emi_number", 0))

        payment_id = await self.payment_repo.create({
            "provider": "STRIPE",
            "status": "CREATED",
            "purpose": "INTEREST",
            "user_id": ObjectId(user_id),
            "loan_id": ObjectId(active_loan_id),
            "loan_application_id": ObjectId(loan_application_id),
            "amount_expected": interest_due,
            "currency": settings.STRIPE_CURRENCY,
            "emi_number": next_emi_number
        })

        stripe_service = self._get_stripe_service()
        metadata = {
            "payment_id": str(payment_id),
            "loan_application_id": str(loan_application_id),
            "user_id": str(user_id),
            "purpose": "INTEREST"
        }
        intent = stripe_service.create_payment_intent(
            amount=interest_due,
            currency=settings.STRIPE_CURRENCY,
            metadata=metadata,
            idempotency_key=str(payment_id)
        )

        await self.payment_repo.attach_intent(str(payment_id), intent.id, intent.status)

        return {
            "payment_id": str(payment_id),
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "amount": interest_due,
            "currency": settings.STRIPE_CURRENCY
        }

    # =====================================================
    # STRIPE WEBHOOK HANDLER
    # =====================================================
    async def _apply_successful_intent(self, *, intent: dict):
        intent_id = intent.get("id")
        if not intent_id:
            raise ValueError("Missing payment intent id")

        payment = await self.payment_repo.get_by_intent_id(intent_id)
        if not payment:
            return {"ignored": True}

        if payment.get("status") == "SUCCEEDED":
            return {"status": "already_processed"}

        amount_received = (intent.get("amount_received") or intent.get("amount") or 0) / 100
        currency = intent.get("currency")
        expected_currency = payment.get("currency")
        if expected_currency and currency and currency.lower() != str(expected_currency).lower():
            raise ValueError("Currency mismatch")

        expected_amount = float(payment.get("amount_expected") or 0)
        if expected_amount and abs(expected_amount - float(amount_received)) > 0.01:
            raise ValueError("Amount mismatch")

        purpose = payment.get("purpose")
        user_id = str(payment.get("user_id"))
        loan_id = payment.get("loan_id")

        if purpose == "EMI":
            emi_id = str(payment.get("emi_id"))
            emi = await self.repayment_repo.get_by_id(emi_id)
            if emi and emi.get("status") != "PAID":
                await self.repayment_repo.mark_paid(emi_id)
                balance = await self._get_account_balance(user_id)
                await self.tx_repo.create(
                    user_id=user_id,
                    tx_type="DEBIT",
                    amount=amount_received,
                    reference="EMI_PAYMENT",
                    loan_id=str(emi.get("loan_id")),
                    emi_number=emi.get("emi_number"),
                    balance_after=balance
                )
                loan = await self.loan_repo.collection.find_one({"_id": emi.get("loan_id")})
                if loan:
                    await self._mark_closed_if_no_pending(
                        loan_id=str(emi.get("loan_id")),
                        loan_application_id=str(loan.get("loan_application_id"))
                    )

        elif purpose == "FULL":
            emi_ids = payment.get("emi_ids") or []
            if emi_ids:
                await self.repayment_repo.mark_many_paid(emi_ids)
            balance = await self._get_account_balance(user_id)
            await self.tx_repo.create(
                user_id=user_id,
                tx_type="DEBIT",
                amount=amount_received,
                reference="FULL_LOAN_REPAYMENT",
                loan_id=str(loan_id),
                balance_after=balance
            )
            if loan_id:
                loan = await self.loan_repo.collection.find_one({"_id": loan_id})
                if loan:
                    await self._mark_closed_if_no_pending(
                        loan_id=str(loan_id),
                        loan_application_id=str(loan.get("loan_application_id"))
                    )

        elif purpose == "INTEREST":
            balance = await self._get_account_balance(user_id)
            await self.tx_repo.create(
                user_id=user_id,
                tx_type="DEBIT",
                amount=amount_received,
                reference="INTEREST_ONLY_PAYMENT",
                loan_id=str(loan_id) if loan_id else None,
                emi_number=payment.get("emi_number"),
                balance_after=balance
            )

        await self.payment_repo.mark_succeeded(
            payment["_id"],
            intent_status=intent.get("status"),
            amount_received=amount_received
        )
        return {"status": "succeeded"}

    async def handle_stripe_webhook(self, event: dict):
        event_type = event.get("type")
        if event_type not in {"payment_intent.succeeded", "payment_intent.payment_failed"}:
            return {"ignored": True}

        intent = event.get("data", {}).get("object", {})
        intent_id = intent.get("id")
        if not intent_id:
            raise ValueError("Missing payment intent id")

        payment = await self.payment_repo.get_by_intent_id(intent_id)
        if not payment:
            return {"ignored": True}

        if event_type == "payment_intent.payment_failed":
            failure_message = None
            last_error = intent.get("last_payment_error") or {}
            if last_error:
                failure_message = last_error.get("message")
            await self.payment_repo.mark_failed(
                payment["_id"],
                intent_status=intent.get("status"),
                failure_message=failure_message
            )
            return {"status": "failed"}

        return await self._apply_successful_intent(intent=intent)

    async def verify_stripe_payment_intent(self, intent_id: str):
        stripe_service = self._get_stripe_service()
        intent = stripe_service.retrieve_payment_intent(intent_id)
        if intent.get("status") != "succeeded":
            return {"status": intent.get("status")}
        return await self._apply_successful_intent(intent=intent)
