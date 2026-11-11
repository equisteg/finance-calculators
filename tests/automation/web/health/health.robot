*** Settings ***
Documentation     Financial Health Check (feature: HLT, REQ-001 score, REQ-002 action plan, REQ-022 key figures and
...               gap-free rows on /health-check/). Golden numbers: packages/finance-core/src/planning.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-planners.json).
Resource          ../../resources/web-planners.resource
Test Teardown     Close Finealth
Test Tags         web    health

*** Variables ***
${ACTIONS}        css=[data-testid="health-actions"]

*** Test Cases ***
TC-W-HLT-001 Example household scores 75 Good with the key figures in the heading
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Heading Should Contain    Financial Health Check
    Main Text Should Contain    The numbers below are an example household
    Test Id Text Should Be    health-score    75
    Test Id Text Should Be    health-grade    Good
    Kpi Should Be    Score    75/100    ok
    Kpi Should Be    Surplus / month    ₹25,000    ok
    Kpi Should Be    Net worth    ₹13,65,000
    Test Id Should Contain    health-result    You keep ₹25,000 a month after spending and loan payments.
    Test Id Should Contain    health-result    25 %
    Test Id Should Contain    health-result    3.0 mo
    Test Id Should Contain    health-result    15 % of pay
    Evidence    Score 75 Good, heading figures 75/100, ₹25,000, ₹13,65,000
    Test Id Should Contain    health-actions    1. Build your emergency fund
    Test Id Should Contain    health-actions    +10 pts
    Test Id Should Contain    health-actions    Add ₹2,25,000 to reach 6 months
    Test Id Should Contain    health-actions    4 more actions are ranked in the full report, worth up to +16 points.
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-HLT-002 Changing emergency savings updates the score live and is kept after a reload
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Mark Page
    Set Field    in-fund    450000
    Test Id Text Should Be    health-score    85
    Test Id Text Should Be    health-grade    Excellent
    Kpi Should Be    Score    85/100    ok
    Page Should Still Be Marked
    Evidence    Score 85 Excellent without a page reload
    Saved Planner Should Contain    health    "emergencyFund":450000
    Reload And Wait
    Field Value Should Be    in-fund    450000
    Test Id Text Should Be    health-score    85
    Page Should Not Contain    The numbers below are an example household
    Evidence    After reload: still 450000 and 85
    Click Button Named    Reset to the example
    Test Id Text Should Be    health-score    75
    Field Value Should Be    in-fund    225000

TC-W-HLT-003 Zero income, a negative spending entry and an empty field give a whole score with no NaN
    [Tags]    regression    P1
    Open Finealth    /health-check/
    Set Field    in-income    0
    Set Field    in-expenses    -5
    Set Field    in-invest    ${EMPTY}
    Field Value Should Be    in-invest    0
    ${spend}=    Get Field Value    in-expenses
    Should Be Equal As Numbers    ${spend}    5    The minus sign should not be kept: spending counts as 5
    Test Id Text Should Be    health-score    28
    Test Id Text Should Be    health-grade    Needs attention
    Kpi Should Be    Score    28/100    bad
    Kpi Should Be    Surplus / month    -₹15,005    bad
    Test Id Should Contain    health-result    You are short by ₹15,005 a month.
    Main Should Not Show NaN
    Evidence    Junk inputs: score 28, no NaN
    Page Should Have No Console Problems

TC-W-HLT-004 Meeting every rule of thumb scores 100 Excellent with no actions left
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Set Field    in-fund    600000
    Set Field    in-costly    0
    Set Field    in-debtpay    5000
    Set Field    in-invest    5000000
    Set Field    Term life cover    20000000
    Test Id Text Should Be    health-score    100
    Test Id Text Should Be    health-grade    Excellent
    Test Id Should Contain    health-actions    Every rule of thumb is met. Keep going, and re-check once a quarter.
    Element Should Not Contain    ${ACTIONS}    more action
    ${n}=    Count Of    [data-testid="health-actions"] li
    Should Be Equal As Integers    ${n}    0
    Evidence    Score 100, no actions

TC-W-HLT-005 Spending above income makes "Stop the monthly shortfall" the top priority
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Set Field    in-expenses    95000
    Test Id Text Should Be    health-score    51
    Test Id Text Should Be    health-grade    Fair
    Test Id Should Contain    health-actions    1. Stop the monthly shortfall
    Test Id Should Contain    health-actions    +20 pts
    Test Id Should Contain    health-result    You are short by ₹10,000 a month.
    Kpi Should Be    Surplus / month    -₹10,000    bad
    Evidence    Shortfall ₹10,000, top priority Stop the monthly shortfall

TC-W-HLT-006 A negative surplus turns the heading figure red and nothing spills out of its tile
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Set Field    in-expenses    120000
    Kpi Should Be    Surplus / month    -₹35,000    bad
    Kpi Should Be    Score    50/100    bad
    ${fg}=    Get Computed Style    [data-testid="tool-kpis"] .kpi.bad b    color
    ${ok}=    Get Computed Style    .kpi:not(.bad):not(.ok) b    color
    Should Not Be Equal    ${fg}    ${ok}    The negative surplus is not coloured
    ${r}    ${g}    ${b}=    Evaluate    [int(x) for x in __import__('re').findall(r'\\d+', '''${fg}''')[:3]]
    Should Be True    ${r} > ${g} and ${r} > ${b}    The negative surplus colour ${fg} is not red
    Elements Should Fit Their Boxes    .kpi b
    Elements Should Fit Their Boxes    .stat-value
    Evidence    Surplus -₹35,000 in red, all figures inside their tiles

