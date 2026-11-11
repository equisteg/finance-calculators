*** Settings ***
Documentation     Non-functional: accuracy (NFR-001 golden formula cases match independent calculations, 100 % match).
...               Golden values come from packages/finance-core/src/*.test.ts (worked by hand or by an independent
...               re-implementation, not by running the code). Test cases: tests/cases/test-cases.xlsx
...               (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    accuracy

*** Test Cases ***
TC-N-ACCU-001 The engine's golden unit tests pass 100 % (every test file of packages/finance-core)
    [Tags]    sanity    regression    P1
    ${r}=    Run Process    npx    --no-install    vitest    run    --reporter\=json    --outputFile\=${RESULTS}${/}vitest-finance-core.json
    ...    cwd=${ROOT}/packages/finance-core    timeout=300s
    Log    ${r.stdout}\n${r.stderr}
    ${j}=    Read JSON File    ${RESULTS}${/}vitest-finance-core.json
    Log    ${j}[numPassedTests] of ${j}[numTotalTests] golden tests passed in ${j}[numTotalTestSuites] suites
    Should Be True    ${j}[numTotalTests] >= 50    Only ${j}[numTotalTests] engine tests found
    Should Be Equal As Integers    ${j}[numFailedTests]    0    ${j}[numFailedTests] golden tests failed
    Should Be Equal As Integers    ${j}[numPassedTests]    ${j}[numTotalTests]
    Should Be Equal As Integers    ${r.rc}    0

TC-N-ACCU-002 Thirteen golden money figures from the engine match the independent values exactly
    [Tags]    regression    P1
    ${failed}=    Create List
    ${loan}=    Call Engine    loanSummary    1000000    8.5    10
    ${sip}=    Call Engine    sipFutureValue    10000    12    10
    ${ci}=    Call Engine    compoundGrowth    100000    0    10    5    12
    ${tax}=    Call Engine    indiaNewRegimeTax    1500000
    ${health}=    Call Engine    financialHealth    {"monthlyIncome":100000,"monthlyExpenses":60000,"monthlyDebtPayments":15000,"emergencyFund":225000,"costlyDebt":60000,"investments":1200000,"age":35,"dependents":2,"lifeCover":5000000,"hasHealthCover":true}
    ${debt}=    Call Engine    planDebtPayoff    [{"id":"a","name":"Card","balance":1000,"aprPct":12,"minPayment":100}]    100    avalanche
    ${goal}=    Call Engine    planGoal    {"id":"g","name":"Car","costToday":1000000,"years":10,"inflationPct":6,"returnPct":12,"currentSavings":0}
    ${pre}=    Call Engine    comparePrepayment    {"outstanding":1000000,"aprPct":9,"monthsLeft":240,"lumpSum":100000,"extraMonthly":0}
    ${au}=    Call Engine    australiaTax    90000
    ${rd}=    Call Engine    recurringDeposit    5000    7    12
    FOR    ${name}    ${got}    ${want}    IN
    ...    EMI ₹10L 8.5 % 10 y    ${loan}[emi]    12399
    ...    EMI total interest    ${loan}[totalInterest]    487880
    ...    SIP ₹10,000 12 % 10 y maturity    ${sip}[maturity]    2323391
    ...    Compound ₹1L 5 % monthly 10 y    ${ci}[maturity]    164531
    ...    India new regime tax ₹15L    ${tax}[totalTax]    97500
    ...    Health score example household    ${health}[score]    75
    ...    Debt payoff single card months    ${debt}[months]    11
    ...    Debt payoff total interest    ${debt}[totalInterest]    58.98
    ...    Goal future cost    ${goal}[futureCost]    1790848
    ...    Goal monthly saving    ${goal}[monthlyNeeded]    7708
    ...    Prepayment new EMI    ${pre}[reduceEmi][newEmi]    8097.53
    ...    Australia income tax A$90,000    ${au}[incomeTax]    17520
    ...    RD ₹5,000 7 % 12 months    ${rd}[maturity]    62311
        ${ok}=    Evaluate    float($got) == float($want)
        IF    not ${ok}    Append To List    ${failed}    ${name}: got ${got}, expected ${want}
    END
    Should Be Empty    ${failed}    Golden mismatches: ${failed}

TC-N-ACCU-003 The figures on screen equal the engine's golden values (Health Check, EMI, Australia tax)
    [Tags]    regression    P1
    Open Finealth    /health-check/
    Test Id Text Should Be    health-score    75
    Go To Page    /tools/australia-income-tax-calculator/
    Set Field Safely    in-g    90000
    Test Id Should Contain    tool-result    $17,520
    Evidence    Australia A$90,000: income tax $17,520 (golden)
    Go To Page    /emi-calculator/
    Set Range    Borrowing Principal    1000000
    Set Range    Annual Interest Rate    8.5
    Set Range    Loan Tenure    10
    Main Text Should Contain    12,399
    Evidence    EMI ₹10,00,000 at 8.5 % for 10 years: ₹12,399 (golden)
