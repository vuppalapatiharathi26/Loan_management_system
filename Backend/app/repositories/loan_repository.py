from app.db.mongodb import db
from bson import ObjectId
 
class LoanRepository:
    def __init__(self):
        self.collection = db.loans
 
    async def create(self, loan_doc: dict):
        result = await self.collection.insert_one(loan_doc)
        return result.inserted_id

    async def find_by_id(self, loan_id: str):
        if not ObjectId.is_valid(loan_id):
            return None
        return await self.collection.find_one({"_id": ObjectId(loan_id)})

    async def count_active_by_user(self, user_id: str) -> int:
        if not ObjectId.is_valid(user_id):
            return 0
        return await self.collection.count_documents({
            "user_id": ObjectId(user_id),
            "status": {"$ne": "CLOSED"}
        })
 
