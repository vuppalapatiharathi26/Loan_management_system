import pytest
from pydantic import ValidationError
from app.schemas.loan_application import LoanApplicationCreateRequest
from app.enums.loan import LoanType


def valid_payload(overrides=None):
    payload = {
        "loan_type": LoanType.PERSONAL,
        "loan_amount": 500000,
        "tenure_months": 36,
        "reason": "Medical emergency expenses",
        "income_slip_url": "https://example.com/slip.pdf",
        "monthly_income": 60000,
        "occupation": "Software Engineer",
        "pending_emis": 0,
        "previous_loans": 1,
    }
    if overrides:
        payload.update(overrides)
    return payload


# -----------------------------
# ✅ VALID CASE
# -----------------------------

def test_valid_loan_application_payload():
    req = LoanApplicationCreateRequest(**valid_payload())
    assert req.loan_amount == 500000
    assert req.tenure_months == 36


# -----------------------------
# ❌ LOAN AMOUNT VALIDATION
# -----------------------------

@pytest.mark.parametrize("amount", [0, -100, -1])
def test_invalid_loan_amount(amount):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"loan_amount": amount})
        )


def test_loan_amount_above_max_limit():
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"loan_amount": 6_000_000})
        )


# -----------------------------
# ❌ TENURE VALIDATION
# -----------------------------

@pytest.mark.parametrize("tenure", [0, -12])
def test_invalid_tenure_months(tenure):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"tenure_months": tenure})
        )


def test_tenure_above_max_limit():
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"tenure_months": 400})
        )


# -----------------------------
# ❌ MONTHLY INCOME
# -----------------------------

@pytest.mark.parametrize("income", [0, -1000])
def test_invalid_monthly_income(income):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"monthly_income": income})
        )


# -----------------------------
# ❌ STRING VALIDATION
# -----------------------------

def test_reason_too_short():
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"reason": "Short"})
        )


@pytest.mark.parametrize("occupation", ["", " ", "   "])
def test_invalid_occupation(occupation):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"occupation": occupation})
        )


# -----------------------------
# ❌ EMI / LOAN COUNTS
# -----------------------------

@pytest.mark.parametrize("value", [-1, -5])
def test_negative_pending_emis(value):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"pending_emis": value})
        )


@pytest.mark.parametrize("value", [-1, -3])
def test_negative_previous_loans(value):
    with pytest.raises(ValidationError):
        LoanApplicationCreateRequest(
            **valid_payload({"previous_loans": value})
        )
