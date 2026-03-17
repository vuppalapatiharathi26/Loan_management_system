from __future__ import annotations

import io
import re
from typing import Optional

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None


class IncomeSlipParserService:
    _MAX_REASONABLE_MONTHLY_INCOME = 1_000_000.0

    _money_pattern = re.compile(
        r"(?:(?:rs\.?|inr|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
        flags=re.IGNORECASE,
    )

    _gross_line_pattern = re.compile(
        r"\bgross\b.{0,30}\b(salary|pay|earning|earnings|wage|income)\b",
        flags=re.IGNORECASE,
    )

    _annual_noise_pattern = re.compile(r"\b(ytd|annual|yearly|ctc)\b", flags=re.IGNORECASE)

    def extract_monthly_income_from_pdf(self, content: bytes) -> Optional[float]:
        text = self._extract_text(content)
        if not text:
            return None

        return self._extract_gross_salary(text)

    def _extract_text(self, content: bytes) -> str:
        if PdfReader is None:
            return ""

        try:
            reader = PdfReader(io.BytesIO(content))
        except Exception:
            return ""

        chunks: list[str] = []
        for page in reader.pages[:5]:
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                continue

        return "\n".join(chunks)

    def _extract_gross_salary(self, text: str) -> Optional[float]:
        candidates: list[float] = []
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for idx, line in enumerate(lines):
            if not self._gross_line_pattern.search(line):
                continue
            if self._annual_noise_pattern.search(line):
                continue

            nearby = [line]
            if idx + 1 < len(lines):
                nearby.append(lines[idx + 1])

            for item in nearby:
                candidates.extend(self._extract_amounts(item))

        if not candidates:
            # Fallback for compact formats like "Gross Salary: 55,000".
            fallback = re.finditer(
                r"\bgross\b[^\n]{0,10}\b(salary|pay|earning|earnings|wage|income)\b[^\n]{0,40}",
                text,
                flags=re.IGNORECASE,
            )
            for match in fallback:
                segment = match.group(0)
                if self._annual_noise_pattern.search(segment):
                    continue
                candidates.extend(self._extract_amounts(segment))

        filtered = [
            value
            for value in candidates
            if 1 <= value <= self._MAX_REASONABLE_MONTHLY_INCOME
        ]
        if not filtered:
            return None

        # Payslips may contain multiple gross-like amounts; pick the highest valid one.
        return round(max(filtered), 2)

    def _extract_amounts(self, text: str) -> list[float]:
        values: list[float] = []
        for match in self._money_pattern.finditer(text):
            raw = (match.group(1) or "").replace(",", "").strip()
            if not raw:
                continue
            try:
                value = float(raw)
            except ValueError:
                continue
            values.append(value)
        return values
