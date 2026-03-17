from app.db.mongodb import db

class RuleConfigurationRepository:
    def __init__(self):
        self.collection = db.rule_configurations

    # Repository stays generic: business logic belongs in services, not data access.
    async def get_active_rules_by_type(self, rule_type: str):
        cursor = (
            self.collection
            .find({"rule_type": rule_type, "active": True})
            # Sort by version DESC to prefer the latest rule set, then by min_score DESC.
            .sort([("version", -1), ("min_score", -1)])
        )

        return await cursor.to_list(length=None)
