*** Settings ***
Documentation     Goal Planner (feature: GOAL, REQ-005: inflation-adjusted cost, monthly saving, priority funding from one
...               budget, free limit of 1 goal, Pro step-up and ordering) on /goal-planner/. Golden numbers:
...               packages/finance-core/src/planning.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-planners.json).
Resource          ../../resources/web-planners.resource
Test Teardown     Close Finealth
Test Tags         web    goals

*** Variables ***
${AB}             [{"id":"a","name":"Goal A","costToday":2400,"years":2,"inflationPct":0,"returnPct":0,"currentSavings":0,"stepUpPct":0},{"id":"b","name":"Goal B","costToday":4800,"years":2,"inflationPct":0,"returnPct":0,"currentSavings":0,"stepUpPct":0}]

*** Keywords ***
Set Goal
    [Arguments]    ${i}    ${cost}    ${years}    ${saved}    ${inflation}    ${return}
    Settle On    css=[data-testid="goal-${i}"]
    Set Field    Cost today    ${cost}    ${i}
    Set Field    In years    ${years}    ${i}
    Set Field    Saved so far    ${saved}    ${i}
    Set Field    Inflation    ${inflation}    ${i}
    Set Field    Expected return    ${return}    ${i}

Goal Budget
    [Arguments]    ${amount}
    Settle On    css=[data-testid="in-goal-budget"]
    Set Field    in-goal-budget    ${amount}

*** Test Cases ***
TC-W-GOAL-001 Example goal: future cost, monthly saving and what is left of the budget
    [Tags]    sanity    regression    P1
    Open Finealth    /goal-planner/
    Heading Should Contain    Goal Planner
    Kpi Should Be    Goals planned    1 of 3
    Kpi Should Be    Need each month    ₹19,719
    Kpi Should Be    Left over    ₹20,281    ok
    Test Id Text Should Be    goal-0-result    Will cost ₹30,07,261 in 7 years. Save ₹19,719 a month.
    Test Id Should Contain    goal-0    Your budget covers 100 % (₹19,719 a month).
    Test Id Text Should Be    goals-needed    ₹19,719
    Test Id Text Should Be    goals-surplus    ₹20,281
    Main Text Should Contain    Every goal is covered.
    Evidence    Example: ₹30,07,261 in 7 years, ₹19,719 a month, ₹20,281 left
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-GOAL-002 10,00,000 in 10 years at 6 % inflation and 12 % return needs 7,708 a month (golden)
    [Tags]    sanity    regression    P1
    Open Finealth    /goal-planner/
    Set Goal    0    1000000    10    0    6    12
    Test Id Text Should Be    goal-0-result    Will cost ₹17,90,848 in 10 years. Save ₹7,708 a month.
    Evidence    Golden goal: ₹17,90,848 and ₹7,708
    Set Field    Saved so far    100000    0
    Test Id Text Should Be    goal-0-result    Will cost ₹17,90,848 in 10 years. Save ₹6,288 a month.
    Kpi Should Be    Need each month    ₹6,288
    Evidence    With ₹1,00,000 saved: ₹6,288 a month

TC-W-GOAL-003 A budget below what the goal needs shows the shortfall and the part covered
    [Tags]    regression    P1
    Open Finealth    /goal-planner/
    Set Goal    0    1000000    10    0    6    12
    Goal Budget    5000
    Kpi Should Be    Short by    ₹2,708    bad
    Test Id Text Should Be    goals-surplus    ₹2,708
    Element Should Contain    xpath=//*[@data-testid="goals-surplus"]/preceding-sibling::span[1]    SHORTFALL
    Test Id Should Contain    goal-0    Your budget covers 65 % (₹5,000 a month).
    Main Text Should Contain    Push a goal out a few years, lower its cost, or raise the budget to close the gap.
    Evidence    Budget ₹5,000: short by ₹2,708, 65 % covered

