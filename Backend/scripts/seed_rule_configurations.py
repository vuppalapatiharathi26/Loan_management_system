import asyncio
from datetime import datetime

from app.db.mongodb import db


RULES = [
    {
        "rule_type": "CIBIL_SCORE",
        "min_score": 750,
        "max_score": 900,
        "decision": "AUTO_APPROVED",
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
    {
        "rule_type": "CIBIL_SCORE",
        "min_score": 550,
        "max_score": 749,
        "decision": "MANUAL_REVIEW",
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
    {
        "rule_type": "CIBIL_SCORE",
        "min_score": 300,
        "max_score": 549,
        "decision": "AUTO_REJECTED",
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
    {
        "rule_type": "INTEREST_RATE",
        "min_score": 750,
        "max_score": 900,
        "interest_rate": 8.5,
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
    {
        "rule_type": "INTEREST_RATE",
        "min_score": 650,
        "max_score": 749,
        "interest_rate": 11.5,
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
    {
        "rule_type": "INTEREST_RATE",
        "min_score": 300,
        "max_score": 649,
        "interest_rate": 14.0,
        "version": 1,
        "active": True,
        "created_at": datetime.utcnow(),
    },
]


async def seed():
    await db.rule_configurations.insert_many(RULES)


if __name__ == "__main__":
    asyncio.run(seed())
