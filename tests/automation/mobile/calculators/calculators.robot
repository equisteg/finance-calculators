*** Settings ***
Documentation     Android app calculators (feature: Android app, REQ-015): SIP with step-up, EMI, Lump Sum, SWP and
...               Fixed Deposit, computed on the phone by packages/finance-core. Figures are checked against the engine
...               and the closed-form formulas. Test cases: fragment tests/cases/fragments/android.json.
Resource          ../../resources/api-android.resource
Test Teardown     Close Finealth
Test Tags         android    calculators

*** Test Cases ***
TC-M-CALC-001 SIP recalculates maturity, invested and profit in real time with Indian digit grouping
    [Tags]    sanity    regression    P1
    Open App Tool    Wealth    SIP Engine    SIP Wealth Accumulator
    Big Figure Should Be    ₹75,68,640
    Result Row Should Be    Total Invested    ₹27,00,000
    Result Row Should Be    Estimated Profit    +₹48,68,640
    Set App Slider    0    30000
    Result Row Should Be    Total Invested    ₹54,00,000
    Big Figure Should Be    ₹1,51,37,280
    Set App Slider    1    18
    Big Figure Should Be    ₹2,75,76,266
    Result Row Should Be    Total Invested    ₹54,00,000
    Set App Slider    2    25
    Big Figure Should Be    ₹17,46,99,363
    Result Row Should Be    Total Invested    ₹90,00,000
    Result Row Should Be    Estimated Profit    +₹16,56,99,363
    Evidence    ₹30,000 a month at 18 % for 25 years

TC-M-CALC-002 Annual step-up raises the invested total and maturity, and switching it off restores the flat SIP
    [Tags]    regression    P1
    Open App Tool    Wealth    SIP Engine    SIP Wealth Accumulator
    Checkbox Should Not Be Selected    css=main input[type="checkbox"]
    ${n}=    Number Of App Sliders
    Should Be Equal As Integers    ${n}    3
    Click Element    css=main input[type="checkbox"]
    Checkbox Should Be Selected    css=main input[type="checkbox"]
    Result Row Should Be    Total Invested    ₹57,19,047
    Big Figure Should Be    ₹1,30,25,774
    ${n}=    Number Of App Sliders
    Should Be Equal As Integers    ${n}    4
    Set App Slider    3    20
    Big Figure Should Be    ₹2,47,11,605
    Result Row Should Be    Total Invested    ₹1,29,66,319
    Evidence    Step-up 20 %
    Click Element    css=main input[type="checkbox"]
    Result Row Should Be    Total Invested    ₹27,00,000
    Big Figure Should Be    ₹75,68,640

TC-M-CALC-003 EMI shows the exact monthly liability and redraws the principal/interest split
    [Tags]    sanity    regression    P1
    Open App Tool    Debts    Loan & EMI    Loan Repayment & EMI
    Set App Slider    0    2500000
    Set App Slider    1    9
    Set App Slider    2    20
    Big Figure Should Be    ₹22,493
    Result Row Should Be    Total Interest    +₹28,98,320
    Result Row Should Be    Total Principal + Interest    ₹53,98,320
    Page Should Contain    Principal 46%
    Page Should Contain    Interest 54%
    Evidence    ₹25,00,000 at 9 % for 20 years
    Set App Slider    1    16
    Big Figure Should Be    ₹34,781
    Result Row Should Be    Total Interest    +₹58,47,440
    Page Should Contain    Principal 30%

TC-M-CALC-004 Lump sum grows the deposit; a heavier SWP withdrawal drains the corpus and says when it runs out
    [Tags]    regression    P2
    Open App Tool    Wealth    Lump Sum    Lump Sum Deposit Growth
    Big Figure Should Be    ₹6,49,464
    Tap Tool    SWP Cashflow
    Wait Until Keyword Succeeds    5s    0.2s    Panel Heading Should Be    Systematic Withdrawal (SWP)
    Big Figure Should Be    ₹75,67,497
    Result Row Should Be    Total Money Received    ₹96,00,000
    Result Row Should Be    Initial Corpus    ₹60,00,000
    Page Should Not Contain    Depleted in Month
    Set App Slider    1    60000
    Big Figure Should Be    ₹0
    Page Should Contain    Depleted in Month 175 (14.6 yrs)
    Result Row Should Be    Total Money Received    ₹1,04,73,955
    Result Row Should Be    Initial Corpus    ₹60,00,000
    Evidence    ₹60,000 a month empties the corpus in month 175

TC-M-CALC-005 Fixed deposit maturity rises with compounding frequency: annual < quarterly < monthly
    [Tags]    regression    P2
    Open App Tool    Wealth    Fixed Deposit    Fixed Deposit (Compounded)
    Page Should Contain    Compounding Schedule
    Big Figure Should Be    ₹7,16,130
    Tap App Button    Annually
    Big Figure Should Be    ₹7,09,507
    Tap App Button    Quarterly
    Big Figure Should Be    ₹7,16,130
    Tap App Button    Monthly
    Big Figure Should Be    ₹7,17,675
    Evidence    ₹5,00,000 at 7.25 % for 5 years, compounded monthly

TC-M-CALC-006 SIP sliders at their limits: ₹500 at 1 % for 1 year and ₹2,00,000 at 30 % for 40 years
    [Tags]    regression    P3
    Open App Tool    Wealth    SIP Engine    SIP Wealth Accumulator
    ${b}=    Slider Bounds    0
    Should Be Equal As Numbers    ${b}[min]    500
    Should Be Equal As Numbers    ${b}[max]    200000
    Set App Slider    0    500
    Set App Slider    1    1
    Set App Slider    2    1
    Big Figure Should Be    ₹6,033
    Result Row Should Be    Total Invested    ₹6,000
    Result Row Should Be    Estimated Profit    +₹33
    Set App Slider    0    200000
    Set App Slider    1    30
    Set App Slider    2    40
    Big Figure Should Be    ₹11,51,50,58,47,701
    Result Row Should Be    Total Invested    ₹9,60,00,000
    Page Has No Horizontal Scroll
    Evidence    Largest SIP fits the phone screen

TC-M-CALC-007 Clearing or typing a negative monthly investment never shows a negative or broken amount
    [Tags]    regression    P2
    Open App Tool    Wealth    SIP Engine    SIP Wealth Accumulator
    Type In App Field    0    ${EMPTY}
    Big Figure Should Be    ₹0
    Result Row Should Be    Total Invested    ₹0
    Page Should Not Contain    NaN
    Evidence    Empty amount → ₹0
    Type In App Field    0    -5000
    Evidence    Negative amount typed
    ${t}=    Big Figure
    ${i}=    Result Row    Total Invested
    Should Not Contain    ${t}${i}    -    A negative monthly investment shows negative money: maturity ${t}, invested ${i}
