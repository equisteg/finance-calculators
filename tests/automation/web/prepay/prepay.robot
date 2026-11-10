*** Settings ***
Documentation     Loan Prepayment Optimiser (feature: PRE, REQ-008: reduce tenure vs reduce EMI after a part-payment) on
...               /loan-prepayment/. Golden numbers: packages/finance-core/src/planning.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-planners.json).
Resource          ../../resources/web-planners.resource
Test Teardown     Close Finealth
Test Tags         web    prepay

*** Variables ***
${TENURE}         css=[data-testid="prepay-tenure"]
${EMI}            css=[data-testid="prepay-emi"]

*** Keywords ***
Set Loan
    [Arguments]    ${balance}    ${rate}    ${months}    ${lump}    ${extra}=0
    Settle On    css=[data-testid="in-outstanding"]
    Set Field    in-outstanding    ${balance}
    Set Field    Interest rate    ${rate}
    Set Field    Months left    ${months}
    Set Field    in-lump    ${lump}
    Set Field    Extra every month    ${extra}

*** Test Cases ***
TC-W-PRE-001 Example loan compares a shorter loan with a lower EMI and picks the shorter loan
    [Tags]    sanity    regression    P1
    Open Finealth    /loan-prepayment/
    Heading Should Contain    Loan Prepayment Optimiser
    Kpi Should Be    EMI now    ₹24,986
    Kpi Should Be    Best saving    ₹4,72,079    ok
    Kpi Should Be    Better choice    Shorter loan
    Test Id Text Should Be    tenure-saved    ₹4,72,079
    Element Should Contain    ${TENURE}    2 yr 2 mo sooner
    Element Should Contain    ${TENURE}    New tenure 12 yr 10 mo
    Test Id Text Should Be    emi-saved    ₹1,59,801
    Element Should Contain    ${EMI}    ₹22,987
    Element Should Contain    ${EMI}    ₹1,999 less each month
    Main Text Should Contain    Current EMI: ₹24,986 · Interest left if you change nothing: ₹19,97,518
    Evidence    Example: shorter loan saves ₹4,72,079, lower EMI ₹22,987
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-PRE-002 10 L at 9 % for 240 months with a 1 L part-payment: EMI 8,997 → 8,098 or 54 months sooner (golden)
    [Tags]    sanity    regression    P1
    Open Finealth    /loan-prepayment/
    Set Loan    1000000    9    240    100000
    Kpi Should Be    EMI now    ₹8,997
    Kpi Should Be    Better choice    Shorter loan
    Element Should Contain    ${TENURE}    4 yr 6 mo sooner
    Element Should Contain    ${TENURE}    New tenure 15 yr 6 mo
    Element Should Contain    ${EMI}    ₹8,098
    Test Id Text Should Be    tenure-saved    ₹3,88,958
    Test Id Text Should Be    emi-saved    ₹1,15,933
    Evidence    Golden: 186 months (54 saved), new EMI ₹8,098
    ${r}=    Call Engine    comparePrepayment    {"outstanding":1000000,"aprPct":9,"monthsLeft":240,"lumpSum":100000,"extraMonthly":0}
    Should Be Equal As Numbers    ${r}[emi]    8997.26
    Should Be Equal As Numbers    ${r}[reduceEmi][newEmi]    8097.53
    Should Be Equal As Integers    ${r}[reduceTenure][months]    186

TC-W-PRE-003 A part-payment larger than the balance leaves nothing to pay; an empty loan shows zeros
    [Tags]    regression    P2
    Open Finealth    /loan-prepayment/
    Set Loan    50000    10    12    80000
    Element Should Contain    ${TENURE}    New tenure 0 months
    Element Should Contain    ${EMI}    ₹0
    Test Id Text Should Be    tenure-saved    ₹2,750
    Main Should Not Show NaN
    Evidence    Lump 80,000 on 50,000: tenure 0, new EMI ₹0
    Set Loan    0    0    0    0
    Kpi Should Be    EMI now    ₹0
    Test Id Text Should Be    tenure-saved    ₹0
    Test Id Text Should Be    emi-saved    ₹0
    Main Should Not Show NaN
    Page Should Have No Console Problems
    Evidence    All zeros: ₹0 everywhere, no NaN

TC-W-PRE-004 Months left above 480 are capped at 480
    [Tags]    regression    P3
    Open Finealth    /loan-prepayment/
    Set Field    Months left    9999
    Field Value Should Be    Months left    480
    Kpi Should Be    EMI now    ₹18,804
    Element Should Contain    ${TENURE}    New tenure 25 yr 7 mo
    Main Should Not Show NaN
    Evidence    9999 months capped at 480

TC-W-PRE-005 An extra payment every month shortens the loan further but leaves the lower-EMI option unchanged
    [Tags]    regression    P2
    Open Finealth    /loan-prepayment/
    Set Field    Extra every month    5000
    Element Should Contain    ${TENURE}    New tenure 9 yr 5 mo
    Element Should Contain    ${TENURE}    5 yr 7 mo sooner
    Test Id Text Should Be    tenure-saved    ₹9,15,713
    Test Id Text Should Be    emi-saved    ₹1,59,801
    Kpi Should Be    Best saving    ₹9,15,713    ok
    Evidence    Extra ₹5,000 a month: 9 yr 5 mo, ₹9,15,713 saved

TC-W-PRE-006 "Loan ends … sooner" equals the months left minus the new tenure
    [Tags]    regression    P2
    Open Finealth    /loan-prepayment/
    Set Loan    50000    10    12    80000
    Element Should Contain    ${TENURE}    New tenure 0 months
    Evidence    12 months left, cleared now: should end 1 yr (12 months) sooner
    Element Should Contain    ${TENURE}    1 yr sooner
