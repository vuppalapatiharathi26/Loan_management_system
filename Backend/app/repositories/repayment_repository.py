from datetime import datetime
from bson import ObjectId

from app.db.mongodb import db


class RepaymentRepository:
    def __init__(self):
        self.collection = db.loan_repayments

    async def list_by_user(self, user_id: str):
        cursor = self.collection.find(
            {"user_id": ObjectId(user_id)}
        ).sort("due_date", 1)

        result = []
        async for emi in cursor:
            result.append(emi)

        return result

    # 🔹 EMIs for specific loan (with user check)
    async def list_by_user_and_loan(self, user_id: str, loan_id: str):
        cursor = self.collection.find(
            {
                "user_id": ObjectId(user_id),
                "loan_id": ObjectId(loan_id)
            }
        ).sort("emi_number", 1)

        result = []
        async for emi in cursor:
            result.append(emi)

        return result

    async def list_pending_by_user_and_loan(self, user_id: str, loan_id: str):
        cursor = self.collection.find(
            {
                "user_id": ObjectId(user_id),
                "loan_id": ObjectId(loan_id),
                "status": "PENDING"
            }
        ).sort("emi_number", 1)

        result = []
        async for emi in cursor:
            result.append(emi)

        return result

    async def get_by_id(self, emi_id: str):
        if not ObjectId.is_valid(emi_id):
            return None
        return await self.collection.find_one(
            {"_id": ObjectId(emi_id)}
        )

    async def mark_paid(self, emi_id: str):
        return await self.collection.update_one(
            {"_id": ObjectId(emi_id)},
            {
                "$set": {
                    "status": "PAID",
                    "paid_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def increment_attempt(self, emi_id: str):
        return await self.collection.update_one(
            {"_id": ObjectId(emi_id)},
            {
                "$inc": {"attempts": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    async def mark_many_paid(self, emi_ids):
        if not emi_ids:
            return None

        now = datetime.utcnow()
        return await self.collection.update_many(
            {"_id": {"$in": emi_ids}},
            {
                "$set": {
                    "status": "PAID",
                    "paid_at": now,
                    "updated_at": now
                }
            }
        )
