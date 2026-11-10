*** Settings ***
Documentation     Retirement Planner (feature: RET, REQ-006 straight-line projection, REQ-007 Monte Carlo odds (Pro)) on
...               /retirement-planner/. Golden numbers: packages/finance-core/src/planning.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-planners.json).
Resource          ../../resources/web-planners.resource
Test Teardown     Close Finealth
Test Tags         web    retirement

*** Variables ***
${GOLDEN}         {"currentAge":30,"retireAge":60,"planToAge":85,"currentSavings":500000,"monthlySaving":20000,"yearlySpendingToday":600000,"inflationPct":6,"returnPct":11,"retiredReturnPct":7,"volatilityPct":15}

*** Keywords ***
Run Odds
    Click Settled    css=[data-testid="run-odds"]
    Wait Until Page Contains Element    css=[data-testid="odds-success"]    20s

Odds Figures
    [Documentation]    The three pot sizes (10th, median, 90th percentile) shown under the odds.
    ${vals}=    Execute Javascript
    ...    return [...document.querySelectorAll('[data-testid="ret-odds"] .stat-value')].map(e => e.textContent.trim())
    RETURN    ${vals}

*** Test Cases ***
TC-W-RET-001 Example plan shows the pot at 60, what is needed and when the money runs out
    [Tags]    sanity    regression    P1
    Open Finealth    /retirement-planner/
    Heading Should Contain    Retirement Planner
    Kpi Should Be    Years to go    28 yr
    Kpi Should Be    At 60    ₹6,80,83,077
    Kpi Should Be    Verdict    Runs out at 80    bad
    Test Id Text Should Be    ret-corpus    ₹6,80,83,077
    Test Id Text Should Be    ret-needed    ₹8,23,94,245
    Test Id Text Should Be    ret-verdict    Runs out at 80
    Test Id Should Contain    retirement-result    ₹36,80,414
    Evidence    Example: ₹6,80,83,077 at 60, needs ₹8,23,94,245, runs out at 80
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-RET-002 Golden plan: first-year spending 34,46,095 and a need above 20 years of spending
    [Tags]    sanity    regression    P1
    Open Finealth    /retirement-planner/
    Set Field    Age now    30
    Set Field    Saved so far    500000
    Set Field    Monthly saving    20000
    Set Field    Yearly spending    600000
    Kpi Should Be    Years to go    30 yr
    Test Id Should Contain    retirement-result    ₹34,46,095
    Test Id Text Should Be    ret-corpus    ₹6,44,65,310
    Test Id Text Should Be    ret-needed    ₹7,71,48,478
    Number Of Test Id Should Be    ret-needed    77148478
    Should Be True    77148478 > 3446095 * 20
    Evidence    Golden: first-year ₹34,46,095, pot ₹6,44,65,310

TC-W-RET-003 No monthly saving makes the money run out at 64, shown in red
    [Tags]    regression    P2
    Open Finealth    /retirement-planner/
    Set Field    in-ret-saving    0
    Test Id Text Should Be    ret-verdict    Runs out at 64
    Kpi Should Be    Verdict    Runs out at 64    bad
    Test Id Text Should Be    ret-corpus    ₹1,48,63,921
    ${cls}=    Get Element Attribute    css=[data-testid="ret-verdict"]    class
    Should Contain    ${cls}    text-red-300
    Evidence    Saving 0: runs out at 64 in red

TC-W-RET-004 A retirement age below the current age does not break the page (0 years to go)
    [Tags]    regression    P3
    Open Finealth    /retirement-planner/
    Set Field    Age now    50
    Set Field    Retire at    45
    Kpi Should Be    Years to go    0 yr
    Test Id Text Should Be    ret-corpus    ₹8,00,000
    Test Id Should Contain    retirement-result    ₹7,20,000
    Test Id Text Should Be    ret-verdict    Runs out at 51
    Main Should Not Show NaN
    Page Should Have No Console Problems
    Evidence    Age 50, retire 45: 0 yr, no crash