TC-W-HLT-007 Free plan shows only the top priority and the "Full report" Pro gate
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Element Should Contain    css=[data-testid="health-actions"] > h2    YOUR TOP PRIORITY
    ${n}=    Count Of    [data-testid="health-actions"] li
    Should Be Equal As Integers    ${n}    1
    Test Id Should Contain    health-pro-gate    Full report: all six pillars and 4 more actions
    Page Should Not Contain Element    css=[data-testid="health-pillars"]
    Page Should Not Contain Element    css=[data-testid="print-report"]
    Page Should Not Contain Element    css=[data-testid="save-snapshot"]
    Evidence    Free: one action and the Pro gate
    Click Centered    xpath=//*[@data-testid="health-pro-gate"]//a[normalize-space(.)="See Pro plans"]
    Wait Until Location Contains    /pricing/

TC-W-HLT-008 Pro shows all five ranked actions, the six pillars, Print and Save snapshot
    [Tags]    regression    P1
    Open Finealth Pro    /health-check/
    Element Should Contain    css=[data-testid="health-actions"] > h2    YOUR ACTION PLAN
    @{titles}=    Create List    1. Build your emergency fund    2. Catch up on retirement savings    3. Close your insurance gaps
    ...    4. Lower your loan payments    5. Clear costly debt first
    @{points}=    Create List    +10 pts    +8 pts    +4 pts    +3 pts    +1 pts
    ${n}=    Count Of    [data-testid="health-actions"] li
    Should Be Equal As Integers    ${n}    5
    FOR    ${i}    IN RANGE    5
        ${k}=    Evaluate    ${i} + 1
        Element Should Contain    css=[data-testid="health-actions"] li:nth-child(${k}) h3    ${titles}[${i}]
        Element Should Contain    css=[data-testid="health-actions"] li:nth-child(${k})    ${points}[${i}]
    END
    Page Should Not Contain Element    css=[data-testid="health-pro-gate"]
    @{pillars}=    Create List    Savings rate|100/100    Emergency fund|50/100    Debt payments|88/100    Costly debt|90/100
    ...    Retirement savings|50/100    Insurance protection|71/100
    ${n}=    Count Of    [data-testid="health-pillars"] li
    Should Be Equal As Integers    ${n}    6
    FOR    ${i}    ${p}    IN ENUMERATE    @{pillars}
        ${name}    ${score}=    Evaluate    '''${p}'''.split('|')
        ${k}=    Evaluate    ${i} + 1
        Element Should Contain    css=[data-testid="health-pillars"] li:nth-child(${k})    ${name}
        Element Should Contain    css=[data-testid="health-pillars"] li:nth-child(${k})    ${score}
    END
    Evidence    Pro: five actions 10/8/4/3/1 and six pillars
    Element Should Be Visible    css=[data-testid="print-report"]
    Click Centered    css=[data-testid="save-snapshot"]
    Main Text Should Contain    Snapshot saved on this device.
    Saved Planner Should Contain    snapshots    "score":75
    Evidence    Snapshot saved

TC-W-HLT-009 Desktop 1280 px: every input and figure row is filled edge to edge
    [Tags]    regression    P2
    Open Finealth    /health-check/    width=1280
    Sleep    0.5s    reason=fitRows runs after the first layout
    ${inputs}=    Count Of    .fieldgrid input
    Should Be Equal As Integers    ${inputs}    9
    Grid Rows Should Have No End Gap
    Page Has No Horizontal Scroll
    Evidence    1280 px, no empty cell at the end of a row

TC-W-HLT-010 Retirement target follows the savings-by-age curve and the grade boundaries (engine rule)
    [Tags]    regression    P2
    FOR    ${age}    ${want}    IN    22    0    30    1    45    4.5    80    10
        ${m}=    Call Engine    retirementTargetMultiple    ${age}
        Should Be Equal As Numbers    ${m}    ${want}    Age ${age}: target ${m}x, expected ${want}x
    END
    FOR    ${score}    ${grade}    IN    80    Excellent    60    Good    40    Fair    39    Needs attention
        ${g}=    Call Engine    gradeOf    ${score}
        Should Be Equal    ${g}    ${grade}
    END
    ${r}=    Call Engine    financialHealth
    ...    {"monthlyIncome":100000,"monthlyExpenses":60000,"monthlyDebtPayments":15000,"emergencyFund":225000,"costlyDebt":60000,"investments":1200000,"age":45,"dependents":2,"lifeCover":5000000,"hasHealthCover":true}
    ${ret}=    Evaluate    [p for p in $r['pillars'] if p['id'] == 'retirement'][0]
    Should Be Equal    ${ret}[target]    4.5x yearly income at age 45
    Should Be Equal As Integers    ${ret}[score]    22

TC-W-HLT-011 No health insurance lowers the score and moves insurance to the top
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Click Centered    xpath=//*[@role="group" and @aria-label="Health insurance"]/button[normalize-space(.)="No"]
    Element Attribute Value Should Be    xpath=//*[@role="group" and @aria-label="Health insurance"]/button[normalize-space(.)="No"]    aria-pressed    true
    Test Id Text Should Be    health-score    67
    Test Id Text Should Be    health-grade    Good
    Test Id Should Contain    health-actions    1. Close your insurance gaps
    Test Id Should Contain    health-actions    +12 pts
    Evidence    Health cover No: 67, insurance first
