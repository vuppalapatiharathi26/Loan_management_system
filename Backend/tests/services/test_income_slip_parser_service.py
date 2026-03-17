from app.services.income_slip_parser_service import IncomeSlipParserService


def test_extract_gross_salary_from_text_line():
    service = IncomeSlipParserService()
    text = """
    Employee Name: John Doe
    Gross Salary : Rs. 85,500.50
    Net Salary : Rs. 72,000
    """

    value = service._extract_gross_salary(text)
    assert value == 85500.50


def test_ignore_annual_gross_and_return_none_when_no_monthly_gross():
    service = IncomeSlipParserService()
    text = """
    Gross Annual CTC : Rs. 12,00,000
    YTD Gross : Rs. 9,00,000
    """

    value = service._extract_gross_salary(text)
    assert value is None

