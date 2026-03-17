from datetime import datetime
from bson import ObjectId
from typing import Optional

from app.db.mongodb import db


class TransactionRepository:
    def __init__(self):
        self.collection = db.transactions

    async def create(
        self,
        *,
        user_id: str,
        tx_type: str,
        amount: float,
        reference: str,
        balance_after: float,
        loan_id: Optional[str] = None,
        emi_number: Optional[int] = None,
        manager_id: Optional[str] = None
    ):
        doc = {
            "user_id": ObjectId(user_id),
            "type": tx_type,
            "amount": float(amount),
            "reference": reference,
            "balance_after": float(balance_after),
            "created_at": datetime.utcnow()
        }

        if loan_id:
            doc["loan_id"] = ObjectId(loan_id)

        if emi_number is not None:
            doc["emi_number"] = emi_number

        if manager_id:
            doc["manager_id"] = ObjectId(manager_id)

        result = await self.collection.insert_one(doc)
        return result.inserted_id

    async def list_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        *,
        tx_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ):
        query: dict = {"user_id": ObjectId(user_id)}
        if tx_type:
            query["type"] = tx_type
        if start or end:
            query["created_at"] = {}
            if start:
                query["created_at"]["$gte"] = start
            if end:
                query["created_at"]["$lt"] = end

        cursor = (
            self.collection
            .find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        transactions = []
        async for tx in cursor:
            transactions.append(tx)

        return transactions

    async def count_by_user(
        self,
        user_id: str,
        *,
        tx_type: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ):
        query: dict = {"user_id": ObjectId(user_id)}
        if tx_type:
            query["type"] = tx_type
        if start or end:
            query["created_at"] = {}
            if start:
                query["created_at"]["$gte"] = start
            if end:
                query["created_at"]["$lt"] = end

        return await self.collection.count_documents(query)


    async def list_by_loan(
        self,
        loan_id: str
    ):
        cursor = (
            self.collection
            .find({"loan_id": ObjectId(loan_id)})
            .sort("created_at", 1)
        )

        result = []
        async for tx in cursor:
            result.append(tx)

        return result
