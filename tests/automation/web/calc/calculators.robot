*** Settings ***
Documentation     Stand-alone calculators (feature: CALC, REQ-015): /sip-calculator/, /emi-calculator/ and /compound-interest/.
...               Golden numbers from packages/finance-core/src/finance.test.ts, reproduced through the pages' sliders.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-tools.json).
Resource          ../../resources/web-tools.resource
Test Teardown     Close Finealth
Test Tags         web    calc

*** Test Cases ***
TC-W-CALC-001 SIP calculator: ₹10,000 a month at 12 % for 10 years matures at ₹23,23,391
    [Tags]    sanity    regression    P1
    Open Finealth    /sip-calculator/
    Heading Should Contain    SIP Wealth Compounder
    ${sliders}=    Get Element Count    css=main input[type="range"]
    Should Be Equal As Integers    ${sliders}    3
    Slider Display Should Be    Monthly Deposit    ₹10,000
    Slider Display Should Be    Expected Annual Return    12%
    Slider Display Should Be    Investment Duration    10 Years
    Calc Headline Should Be    ₹23,23,391
    Calc Row Should Be    Total Principal Contributed    ₹12,00,000
    Calc Row Should Be    Estimated Compounded Gains    +₹11,23,391
    Calc Row Should Be    Money multiplied    1.94×
    Calc Row Should Be    Deposits made    120
    Donut Should Read    Invested 52%, Returns 48%
    Evidence    SIP golden result with the Invested vs Returns breakdown
    Enter    Investment Duration    20
    Slider Display Should Be    Investment Duration    20 Years
    Calc Row Should Be    Deposits made    240
    Calc Row Should Be    Total Principal Contributed    ₹24,00,000
    Evidence    Moving the duration recomputed the projection
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-CALC-002 EMI calculator: ₹10,00,000 at 8.5 % for 10 years costs ₹12,399 a month
    [Tags]    sanity    regression    P1
    Open Finealth    /emi-calculator/
    Heading Should Contain    EMI & Debt Schedule
    Slider Display Should Be    Borrowing Principal    ₹30,00,000
    Enter    Borrowing Principal    1000000
    Enter    Loan Tenure    10
    Slider Display Should Be    Borrowing Principal    ₹10,00,000
    Slider Display Should Be    Annual Interest Rate    8.5%
    Slider Display Should Be    Loan Tenure    10 Years (120 Mos)
    Calc Headline Should Be    ₹12,399
    Calc Row Should Be    Principal Borrowed    ₹10,00,000
    Calc Row Should Be    Total Interest Paid    +₹4,87,880
    Calc Row Should Be    Aggregate Payback    ₹14,87,880
    Calc Row Should Be    Interest share    33 %
    Calc Row Should Be    Payments    120
    Donut Should Read    Principal 67%, Interest 33%
    Evidence    EMI golden result
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-CALC-003 Compound interest: ₹1,00,000 at 10 % for 5 years gives ₹1,64,531 monthly and ₹1,61,051 yearly
    [Tags]    regression    P2
    Open Finealth    /compound-interest/
    Heading Should Contain    Compound Interest Engine
    Calc Headline Should Be    ₹24,24,074
    Evidence    Defaults: ₹2,00,000 + ₹50,000 a year at 10 % for 15 years
    Enter    Initial Principal    100000
    Enter    Annual Addition    0
    Enter    Horizon    5
    Element Attribute Value Should Be    xpath=//main//button[normalize-space(.)="Annually"]    aria-pressed    true
    Calc Headline Should Be    ₹1,61,051
    Click Button Named    Monthly
    Element Attribute Value Should Be    xpath=//main//button[normalize-space(.)="Monthly"]    aria-pressed    true
    Calc Headline Should Be    ₹1,64,531
    Calc Row Should Be    Total Capital Deposited    ₹1,00,000
    Calc Row Should Be    Interest Yield    +₹64,531
    Donut Should Read    Deposits 61%, Interest 39%
    Evidence    Monthly compounding grows more than yearly
    Disclaimer Should Be Visible

