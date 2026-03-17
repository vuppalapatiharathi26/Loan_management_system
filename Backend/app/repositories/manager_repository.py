from app.db.mongodb import db

class ManagerRepository:
    def __init__(self):
        self.collection = db.managers

    async def find_by_manager_id(self, manager_id: str):
        return await self.collection.find_one({"manager_id": manager_id})

    async def find_by_id(self, _id: str):
        from bson import ObjectId
        if not ObjectId.is_valid(_id):
            return None
        return await self.collection.find_one({"_id": ObjectId(_id)})

    async def soft_delete(self, manager_id: str, deleted_by: str):
        from datetime import datetime
        from bson import ObjectId

        # mark soft deleted, set deleted metadata
        await self.collection.update_one(
            {"manager_id": manager_id},
            {"$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow(),
                "deleted_by": ObjectId(deleted_by)
            }}
        )

    async def create(self, manager_data: dict):
        await self.collection.insert_one(manager_data)
