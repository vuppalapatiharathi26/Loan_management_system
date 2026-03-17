from datetime import datetime

from app.repositories.account_repository import AccountRepository
from app.repositories.transaction_repository import TransactionRepository
from app.utils.mongo_serializer import serialize_mongo
from app.repositories.user_repository import UserRepository
from app.auth.password import verify_password

class AccountService:
    MAX_DIGIPIN_DEBIT = 1_000_000  # 10 lakhs

    def __init__(self):
        self.account_repo = AccountRepository()
        self.tx_repo = TransactionRepository()
        self.user_repo = UserRepository()

    async def get_bank_details(self, user_id: str):
        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        return {
            "account_number": account.get("account_number"),
            "ifsc_code": account.get("ifsc_code"),
            "updated_at": account.get("updated_at"),
        }

    async def get_balance(self, user_id: str):
        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        return {
            "balance": account["balance"],
            "account_number": account.get("account_number"),
            "ifsc_code": account.get("ifsc_code"),
            "updated_at": account["updated_at"]
        }

    async def get_balance_with_digipin(self, user_id: str, digi_pin: str):
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.get("digi_pin_hash"):
            raise ValueError("Digi PIN not set")

        if not verify_password(digi_pin, user["digi_pin_hash"]):
            raise ValueError("Invalid Digi PIN")

        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        return {
            "balance": account["balance"],
            "account_number": account.get("account_number"),
            "ifsc_code": account.get("ifsc_code"),
            "updated_at": account["updated_at"]
        }

    async def deposit(
        self,
        user_id: str,
        amount: float,
        *,
        reference: str = "DEPOSIT",
        loan_id: str | None = None,
        manager_id: str | None = None
    ):
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")

        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        # atomic credit
        updated = await self.account_repo.change_balance_atomic(user_id, float(amount))
        if not updated:
            raise ValueError("Failed to credit account")

        await self.tx_repo.create(
            user_id=user_id,
            tx_type="CREDIT",
            amount=amount,
            reference=reference,
            balance_after=updated["balance"],
            loan_id=loan_id,
            manager_id=manager_id
        )

        return {
            "message": "Amount deposited successfully",
            "balance": updated["balance"]
        }

    async def withdraw(self, user_id: str, amount: float):
        if amount <= 0:
            raise ValueError("Withdraw amount must be positive")

        account = await self.account_repo.get_by_user_id(user_id)
        if not account:
            raise ValueError("Account not found")

        # atomic debit (prevents going negative)
        updated = await self.account_repo.change_balance_atomic(user_id, float(-amount))
        if not updated:
            raise ValueError("Insufficient balance")

        await self.tx_repo.create(
            user_id=user_id,
            tx_type="DEBIT",
            amount=amount,
            reference="WITHDRAWAL",
            balance_after=updated["balance"]
        )

        return {
            "message": "Amount withdrawn successfully",
            "balance": updated["balance"]
        }

    # ======================================
    # Credit with DigiPIN verification
    # ======================================
    async def credit_with_digipin(self, user_id: str, amount: float, digi_pin: str):
        if amount <= 0:
            raise ValueError("Amount must be positive")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.get("digi_pin_hash"):
            raise ValueError("Digi PIN not set")

        if not verify_password(digi_pin, user["digi_pin_hash"]):
            raise ValueError("Invalid Digi PIN")

        updated = await self.account_repo.change_balance_atomic(user_id, float(amount))
        if not updated:
            if not await self.account_repo.exists(user_id):
                await self.account_repo.create_account(user_id)
                updated = await self.account_repo.change_balance_atomic(user_id, float(amount))

        if not updated:
            raise ValueError("Failed to credit account")

        await self.tx_repo.create(
            user_id=user_id,
            tx_type="CREDIT",
            amount=amount,
            reference="CREDIT_DIGIPIN",
            balance_after=updated["balance"]
        )

        return {"message": "Amount credited", "balance": updated["balance"]}

    # ======================================
    # Debit with DigiPIN verification
    # ======================================
    async def debit_with_digipin(self, user_id: str, amount: float, digi_pin: str):
        if amount <= 0:
            raise ValueError("Amount must be positive")
        if amount > self.MAX_DIGIPIN_DEBIT:
            raise ValueError("Maximum debit amount is 10,00,000")

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.get("digi_pin_hash"):
            raise ValueError("Digi PIN not set")

        if not verify_password(digi_pin, user["digi_pin_hash"]):
            raise ValueError("Invalid Digi PIN")

        updated = await self.account_repo.change_balance_atomic(user_id, float(-amount))
        if not updated:
            raise ValueError("Insufficient balance")

        await self.tx_repo.create(
            user_id=user_id,
            tx_type="DEBIT",
            amount=amount,
            reference="DEBIT_DIGIPIN",
            balance_after=updated["balance"]
        )

        return {"message": "Amount debited", "balance": updated["balance"]}

    async def list_transactions(self, user_id: str, limit: int = 50):
        transactions = await self.tx_repo.list_by_user(user_id, skip=0, limit=limit)
        return serialize_mongo(transactions)

    async def list_transactions_paged(
        self,
        user_id: str,
        *,
        skip: int = 0,
        limit: int = 50,
        tx_type: str | None = None,
        start=None,
        end=None
    ):
        tx_type_norm = (tx_type or "").strip().upper() or None
        if tx_type_norm and tx_type_norm not in ("CREDIT", "DEBIT"):
            raise ValueError("Invalid transaction type filter")

        items = await self.tx_repo.list_by_user(
            user_id,
            skip=skip,
            limit=limit,
            tx_type=tx_type_norm,
            start=start,
            end=end
        )
        total = await self.tx_repo.count_by_user(
            user_id,
            tx_type=tx_type_norm,
            start=start,
            end=end
        )

        return {
            "transactions": serialize_mongo(items),
            "total": total,
            "skip": skip,
            "limit": limit,
        }
