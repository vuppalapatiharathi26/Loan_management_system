from datetime import datetime
from bson import ObjectId

from app.db.mongodb import db


class AccountRepository:
    def __init__(self):
        self.collection = db.accounts

    async def create_account(self, user_id: str, account_number: str | None = None, ifsc_code: str | None = None):
        doc = {
            "user_id": ObjectId(user_id),
            "balance": 0.0,
            "account_number": account_number,
            "ifsc_code": ifsc_code,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await self.collection.insert_one(doc)
        return result.inserted_id

    async def get_by_user_id(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            return None
        return await self.collection.find_one({"user_id": ObjectId(user_id)})

    async def update_balance(self, user_id: str, new_balance: float):
        return await self.collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    "balance": float(new_balance),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def change_balance_atomic(self, user_id: str, delta: float):
        """
        Atomically change balance by delta (positive or negative) and
        return the updated document or None if operation could not be applied
        (e.g., insufficient funds for negative delta).
        """
        from pymongo import ReturnDocument

        update = {
            "$inc": {"balance": float(delta)},
            "$set": {"updated_at": datetime.utcnow()}
        }

        # For negative delta ensure balance doesn't go negative by adding a filter
        if delta < 0:
            # require balance >= -delta
            result = await self.collection.find_one_and_update(
                {"user_id": ObjectId(user_id), "balance": {"$gte": float(-delta)}},
                update,
                return_document=ReturnDocument.AFTER
            )
        else:
            result = await self.collection.find_one_and_update(
                {"user_id": ObjectId(user_id)},
                update,
                return_document=ReturnDocument.AFTER
            )

        return result

    async def exists(self, user_id: str) -> bool:
        doc = await self.collection.find_one(
            {"user_id": ObjectId(user_id)},
            {"_id": 1}
        )
        return doc is not None

    async def find_by_account_number(self, account_number: str):
        return await self.collection.find_one({"account_number": account_number})

    async def update_account_details(self, user_id: str, account_number: str, ifsc_code: str):
        return await self.collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    "account_number": account_number,
                    "ifsc_code": ifsc_code,
                    "updated_at": datetime.utcnow()
                }
            }
        )
