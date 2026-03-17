from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument

from app.db.mongodb import db


class PaymentRepository:
    def __init__(self):
        self.collection = db.payments

    async def create(self, doc: dict):
        doc.setdefault("created_at", datetime.utcnow())
        doc.setdefault("updated_at", datetime.utcnow())
        result = await self.collection.insert_one(doc)
        return result.inserted_id

    async def attach_intent(self, payment_id: str, intent_id: str, intent_status: str):
        return await self.collection.update_one(
            {"_id": ObjectId(payment_id)},
            {
                "$set": {
                    "stripe_payment_intent_id": intent_id,
                    "stripe_payment_intent_status": intent_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def get_by_intent_id(self, intent_id: str):
        return await self.collection.find_one({"stripe_payment_intent_id": intent_id})

    async def mark_succeeded(self, payment_id: ObjectId, intent_status: str, amount_received: float):
        return await self.collection.find_one_and_update(
            {"_id": payment_id, "status": {"$ne": "SUCCEEDED"}},
            {
                "$set": {
                    "status": "SUCCEEDED",
                    "stripe_payment_intent_status": intent_status,
                    "amount_received": float(amount_received),
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=ReturnDocument.AFTER
        )

    async def mark_failed(self, payment_id: ObjectId, intent_status: str | None = None, failure_message: str | None = None):
        update = {
            "status": "FAILED",
            "updated_at": datetime.utcnow()
        }
        if intent_status:
            update["stripe_payment_intent_status"] = intent_status
        if failure_message:
            update["failure_message"] = failure_message

        return await self.collection.update_one(
            {"_id": payment_id},
            {"$set": update}
        )