TC-W-CALC-004 Currency chips rebase the calculators: USD SIP becomes the 401(k) calculator, GBP EMI starts at £300,000
    [Tags]    regression    P2
    Open Finealth    /sip-calculator/
    Element Attribute Value Should Be    xpath=//main//button[normalize-space(.)="INR (₹)"]    aria-pressed    true
    Click Button Named    USD ($)
    Heading Should Contain    401(k) & Index Wealth Calculator
    Slider Display Should Be    Monthly Deposit    $500
    Calc Headline Should Be    $116,170
    Calc Row Should Be    Total Principal Contributed    $60,000
    Element Should Contain    css=header select[aria-label="Currency"] option:checked    USD
    Evidence    SIP in US dollars
    Open Finealth    /emi-calculator/
    Click Button Named    GBP (£)
    Slider Display Should Be    Borrowing Principal    £300,000
    Calc Headline Should Be    £2,603
    Evidence    EMI in pounds

TC-W-CALC-005 Rate below the slider's 1 % floor: the EMI slider stops at 1 %, the engine's 0 % rule gives ₹10,000 for ₹1,20,000 over 12 months
    [Tags]    regression    P2
    Open Finealth    /emi-calculator/
    Enter    Borrowing Principal    1000000
    Enter    Loan Tenure    10
    Enter    Annual Interest Rate    0
    Slider Display Should Be    Annual Interest Rate    1%
    Calc Headline Should Be    ₹8,760
    Main Should Have No Broken Numbers
    Evidence    0 % is held at the 1 % floor and the instalment is ₹8,760
    ${emi}=    Call Engine    monthlyInstallment    120000    0    12
    Should Be Equal As Numbers    ${emi}    10000    A 0 % loan must split the principal evenly, not divide by zero

TC-W-CALC-006 Out-of-range slider values are held at the limits and never show NaN
    [Tags]    regression    P2
    Open Finealth    /sip-calculator/
    Enter    Monthly Deposit    999999999
    Slider Display Should Be    Monthly Deposit    ₹2,00,000
    Enter    Investment Duration    0
    Slider Display Should Be    Investment Duration    1 Year
    Enter    Expected Annual Return    -5
    Slider Display Should Be    Expected Annual Return    1%
    Enter    Monthly Deposit    abc
    Main Should Have No Broken Numbers
    Calc Row Should Be    Deposits made    12
    Evidence    Values held at the slider limits, no broken numbers

TC-W-CALC-007 Compound interest with nothing deposited shows ₹0 and a dash, not NaN
    [Tags]    regression    P3
    Open Finealth    /compound-interest/
    Enter    Initial Principal    0
    Enter    Annual Addition    0
    Calc Headline Should Be    ₹0
    Calc Row Should Be    Money multiplied    —
    Calc Row Should Be    Total Capital Deposited    ₹0
    Calc Row Should Be    Interest Yield    +₹0
    Donut Should Read    Deposits 100%, Interest 0%
    Main Should Have No Broken Numbers
    Evidence    Zero inputs, clean zero result
    Page Should Have No Console Problems

TC-W-CALC-008 Every stand-alone calculator page returns 200, loads its own assets and keeps its heading readable
    [Tags]    regression    P2
    FOR    ${path}    ${heading}    IN
    ...    /sip-calculator/    SIP Wealth Compounder
    ...    /emi-calculator/    EMI & Debt Schedule
    ...    /compound-interest/    Compound Interest Engine
        Open Finealth    ${path}
        Heading Should Contain    ${heading}
        ${page}=    Fetch Text    ${BASE_URL}${path}
        Should Be Equal As Integers    ${page}[status]    200
        ${escaped}=    Replace String    ${heading}    &    &amp;
        Should Contain    ${page}[text]    >${escaped}    The pre-rendered HTML of ${path} must already carry its heading
        ${fg}=    Get Computed Style    main h1    color
        ${bg}=    Get Computed Style    body    background-color
        ${ratio}=    Contrast Ratio    ${fg}    ${bg}
        Should Be True    ${ratio} >= 4.5    ${path} heading contrast ${ratio}:1 is below 4.5:1
        Disclaimer Should Be Visible
        Page Should Have No Console Problems
        Evidence    ${path}
        Close Finealth
    END
