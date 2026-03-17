from enum import Enum

class LoanType(str, Enum):
    PERSONAL = "PERSONAL"
    HOME = "HOME"
    AUTO = "AUTO"
    EDUCATION = "EDUCATION"


class LoanApplicationStatus(str, Enum):
    PENDING = "PENDING"
    MANUAL_REVIEW = "MANUAL_REVIEW"   # loan manager reviewing
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"           # 🔥 ADD THIS
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    AUTO_REJECTED = "AUTO_REJECTED"
    FINALIZED = "FINALIZED"
    CLOSED = "CLOSED"


class SystemDecision(str, Enum):
    AUTO_APPROVED = "AUTO_APPROVED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    AUTO_REJECTED = "AUTO_REJECTED"