TC-W-RET-005 Free plan: retirement odds are behind the Pro gate and no simulation runs
    [Tags]    sanity    regression    P1
    Open Finealth    /retirement-planner/
    Test Id Should Contain    ret-pro-gate    Retirement odds (Monte Carlo)
    Test Id Should Contain    ret-pro-gate    1,000 simulated market histories
    Page Should Not Contain Element    css=[data-testid="run-odds"]
    Page Should Not Contain Element    css=[data-testid="odds-success"]
    Page Should Not Contain Element    css=[data-testid="ret-odds"]
    Evidence    Free: odds gated

TC-W-RET-006 Pro odds: 1,000 runs give the same answer twice, with bad ≤ typical ≤ good
    [Tags]    regression    P1
    Open Finealth Pro    /retirement-planner/
    Page Should Not Contain Element    css=[data-testid="ret-pro-gate"]
    Element Text Should Be    css=[data-testid="run-odds"]    Run 1,000 simulations
    Run Odds
    Test Id Text Should Be    odds-success    23 % chance your money lasts to 85
    ${a}=    Odds Figures
    Should Be Equal    ${a}    ${{ ['₹2,68,70,293', '₹5,70,64,800', '₹11,90,68,762'] }}
    Test Id Should Contain    ret-odds    typically around age 73
    Test Id Should Contain    ret-odds    across 1,000 runs
    Element Text Should Be    css=[data-testid="run-odds"]    Run again with these numbers
    Evidence    23 %: ₹2,68,70,293 ≤ ₹5,70,64,800 ≤ ₹11,90,68,762
    Run Odds
    Test Id Text Should Be    odds-success    23 % chance your money lasts to 85
    ${b}=    Odds Figures
    Lists Should Be Equal    ${a}    ${b}
    ${x}=    Call Engine    retirementOdds    ${GOLDEN}    500    7
    ${y}=    Call Engine    retirementOdds    ${GOLDEN}    500    7
    Dictionaries Should Be Equal    ${x}    ${y}
    Should Be True    0 <= ${x}[successRate] <= 1
    Should Be True    ${x}[atRetirement][p10] <= ${x}[atRetirement][p50] <= ${x}[atRetirement][p90]

TC-W-RET-007 Pro odds with volatility 0 match the straight-line projection (0 % or 100 %)
    [Tags]    regression    P2
    Open Finealth Pro    /retirement-planner/
    Set Field    Volatility    0
    Run Odds
    Test Id Text Should Be    odds-success    0 % chance your money lasts to 85
    ${a}=    Odds Figures
    Should Be Equal    ${a}[1]    ₹6,80,83,077
    Test Id Text Should Be    ret-corpus    ₹6,80,83,077
    Evidence    Volatility 0, runs out at 80: 0 %, median = projection
    Settle On    css=[data-testid="in-ret-saving"]
    Set Field    in-ret-saving    100000
    Test Id Text Should Be    ret-verdict    Lasts to 85
    Run Odds
    Test Id Text Should Be    odds-success    100 % chance your money lasts to 85
    ${b}=    Odds Figures
    Should Be Equal    ${b}[1]    ₹22,77,40,546
    Test Id Text Should Be    ret-corpus    ₹22,77,40,546
    Evidence    Saving 1,00,000: 100 %, median = projection

TC-W-RET-008 A plan that lasts shows "Lasts to 85" in green and is kept after a reload
    [Tags]    regression    P2
    Open Finealth    /retirement-planner/
    Set Field    in-ret-saving    100000
    Test Id Text Should Be    ret-verdict    Lasts to 85
    Kpi Should Be    Verdict    Lasts    ok
    Kpi Should Be    At 60    ₹22,77,40,546    ok
    Saved Planner Should Contain    retirement    "monthlySaving":100000
    Reload And Wait
    Field Value Should Be    in-ret-saving    100000
    Test Id Text Should Be    ret-verdict    Lasts to 85
    Evidence    After reload: saving 1,00,000 kept, lasts to 85
