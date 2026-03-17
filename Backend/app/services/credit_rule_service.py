from app.enums.loan import SystemDecision
from app.repositories.rule_configuration_repository import RuleConfigurationRepository

class CreditRuleService:
    def __init__(self):
        self.repo = RuleConfigurationRepository()

    async def evaluate_cibil(self, score: int) -> SystemDecision:
        # 🔒 Safety check
        if score < 300 or score > 900:
            raise ValueError("Invalid CIBIL score")

        # rule_type must match DB values exactly to keep decisioning consistent.
        rules = await self.repo.get_active_rules_by_type("CIBIL_SCORE")

        for rule in rules:
            if rule["min_score"] <= score <= rule["max_score"]:
                return SystemDecision(rule["decision"])

        # 🔥 This should NEVER happen if rules are correct
        raise ValueError("No matching CIBIL rule found")

    async def get_interest_rate(self, score: int) -> float:
        if score < 300 or score > 900:
            raise ValueError("Invalid CIBIL score")

        # rule_type must match DB values exactly to keep pricing consistent.
        rules = await self.repo.get_active_rules_by_type("INTEREST_RATE")

        for rule in rules:
            if rule["min_score"] <= score <= rule["max_score"]:
                rate = rule.get("interest_rate")
                if rate is None:
                    raise ValueError("Interest rate missing in rule")
                return float(rate)

        raise ValueError("No matching interest rate rule found")
