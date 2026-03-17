import asyncio
import pytest
from app.services.credit_rule_service import CreditRuleService
from app.enums.loan import SystemDecision


def run(coro):
    return asyncio.run(coro)


# -----------------------------
# Fake Rule Repository
# -----------------------------

class FakeRuleRepo:
    async def get_active_cibil_rules(self):
        return [
            {
                "min_score": 750,
                "max_score": 900,
                "decision": "AUTO_APPROVED"
            },
            {
                "min_score": 550,
                "max_score": 749,
                "decision": "MANUAL_REVIEW"
            },
            {
                "min_score": 300,
                "max_score": 549,
                "decision": "AUTO_REJECTED"
            }
        ]


# -----------------------------
# Tests
# -----------------------------

def test_auto_approved_rule_match():
    service = CreditRuleService()
    service.repo = FakeRuleRepo()

    decision = run(service.evaluate_cibil(800))
    assert decision == SystemDecision.AUTO_APPROVED


def test_manual_review_rule_match():
    service = CreditRuleService()
    service.repo = FakeRuleRepo()

    decision = run(service.evaluate_cibil(650))
    assert decision == SystemDecision.MANUAL_REVIEW


def test_auto_rejected_rule_match():
    service = CreditRuleService()
    service.repo = FakeRuleRepo()

    decision = run(service.evaluate_cibil(400))
    assert decision == SystemDecision.AUTO_REJECTED


def test_boundary_values():
    service = CreditRuleService()
    service.repo = FakeRuleRepo()

    assert run(service.evaluate_cibil(750)) == SystemDecision.AUTO_APPROVED
    assert run(service.evaluate_cibil(549)) == SystemDecision.AUTO_REJECTED


def test_invalid_score_raises():
    service = CreditRuleService()
    service.repo = FakeRuleRepo()

    with pytest.raises(ValueError):
        run(service.evaluate_cibil(1000))


def test_no_matching_rule_raises():
    class BrokenRuleRepo:
        async def get_active_cibil_rules(self):
            return []

    service = CreditRuleService()
    service.repo = BrokenRuleRepo()

    with pytest.raises(ValueError, match="No matching"):
        run(service.evaluate_cibil(700))
