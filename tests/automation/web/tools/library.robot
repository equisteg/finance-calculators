*** Settings ***
Documentation     Global tools library (feature: TOOL, REQ-019): the /tools/ index and the generic tool pages /tools/<slug>/.
...               Golden numbers from packages/finance-core/src/tools.test.ts and apps/web/src/lib/toolCatalog.test.ts,
...               reproduced by typing into the tool pages. Country tax tools are in ../tax/tax.robot.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-tools.json).
Resource          ../../resources/web-tools.resource
Test Teardown     Close Finealth
Test Tags         web    tool

*** Variables ***
${TOOL_COUNT}     36

*** Test Cases ***
TC-W-TOOL-001 Tools index lists every category, the estimates-only notice and all tools, and no Pakistan entry
    [Tags]    sanity    regression    P1
    Open Finealth    /tools/
    Heading Should Contain    Every money tool
    Test Id Should Contain    tools-disclaimer    Estimates only, not advice.
    Test Id Should Contain    tools-disclaimer    last
    Element Should Contain    css=[data-testid="tools-disclaimer"]    checked the rates (
    Evidence    Header and the estimates-only notice
    ${chips}=    Get WebElements    css=nav[aria-label="Jump to a category"] a
    ${names}=    Create List
    FOR    ${c}    IN    @{chips}
        ${t}=    Get Text    ${c}
        Append To List    ${names}    ${t.strip()}
    END
    ${want}=    Create List    Planners    Tax & salary    Saving & investing    Borrowing    Housing    Everyday    Business
    Lists Should Be Equal    ${names}    ${want}
    FOR    ${id}    ${n}    IN    tax-salary    9    saving-investing    10    borrowing    4    housing    2    everyday    6    business    5
        Element Text Should Be    css=section\#${id} h2 + .pill    ${n}
        Page Should Contain Element    css=section\#${id} [data-testid^="tool-card-"]    limit=${n}
    END
    Page Should Contain Element    css=section\#planners a    limit=6
    Page Should Contain Element    css=[data-testid^="tool-card-"]    limit=${TOOL_COUNT}
    Element Text Should Be    css=main .eyebrow    42 FREE TOOLS · 7 COUNTRIES · 66 VAT RATES
    Element Should Be Visible    css=[data-testid="tool-card-australia-income-tax-calculator"]
    Element Should Be Visible    css=[data-testid="tool-card-world-vat-gst-calculator"]
    ${text}=    Get Text    ${MAIN}
    Should Not Match Regexp    ${text}    (?i)pakistan|PKR
    Evidence    Category counts match the cards; no Pakistan entry
    Page Should Have No Console Problems

TC-W-TOOL-002 A tool card opens its page with inputs, result, heading figures, source and disclaimer
    [Tags]    sanity    regression    P1
    Open Finealth    /tools/
    Click Centered    css=[data-testid="tool-card-inflation-calculator"]
    Wait Until Location Contains    /tools/inflation-calculator/
    Heading Should Contain    Inflation Calculator
    Element Should Contain    css=main .eyebrow    GLOBAL · SAVING & INVESTING
    Field Value Should Be    in-amount    100000
    Field Value Should Be    in-rate    6
    Field Value Should Be    in-years    10
    Result Should Show    Same things will cost    ₹1,79,085
    Result Should Show    Today’s amount will buy    ₹55,839
    Result Should Show    Buying power lost    44.16%
    Test Id Text Should Be    tool-primary    ₹1,79,085
    Test Id Should Contain    tool-kpis    ₹1,79,085
    Test Id Should Contain    tool-kpis    ₹55,839
    Element Should Not Contain    css=[data-testid="tool-kpis"]    44.16%
    Test Id Should Contain    tool-source    How it is worked out. Compound inflation, FV = PV × (1 + i)ⁿ.
    Element Should Not Contain    ${SOURCE}    Rates last checked
    Disclaimer Should Be Visible
    Evidence    Inflation tool with its result, source and disclaimer
    Enter    in-years    20
    Result Should Show    Same things will cost    ₹3,20,714
    Evidence    Changing an input recomputes without a reload

TC-W-TOOL-003 Every tool in the catalogue opens with its default values in INR and in USD and shows a clean result
    [Tags]    sanity    regression    P1
    Open Finealth    /tools/
    @{slugs}=    Get Tool Slugs From Index
    ${n}=    Get Length    ${slugs}
    Should Be Equal As Integers    ${n}    ${TOOL_COUNT}
    FOR    ${slug}    IN    @{slugs}
        Go To Tool    ${slug}
        Tool Result Should Be Clean
        Disclaimer Should Be Visible
        Choose Site Currency    USD
        Tool Result Should Be Clean
        Page Should Have No Console Problems
    END
    Evidence    Last tool in USD

TC-W-TOOL-004 Every tool survives 0, junk text, an unknown option and letters typed into number fields
    [Tags]    regression    P1
    Open Finealth    /tools/
    @{slugs}=    Get Tool Slugs From Index
    FOR    ${slug}    IN    @{slugs}
        Go To Tool    ${slug}
        ${changed}=    Fill Tool Fields With Junk    zero
        Should Be True    ${changed} > 0
        Tool Result Should Be Clean
        Fill Tool Fields With Junk    letters
        Tool Result Should Be Clean
        Element Should Be Visible    css=main h1
        Page Should Have No Console Problems
    END
    Evidence    Last tool after junk input

TC-W-TOOL-005 PPF: ₹1,50,000 a year at 7.1 % for 15 years matures at ₹40,68,209; deposits above the limit are capped
    [Tags]    sanity    regression    P1
    Open Tool    ppf-calculator
    Element Should Contain    css=main .eyebrow    INDIA
    Result Should Show    Maturity    ₹40,68,209
    Result Should Show    You deposit    ₹22,50,000
    Result Should Show    Interest    ₹18,18,209
    No Tool Note
    Evidence    PPF golden maturity
    Enter    in-y    200000
    Result Should Show    Maturity    ₹40,68,209
    Tool Note Should Be    Capped at ₹1,50,000 a year, the PPF maximum.
    Test Id Should Contain    tool-source    Rates last checked
    Evidence    Deposit above ₹1,50,000 is capped with a note

TC-W-TOOL-006 RD: ₹5,000 a month at 7 % for 12 months matures at ₹62,311 with quarterly compounding
    [Tags]    regression    P2
    Open Tool    recurring-deposit-calculator
    Field Value Should Be    in-m    5000
    Result Should Show    Maturity    ₹62,311
    Result Should Show    You deposit    ₹60,000
    Result Should Show    Interest earned    ₹2,311
    Test Id Should Contain    tool-source    compounds quarterly
    Evidence    RD golden maturity

TC-W-TOOL-007 NPV & IRR: −1,000, 300, 400, 500 at 10 % gives NPV −$21.04 and IRR 8.9 %
    [Tags]    regression    P1
    Open Tool    npv-irr-calculator
    Choose Site Currency    USD
    Set Value By Script    [data-testid="in-flows"]    -1000\n300\n400\n500
    Enter    in-r    10
    Result Should Show    NPV    -$21.04
    Result Should Show    IRR    8.9%
    No Tool Note
    Evidence    NPV and IRR golden values
    Enter    in-r    8.9
    ${npv}=    Result Value Of    NPV
    ${v}=    Number From Text    ${npv}
    Should Be True    abs(${v}) < 0.5    NPV at the IRR should be about zero, got ${npv}
    Evidence    NPV at the IRR is about zero

TC-W-TOOL-008 XIRR: −10,000 on 2025-01-01 and +11,000 on 2026-01-01 is 10 %
    [Tags]    regression    P1
    Open Tool    xirr-calculator
    Set Value By Script    [data-testid="in-rows"]    2025-01-01, -10000\n2026-01-01, 11000
    Result Should Show    XIRR    10%
    No Tool Note
    Evidence    XIRR golden
    Set Value By Script    [data-testid="in-rows"]    2025-01-01, -10000
    Result Should Show    XIRR    Needs at least one negative and one positive dated amount
    Evidence    One flow only: a clear message instead of a rate

TC-W-TOOL-009 Credit card: a payment below the monthly interest says Never and names the payment that makes progress
    [Tags]    regression    P1
    Open Tool    credit-card-payoff-calculator
    Choose Site Currency    USD
    Result Should Show    Paid off in    3 yr 0 mo
    Result Should Show    Interest    $2,001
    Result Should Show    Total paid    $7,001
    Evidence    $5,000 at 24 % paying $200: 36 months
    Enter    in-pay    100
    Result Should Show    Paid off in    Never
    Result Sub Should Contain    Paid off in    Pay more than $101 a month to reduce the balance
    Result Should Not Show    Interest
    Evidence    $100 a month never clears the card

TC-W-TOOL-010 Flat rate: ₹1,00,000 at 10 % flat for 3 years is ₹3,611 a month, about 17.9 % reducing
    [Tags]    regression    P2
    Open Tool    flat-rate-loan-calculator
    Enter    in-p    100000
    Enter    in-r    10
    Enter    in-y    3
    Result Should Show    Monthly payment    ₹3,611
    Result Should Show    Total interest    ₹30,000
    ${rate}=    Result Value Of    Equivalent reducing rate
    ${v}=    Number From Text    ${rate}
    Should Be True    17.5 < ${v} < 18.5    Equivalent rate ${rate} should be between 17.5 % and 18.5 %
    Result Should Show    Equivalent reducing rate    17.92%
    Evidence    Flat-rate golden

TC-W-TOOL-011 Long series always find a rate: 7, 20 and 30-year loans and a 100-period IRR
    [Tags]    regression    P1
    Open Tool    loan-true-cost-calculator
    FOR    ${p}    ${r}    ${y}    ${fee}    ${want}    IN
    ...    5000000    8.5    20    0    8.5%
    ...    300000    6.5    30    0    6.5%
    ...    100000    10    7    2000    10.65%
        Enter    in-p    ${p}
        Enter    in-r    ${r}
        Enter    in-y    ${y}
        Enter    in-fee    ${fee}
        Result Should Show    True yearly rate    ${want}
    END
    Evidence    True cost found for 7, 20 and 30 years
    Go To Tool    flat-rate-loan-calculator
    Enter    in-p    500000
    Enter    in-r    7
    Enter    in-y    7
    Result Should Show    Equivalent reducing rate    12.16%
    Go To Tool    npv-irr-calculator
    ${flows}=    Evaluate    "-1000\\n" + "\\n".join(["100"] * 100)
    Set Value By Script    [data-testid="in-flows"]    ${flows}
    ${irr}=    Result Value Of    IRR
    ${v}=    Number From Text    ${irr}
    Should Be True    abs(${v} - 9.99) < 0.05    100-period IRR ${irr} should be about 9.99 %
    Main Text Should Not Match    check the inputs
    Evidence    100-period IRR found

TC-W-TOOL-012 Pasted Indian-style amounts are read whole; a blank line, a junk line and 2026-02-30 are named and left out
    [Tags]    regression    P1
    Open Tool    npv-irr-calculator
    Set Value By Script    [data-testid="in-flows"]    \n-1,00,000\nxyz\n30,000\n40,000;50,000
    Enter    in-r    10
    Result Should Show    NPV    -₹2,103.68
    Result Should Show    IRR    8.9%
    Tool Note Should Be    Line 2 not understood and left out.
    Evidence    NPV: -1,00,000 read as minus one lakh, line 2 (xyz) left out
    Go To Tool    xirr-calculator
    Set Value By Script    [data-testid="in-rows"]    2023-01-01, -1,00,000\n2026-02-30, 5\n2026-01-01, 1,20,000
    Result Should Show    XIRR    6.26%
    Tool Note Should Be    Line 2 not understood and left out.
    Evidence    XIRR: the impossible date is named and left out

TC-W-TOOL-013 Flows that change sign twice show "More than one IRR possible: use NPV"; all-positive flows ask for money out
    [Tags]    regression    P2
    Open Tool    npv-irr-calculator
    Choose Site Currency    USD
    Set Value By Script    [data-testid="in-flows"]    -100\n230\n-132
    Result Should Show    IRR    More than one IRR possible: use NPV
    Result Should Show    NPV    -$0.21
    Evidence    Two sign changes
    Set Value By Script    [data-testid="in-flows"]    100\n200
    Result Should Show    IRR    Needs money out and money in
    Evidence    No money out

TC-W-TOOL-014 Business tools reproduce the golden values: margin 25 % / markup 33.33 %, break-even 500 units
    [Tags]    regression    P2
    Open Tool    margin-markup-calculator
    Choose Site Currency    USD
    Result Should Show    Profit    $25.00
    Result Should Show    Margin    25%
    Result Should Show    Markup    33.33%
    Evidence    Margin vs markup on $75 / $100
    Go To Tool    break-even-calculator
    Choose Site Currency    USD
    Result Should Show    Units to break even    500
    Result Should Show    Revenue at break-even    $25,000
    Evidence    Break-even golden

TC-W-TOOL-015 Break-even says "Never" when each sale loses money; the emergency fund asks for a monthly saving at 0
    [Tags]    regression    P2
    Open Tool    break-even-calculator
    Choose Site Currency    USD
    Enter    in-price    30
    Result Should Show    Break-even    Never: each sale loses money
    Number Of Result Rows Should Be    1
    Evidence    Price equals variable cost
    Go To Tool    emergency-fund-calculator
    Enter    in-ms    0
    Result Should Show    Time to reach it    Set a monthly saving
    Result Should Show    Still to save    ₹1,90,000
    Evidence    No monthly saving

TC-W-TOOL-016 Everyday tools reproduce the golden values: discount, tip split, salary, percentage, 50/30/20, emergency fund
    [Tags]    regression    P2
    Open Tool    discount-calculator
    Choose Site Currency    USD
    Enter    in-p    1000
    Enter    in-d1    50
    Enter    in-d2    20
    Result Should Show    You pay    $400.00
    Result Should Show    You save    $600.00
    Result Should Show    Total discount    60%
    Go To Tool    tip-calculator
    Choose Site Currency    USD
    Enter    in-b    100
    Result Should Show    Each pays    $28.75
    Result Should Show    Tip    $15.00
    Result Should Show    Total    $115.00
    Go To Tool    salary-converter
    Choose Site Currency    USD
    Result Should Show    Monthly    $4,333
    Result Should Show    Weekly    $1,000
    Result Should Show    Daily (5-day week)    $200
    Result Should Show    Hourly    $25.00
    Go To Tool    percentage-calculator
    Result Should Show    18% of 250    45
    Result Should Show    Percentage change    25%
    Go To Tool    budget-50-30-20-calculator
    Enter    in-t    50000
    Result Should Show    Needs    ₹25,000
    Result Should Show    Wants    ₹15,000
    Result Should Show    Savings & debt payoff    ₹10,000
    Go To Tool    emergency-fund-calculator
    Enter    in-e    30000
    Enter    in-s    60000
    Result Should Show    Target    ₹1,80,000
    Result Should Show    Still to save    ₹1,20,000
    Result Should Show    Time to reach it    1 yr 0 mo
    Result Should Show    Months covered now    2
    Evidence    Emergency fund golden

TC-W-TOOL-017 Limits: a goal already met needs ₹0 a month; needs + wants over 100 % leaves ₹0 with a note
    [Tags]    regression    P3
    Open Tool    savings-goal-calculator
    Enter    in-target    100
    Enter    in-have    200
    Enter    in-y    1
    Result Should Show    Save each month    ₹0
    Evidence    Goal already met
    Go To Tool    budget-50-30-20-calculator
    Enter    in-n    80
    Result Should Show    Savings & debt payoff    ₹0
    Result Should Show    Needs    ₹64,000
    Tool Note Should Be    Needs and wants add up to more than 100%, so nothing is left to save.
    Evidence    Over 100 %

TC-W-TOOL-018 Changing the site currency restarts a global tool from that currency's defaults; a country tool keeps its own currency
    [Tags]    regression    P2
    Open Tool    inflation-calculator
    Field Value Should Be    in-amount    100000
    Result Should Show    Same things will cost    ₹1,79,085
    Choose Site Currency    USD
    Wait Until Keyword Succeeds    5s    0.3s    Field Value Should Be    in-amount    1000
    Field Value Should Be    in-rate    3
    Result Should Show    Same things will cost    $1,344
    Result Should Show    Today’s amount will buy    $744
    Result Should Show    Buying power lost    25.59%
    Evidence    Inflation tool restarted from the USD defaults
    Go To Tool    ppf-calculator
    Choose Site Currency    USD
    Result Should Show    Maturity    ₹40,68,209
    Evidence    PPF stays in rupees whatever the site currency

TC-W-TOOL-019 Phone width 360 px: no sideways scroll and a sticky bar keeps the main answer in view
    [Tags]    regression    P3
    Open Tool    net-worth-calculator    phone=True    width=360
    Page Has No Horizontal Scroll
    Element Should Be Visible    css=a.stickybar[href="\#tool-result"]
    Element Should Contain    css=a.stickybar    ₹38,00,000
    Element Attribute Value Should Be    css=a.stickybar    aria-label    Net worth: ₹38,00,000. See the full result
    Elements Should Fit Their Boxes    [data-testid="tool-result"] .stat-value
    Evidence    Net worth on a 360 px phone
    Click Centered    css=a.stickybar
    Wait Until Element Is Visible    ${RESULT}
    Result Should Show    Debt to assets    49.33%
    Evidence    Full result after the sticky bar
