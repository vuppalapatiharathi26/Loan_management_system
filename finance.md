# Finance Formulas Reference

This document lists only mathematical/scoring formulas used in the project.

## 1) EMI Formula

For principal `P`, annual interest rate `R` (%), tenure `n` (months):

- Monthly rate: `r = R / (12 * 100)`
- EMI:
  `EMI = (P * r * (1 + r)^n) / ((1 + r)^n - 1)`
- Output is rounded to 2 decimals.

## 2) Loan-Flow CIBIL-like Score (Application/Preview)

Base:

- `score = 300`

Additions:

- Income capacity:
  - if `monthly_income * 12 >= loan_amount` then `+180`
  - else `+90`
- Occupation:
  - if occupation in `{employee, government, it}` then `+120`
  - else `+60`
- Previous loans:
  - if `previous_loans == 0` then `+120`
  - else `+60`
- Pending EMIs:
  - if `pending_emis == 0` then `+60`
  - else `+20`

Clamp:

- `score = min(score, 900)`

## 3) System Decision Thresholds

Decision by score slab:

- `750-900 => AUTO_APPROVED`
- `550-749 => MANUAL_REVIEW`
- `300-549 => AUTO_REJECTED`

## 4) Interest Rate Slabs (Rule Driven)

Example seeded slabs:

- `750-900 => 8.5%`
- `650-749 => 11.5%`
- `300-649 => 14.0%`

## 5) Repayment Calculations

### 5.1 Outstanding Amount

- `outstanding_amount = sum(pending_emi_amounts)`

### 5.2 Approx Outstanding Principal

- `outstanding_principal = principal * (pending_emis_count / tenure_months)`

### 5.3 Interest Due Now

- `interest_due_now = (outstanding_principal * annual_rate) / (12 * 100)`
- Rounded to 2 decimals.

### 5.4 Full Repayment Due

- `full_repayment_due = sum(pending_emi_amounts)`

## 6) Loan Manager Re-Finalization

When manager changes terms (`interest_rate`, `tenure_months`):

- EMI is recomputed using the same EMI formula in Section 1.

## 7) Public CIBIL Estimator Formula (`/public/cibil/estimate`)

Final score:

- `score = baseScore + paymentPoints + utilPoints + incomePoints + dtiPoints + resPoints`
- `baseScore = 300`
- `final_score = clamp(round(score), 300, 900)`

### 7.1 Payment Points

- Missed EMI points:
  - `0 => +120`
  - `1 => +60`
  - `>1 => +0`
- Default flag:
  - `hasDefaulted = false => +60`
  - `hasDefaulted = true => -40`
- Settled account flag:
  - `hasSettledAccount = false => +30`
  - `hasSettledAccount = true => -30`

### 7.2 Credit Utilization Points

For `u = creditUtilization`:

- `u <= 30 => +150`
- `u <= 50 => +100`
- `u <= 75 => +50`
- `u > 75 => +10`

### 7.3 Income/Stability Points

Income (`netIncome`):

- `> 75000 => +60`
- `> 40000 => +40`
- `> 20000 => +20`
- else `+5`

Experience (`experienceYears`):

- `> 3 => +40`
- `>= 1 => +25`
- else `+10`

Employment (`employmentType`):

- `government => +20`
- `private => +15`
- `startup => +10`
- `freelancer/selfEmployed => +5`

### 7.4 DTI Formula and Points

- `DTI = (totalEmi / netIncome) * 100` (if `netIncome <= 0`, treated as `100`)

Points:

- `DTI < 30 => +60`
- `DTI <= 50 => +40`
- `DTI <= 70 => +20`
- `DTI > 70 => +5`

### 7.5 Residence Points

Residence type:

- `owned => +30`
- `rented => +20`
- `parents => +25`

Address tenure (`addressYears`):

- `> 3 => +30`
- `>= 1 => +20`
- else `+10`

## 8) Gauge Mapping (Frontend Visual Formula)

For score `s` clamped to `[300, 900]`:

- Needle angle:
  `angle = ((s - 300) / 600) * 180 - 90`
- Arc angle:
  `arc = -180 + ((s - 300) / 600) * 180`

