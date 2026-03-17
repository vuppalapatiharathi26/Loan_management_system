from datetime import datetime, date
from pymongo.errors import DuplicateKeyError

from app.repositories.homepage_cibil_repository import HomepageCibilLeadRepository


class HomepageCibilService:
    def __init__(self):
        self.repo = HomepageCibilLeadRepository()

    def _age_years(self, dob: date) -> int:
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def _band(self, score: int) -> str:
        if score >= 750:
            return "Excellent"
        if score >= 700:
            return "Good"
        if score >= 650:
            return "Fair"
        if score >= 600:
            return "Weak"
        return "High Risk"

    def _calculate(self, payload: dict):
        baseScore = 300

        missed = int(payload["missedEmiLast12Months"])
        hasDefaulted = bool(payload["hasDefaulted"])
        hasSettled = bool(payload["hasSettledAccount"])
        util = float(payload["creditUtilization"])
        netIncome = float(payload["netIncome"])
        employmentType = str(payload["employmentType"])
        experienceYears = float(payload["experienceYears"])
        totalEmi = float(payload["totalEmi"])
        residenceType = str(payload["residenceType"])
        addressYears = float(payload["addressYears"])

        # PAYMENT BEHAVIOUR (0–210)
        paymentPoints = 0
        if missed == 0:
            paymentPoints += 120
        elif missed == 1:
            paymentPoints += 60

        if not hasDefaulted:
            paymentPoints += 60
        else:
            paymentPoints -= 40

        if not hasSettled:
            paymentPoints += 30
        else:
            paymentPoints -= 30

        # CREDIT UTILIZATION (0–150)
        if util <= 30:
            utilPoints = 150
        elif util <= 50:
            utilPoints = 100
        elif util <= 75:
            utilPoints = 50
        else:
            utilPoints = 10

        # INCOME & STABILITY (0–120)
        incomePoints = 0
        if netIncome > 75000:
            incomePoints += 60
        elif netIncome > 40000:
            incomePoints += 40
        elif netIncome > 20000:
            incomePoints += 20
        else:
            incomePoints += 5

        if experienceYears > 3:
            incomePoints += 40
        elif experienceYears >= 1:
            incomePoints += 25
        else:
            incomePoints += 10

        if employmentType == "government":
            incomePoints += 20
        elif employmentType == "private":
            incomePoints += 15
        elif employmentType == "startup":
            incomePoints += 10
        else:
            incomePoints += 5

        # DTI (0–60)
        if netIncome > 0:
            dti = (totalEmi / netIncome) * 100
        else:
            dti = 100

        if dti < 30:
            dtiPoints = 60
        elif dti <= 50:
            dtiPoints = 40
        elif dti <= 70:
            dtiPoints = 20
        else:
            dtiPoints = 5

        # RESIDENCE (0–60)
        resPoints = 0
        if residenceType == "owned":
            resPoints += 30
        elif residenceType == "rented":
            resPoints += 20
        else:
            resPoints += 25

        if addressYears > 3:
            resPoints += 30
        elif addressYears >= 1:
            resPoints += 20
        else:
            resPoints += 10

        score = baseScore + paymentPoints + utilPoints + incomePoints + dtiPoints + resPoints
        if score > 900:
            score = 900
        if score < 300:
            score = 300

        score_int = int(round(score))
        return score_int, {
            "paymentPoints": paymentPoints,
            "utilPoints": utilPoints,
            "incomePoints": incomePoints,
            "dtiPoints": dtiPoints,
            "resPoints": resPoints,
        }

    async def estimate_and_store(self, payload):
        if self._age_years(payload.dob) < 18:
            raise ValueError("DOB must be 18+ years")

        score, breakdown = self._calculate(payload.model_dump())
        band = self._band(score)

        created_day = datetime.utcnow().date().isoformat()
        email = str(payload.email).strip().lower()
        phone = str(payload.phone).strip()

        doc = {
            "fullName": payload.fullName,
            "phone": phone,
            "email": email,
            "dob": payload.dob.isoformat(),
            "netIncome": payload.netIncome,
            "employmentType": payload.employmentType,
            "experienceYears": payload.experienceYears,
            "totalEmi": payload.totalEmi,
            "missedEmiLast12Months": payload.missedEmiLast12Months,
            "hasDefaulted": payload.hasDefaulted,
            "hasSettledAccount": payload.hasSettledAccount,
            "creditUtilization": payload.creditUtilization,
            "residenceType": payload.residenceType,
            "addressYears": payload.addressYears,
            "score": score,
            "band": band,
            "breakdown": breakdown,
            "createdAt": datetime.utcnow(),
            "day": created_day,
            "source": "homepage",
        }

        try:
            await self.repo.create(doc)
        except DuplicateKeyError:
            raise ValueError("You have already checked your score today with this phone or email.")

        return {
            "score": score,
            "band": band,
            "breakdown": breakdown,
        }