TC-W-GOAL-004 With 0 % return and 0 % inflation the saving is a plain division; a zero-cost goal needs nothing
    [Tags]    regression    P2
    Open Finealth    /goal-planner/
    Set Goal    0    2400    2    0    0    0
    Test Id Text Should Be    goal-0-result    Will cost ₹2,400 in 2 years. Save ₹100 a month.
    Evidence    2,400 over 2 years at 0 %: ₹100 a month
    Set Field    Cost today    0    0
    Test Id Text Should Be    goal-0-result    Will cost ₹0 in 2 years. Save ₹0 a month.
    Main Should Not Show NaN
    Page Should Have No Console Problems

TC-W-GOAL-005 Free plan plans only goal #1; the others are saved, faded and locked
    [Tags]    sanity    regression    P1
    Open Finealth    /goal-planner/
    Test Id Text Should Be    goal-1-locked    Saved, but not planned on the free plan. It comes back with Pro.
    Test Id Text Should Be    goal-2-locked    Saved, but not planned on the free plan. It comes back with Pro.
    Page Should Not Contain Element    css=[data-testid="goal-1-result"]
    Element Should Be Disabled    css=[data-testid="goal-1"] input[aria-label="Goal name"]
    Element Should Be Disabled    css=[data-testid="goal-2"] input[type="number"]
    Test Id Should Contain    goal-limit    The free plan plans 1 goal at a time.
    Page Should Not Contain Element    css=[data-testid="add-goal"]
    Page Should Not Contain Element    css=input[aria-label="Yearly step-up"]
    Evidence    Free: goal #1 planned, #2 and #3 locked
    Remove Item Named    Home down payment
    Remove Item Named    Child's education
    Remove Item Named    New car
    Kpi Should Be    Goals planned    0 of 0
    Click Settled    css=[data-testid="add-goal"]
    Field Value Should Be    Goal name    Goal 1
    Field Value Should Be    Cost today    500000
    Test Id Should Contain    goal-0-result    in 5 years
    Evidence    All removed, then one added back

TC-W-GOAL-006 Pro funds every goal from one budget in priority order, with step-up and reordering
    [Tags]    regression    P1
    Open Finealth Pro    /goal-planner/
    Kpi Should Be    Goals planned    3 of 3
    Kpi Should Be    Short by    ₹18,497    bad
    Test Id Text Should Be    goal-1-result    Will cost ₹1,04,43,120 in 15 years. Save ₹20,697 a month.
    Test Id Should Contain    goal-1    Your budget covers 98 % (₹20,281 a month).
    Test Id Should Contain    goal-2    Your budget covers 0 % (₹0 a month).
    Page Should Not Contain Element    css=[data-testid="goal-limit"]
    Field Value Should Be    Yearly step-up    0    0
    Evidence    Pro: three goals funded top-down
    Seed Planner    goals    ${AB}
    Goal Budget    200
    Test Id Should Contain    goal-0    Your budget covers 100 % (₹100 a month).
    Test Id Should Contain    goal-1    Your budget covers 50 % (₹100 a month).
    Test Id Text Should Be    goals-surplus    ₹100
    Kpi Should Be    Short by    ₹100    bad
    Evidence    Needs 100 + 200 on 200: 100 % and 50 %, short ₹100
    Click Settled    xpath=//main//button[@aria-label="Move Goal B up"]
    Field Value Should Be    Goal name    Goal B    0
    Test Id Should Contain    goal-0    Your budget covers 100 % (₹200 a month).
    Test Id Should Contain    goal-1    Your budget covers 0 % (₹0 a month).
    Evidence    Goal B moved up and is funded first

TC-W-GOAL-007 Goals are kept after a reload and "In years" is capped at 60
    [Tags]    regression    P2
    Open Finealth    /goal-planner/
    Set Field    Goal name    Wedding    0
    Set Field    In years    99    0
    Field Value Should Be    In years    60    0
    Test Id Should Contain    goal-0-result    in 60 years
    Saved Planner Should Contain    goals    "name":"Wedding"    "years":60
    Reload And Wait
    Field Value Should Be    Goal name    Wedding    0
    Field Value Should Be    In years    60    0
    Kpi Should Be    Goals planned    1 of 3
    Evidence    After reload: Wedding, 60 years
