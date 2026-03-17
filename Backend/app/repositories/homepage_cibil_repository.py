from datetime import datetime
from app.db.mongodb import db


class HomepageCibilLeadRepository:
    def __init__(self):
        self.collection = db.homepage_cibil_leads

    async def create(self, doc: dict):
        doc = dict(doc)
        doc.setdefault("createdAt", datetime.utcnow())
        return await self.collection.insert_one(doc)

