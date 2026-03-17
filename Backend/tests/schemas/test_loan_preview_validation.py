import pytest
from pydantic import ValidationError

from app.schemas.loan_application import LoanPreviewRequest


def valid_payload(overrides=None):
    payload = {
        "loan_amount": 400000,
        "tenure_months": 24,
        "monthly_income": 65000,
        "occupation": "Software Engineer",
        "income_slip_url": "https://example.com/income-slip.pdf",
        "pending_emis": 1,
        "previous_loans": 2,
    }
    if overrides:
        payload.update(overrides)
    return payload


def test_valid_loan_preview_payload():
    req = LoanPreviewRequest(**valid_payload())
    assert req.pending_emis == 1
    assert req.previous_loans == 2


@pytest.mark.parametrize("value", [-1, -10])
def test_negative_pending_emis_rejected(value):
    with pytest.raises(ValidationError):
        LoanPreviewRequest(**valid_payload({"pending_emis": value}))


@pytest.mark.parametrize("value", [-1, -5])
def test_negative_previous_loans_rejected(value):
    with pytest.raises(ValidationError):
        LoanPreviewRequest(**valid_payload({"previous_loans": value}))

