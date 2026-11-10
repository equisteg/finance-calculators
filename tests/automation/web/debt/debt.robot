*** Settings ***
Documentation     Debt Payoff Planner (feature: DEBT, REQ-003 planner and free limit, REQ-004 what-if and schedule (Pro),
...               REQ-016 CSV export from the planner (Pro)) on /debt-payoff/. Golden numbers: packages/finance-core/src/planning.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-planners.json).
Resource          ../../resources/web-planners.resource
Test Teardown     Close Finealth
Test Tags         web    debt

*** Variables ***
${FOUR}           [{"id":"card","name":"Credit card","balance":80000,"aprPct":42,"minPayment":4000},{"id":"personal","name":"Personal loan","balance":250000,"aprPct":14,"minPayment":8500},{"id":"phone","name":"Phone EMI","balance":30000,"aprPct":16,"minPayment":3000},{"id":"gold","name":"Gold loan","balance":50000,"aprPct":10,"minPayment":2000}]
${EXAMPLE}        [{"id":"card","name":"Credit card","balance":80000,"aprPct":42,"minPayment":4000},{"id":"personal","name":"Personal loan","balance":250000,"aprPct":14,"minPayment":8500},{"id":"phone","name":"Phone EMI","balance":30000,"aprPct":16,"minPayment":3000}]
${ORDER}          xpath=//main//h3[normalize-space(.)="Payoff order"]/following-sibling::ol[1]

*** Keywords ***
Set Debt
    [Arguments]    ${row}    ${balance}    ${rate}    ${minimum}
    ${n}=    Evaluate    ${row} + 1
    Settle On    xpath=(//main//input[@aria-label="Debt name"])[${n}]
    Set Field    Balance    ${balance}    ${row}
    Set Field    Rate    ${rate}    ${row}
    Set Field    Minimum    ${minimum}    ${row}

Payoff Row Should Be
    [Arguments]    ${n}    ${name}    ${when}
    Element Should Contain    ${ORDER}/li[${n}]    ${name}
    Element Should Contain    ${ORDER}/li[${n}]    ${when}

Two Golden Debts
    [Documentation]    Card 2,000 at 24 % (min 60) and loan 500 at 10 % (min 25), budget 300 (planning.test.ts).
    Remove Item Named    Phone EMI
    Set Debt    0    2000    24    60
    Set Debt    1    500    10    25
    Set Field    in-extra    215

Rename Debts For Csv
    Set Field    Debt name    =SUM(A1)    0
    Set Field    Debt name    x,y    1
    Set Field    Debt name    say "hi"    2

Export Debt Csv
    Clear Folder    ${DOWNLOADS}
    ${t}=    Get Epoch Time
    Click Centered    css=[data-testid="export-debt-csv"]
    ${f}=    Wait For New Download    ${DOWNLOADS}    .csv    since=${t}
    Should End With    ${f}    finealth-debt-plan.csv
    RETURN    ${f}

*** Test Cases ***
TC-W-DEBT-001 Example debts show the debt-free date, interest, saving and the payoff order
    [Tags]    sanity    regression    P1
    Open Finealth    /debt-payoff/
    Heading Should Contain    Debt Payoff Planner
    Kpi Should Be    Total owed    ₹3,60,000
    Kpi Should Be    Debt-free in    1 yr 10 mo    ok
    Kpi Should Be    Monthly budget    ₹19,375
    Test Id Text Should Be    debt-free-in    1 yr 10 mo
    Test Id Text Should Be    debt-interest    ₹65,121
    Test Id Text Should Be    debt-saved    ₹55,281
    Test Id Should Contain    debt-result    1 yr 3 mo sooner
    Test Id Should Contain    debt-result    Avalanche costs ₹2,974 less interest than snowball.
    Payoff Row Should Be    1    Phone EMI    11 mo
    Payoff Row Should Be    2    Credit card    1 yr 1 mo
    Payoff Row Should Be    3    Personal loan    1 yr 10 mo
    Evidence    Example: 1 yr 10 mo, ₹65,121 interest, ₹55,281 saved
    Disclaimer Should Be Visible
    Page Should Have No Console Problems

TC-W-DEBT-002 One debt of 1,000 at 12 % paying 100 clears in 11 months (golden)
    [Tags]    regression    P1
    Open Finealth    /debt-payoff/
    Remove Item Named    Personal loan
    Remove Item Named    Phone EMI
    Set Debt    0    1000    12    100
    Set Field    in-extra    0
    Kpi Should Be    Monthly budget    ₹100
    Kpi Should Be    Total owed    ₹1,000
    Test Id Text Should Be    debt-free-in    11 mo
    Test Id Text Should Be    debt-interest    ₹59
    Test Id Should Contain    debt-result    0 mo sooner
    Evidence    1,000 at 12 %: 11 months, ₹59 interest
    ${p}=    Call Engine    planDebtPayoff    [{"id":"a","name":"Card","balance":1000,"aprPct":12,"minPayment":100}]    100    "avalanche"
    Should Be Equal As Numbers    ${p}[totalInterest]    58.98
    Should Be Equal As Numbers    ${p}[totalPaid]    1058.98

TC-W-DEBT-003 Two debts on a budget of 300: avalanche 10 months ₹214, snowball ₹252, minimums 46 months longer
    [Tags]    sanity    regression    P1
    Open Finealth    /debt-payoff/
    Two Golden Debts
    Kpi Should Be    Monthly budget    ₹300
    Test Id Text Should Be    debt-free-in    10 mo
    Test Id Text Should Be    debt-interest    ₹214
    Test Id Text Should Be    debt-saved    ₹1,164
    Test Id Should Contain    debt-result    3 yr 10 mo sooner
    Test Id Should Contain    debt-result    Avalanche costs ₹38 less interest than snowball.
    Payoff Row Should Be    1    Credit card    8 mo
    Payoff Row Should Be    2    Personal loan    10 mo
    Evidence    Avalanche: 10 mo, ₹214
    Set Field    Strategy    snowball
    Test Id Text Should Be    debt-interest    ₹252
    Test Id Text Should Be    debt-free-in    10 mo
    Payoff Row Should Be    1    Personal loan    3 mo
    Payoff Row Should Be    2    Credit card    10 mo
    Evidence    Snowball: ₹252, loan cleared in month 3

TC-W-DEBT-004 A budget below the minimums cannot be entered on screen; the engine refuses it
    [Tags]    regression    P1
    Open Finealth    /debt-payoff/
    Two Golden Debts
    Set Field    in-extra    -235
    ${extra}=    Get Field Value    in-extra
    Should Be Equal As Numbers    ${extra}    235    The extra field should drop the minus sign
    Kpi Should Be    Monthly budget    ₹320
    Page Should Not Contain Element    css=[data-testid="debt-infeasible"]
    Kpi Should Be    Debt-free in    9 mo    ok
    Evidence    Minus sign refused: budget never falls below the minimums (₹85)
    ${p}=    Call Engine    planDebtPayoff    [{"id":"card","name":"Card","balance":2000,"aprPct":24,"minPayment":60},{"id":"loan","name":"Loan","balance":500,"aprPct":10,"minPayment":25}]    50    "avalanche"
    Should Not Be True    ${p}[feasible]
    Should Be Equal    ${p}[reason]    Your monthly budget is less than the total of the minimum payments.

TC-W-DEBT-005 A minimum below the monthly interest shows the "keeps growing" warning
    [Tags]    regression    P1
    Open Finealth    /debt-payoff/
    Remove Item Named    Personal loan
    Remove Item Named    Phone EMI
    Set Debt    0    10000    36    100
    Set Field    in-extra    0
    Test Id Text Should Be    debt-infeasible    Your payments do not cover the interest, so the debt would keep growing.
    Kpi Should Be    Debt-free in    Not yet    bad
    Page Should Not Contain Element    css=[data-testid="debt-result"]
    Main Should Not Show NaN
    Evidence    10,000 at 36 % paying 100: not feasible

TC-W-DEBT-006 With every debt removed the plan is done at 0 months and a debt can be added
    [Tags]    regression    P3
    Open Finealth    /debt-payoff/
    Remove Item Named    Credit card
    Remove Item Named    Personal loan
    Remove Item Named    Phone EMI
    Kpi Should Be    Total owed    ₹0
    Test Id Text Should Be    debt-free-in    0 mo
    Page Should Not Contain Element    css=[data-testid="debt-limit"]
    Evidence    No debts: 0 months
    Click Centered    css=[data-testid="add-debt"]
    Field Value Should Be    Debt name    Debt 1
    Field Value Should Be    Rate    18
    Field Value Should Be    Balance    0
    Saved Planner Should Contain    debts    "name":"Debt 1"

TC-W-DEBT-007 Free plan: three debts max, a fourth saved debt is faded and not planned
    [Tags]    sanity    regression    P1
    Open Finealth    /debt-payoff/
    Test Id Text Should Be    debt-limit    The free plan plans up to 3 debts. Pro has no limit.
    Page Should Not Contain Element    css=[data-testid="add-debt"]
    Seed Planner    debts    ${FOUR}
    Field Value Should Be    Debt name    Gold loan    3
    ${cls}=    Get Element Attribute    xpath=(//main//input[@aria-label="Debt name"])[4]/ancestor::li[1]    class
    Should Contain    ${cls}    opacity-50
    Kpi Should Be    Total owed    ₹3,60,000
    Test Id Text Should Be    debt-free-in    1 yr 10 mo
    Page Should Not Contain Element    css=[data-testid="add-debt"]
    Evidence    Fourth debt faded; total stays ₹3,60,000

TC-W-DEBT-008 Free plan: what-if, schedule and CSV export are behind the Pro gate
    [Tags]    sanity    regression    P1
    Open Finealth    /debt-payoff/
    Test Id Should Contain    debt-pro-gate    What-if and month-by-month schedule
    Page Should Not Contain Element    css=[data-testid="in-whatif"]
    Page Should Not Contain Element    css=[data-testid="debt-whatif"]
    Page Should Not Contain Element    css=[data-testid="export-debt-csv"]
    Page Should Not Contain    Month-by-month schedule (
    Evidence    Free: Pro gate instead of the what-if

TC-W-DEBT-009 Pro what-if of 5,000 shows how much sooner and cheaper, with three chart lines and the schedule
    [Tags]    regression    P1
    Open Finealth Pro    /debt-payoff/
    Page Should Not Contain Element    css=[data-testid="debt-pro-gate"]
    ${lines}=    Count Of    [data-testid="debt-whatif"] svg polyline
    Should Be Equal As Integers    ${lines}    2
    Settle On    css=[data-testid="in-whatif"]
    Set Field    in-whatif    5000
    Test Id Text Should Be    whatif-result    Paying ₹5,000 more a month makes you debt-free 5 mo sooner and saves ₹18,110 in interest.
    ${lines}=    Count Of    [data-testid="debt-whatif"] svg polyline
    Should Be Equal As Integers    ${lines}    3
    Evidence    What-if: 5 mo sooner, ₹18,110 saved, 3 lines
    Click Settled    xpath=//*[@data-testid="debt-whatif"]//summary
    Element Should Contain    css=[data-testid="debt-whatif"] summary    Month-by-month schedule (22 months)
    ${rows}=    Count Of    [data-testid="debt-whatif"] tbody tr
    Should Be Equal As Integers    ${rows}    22
    Element Should Contain    css=[data-testid="debt-whatif"] tbody tr:last-child    ₹0
    Evidence    Schedule: 22 rows, ends at ₹0

TC-W-DEBT-010 Pro plans more than three debts
    [Tags]    regression    P2
    Open Finealth Pro    /debt-payoff/
    Page Should Not Contain Element    css=[data-testid="debt-limit"]
    Click Settled    css=[data-testid="add-debt"]
    Set Debt    3    50000    10    2000
    Kpi Should Be    Total owed    ₹4,10,000
    Kpi Should Be    Monthly budget    ₹21,375
    Test Id Text Should Be    debt-free-in    1 yr 11 mo
    Element Should Be Visible    css=[data-testid="add-debt"]
    Evidence    Pro: four debts planned, ₹4,10,000

TC-W-DEBT-011 Pro with an infeasible plan shows no what-if sentence and disables CSV export
    [Tags]    regression    P3
    Open Finealth Pro    /debt-payoff/
    Remove Item Named    Personal loan
    Remove Item Named    Phone EMI
    Set Debt    0    10000    36    100
    Set Field    in-extra    0
    Settle On    css=[data-testid="in-whatif"]
    Set Field    in-whatif    5000
    Test Id Should Contain    debt-infeasible    do not cover the interest
    Page Should Not Contain Element    css=[data-testid="whatif-result"]
    Element Should Be Disabled    css=[data-testid="export-debt-csv"]
    Evidence    Infeasible: danger notice stays, no what-if sentence, export disabled

TC-W-DEBT-012 Pro Export CSV downloads the month-by-month plan with a header and CRLF line ends
    [Tags]    regression    P2
    Open Finealth Pro    /debt-payoff/
    Rename Debts For Csv
    ${f}=    Export Debt Csv
    ${raw}=    Read Text File Raw    ${f}
    Should Start With    ${raw}    Month,Paid,Interest,Balance left\r\n
    ${rows}=    Read CSV File    ${f}
    ${n}=    Get Length    ${rows}
    Should Be Equal As Integers    ${n}    23    Header + 22 months expected
    ${cmp}=    Call Engine    compareDebtStrategies    ${EXAMPLE}    19375
    ${first}=    Set Variable    ${cmp}[avalanche][schedule][0]
    ${want}=    Evaluate    ['1', '%.2f' % $first['paid'], '%.2f' % $first['interest'], '%.2f' % $first['balance']]
    Lists Should Be Equal    ${rows}[1]    ${want}
    Should Be Equal    ${rows}[-1][0]    22
    Should Be Equal    ${rows}[-1][3]    0.00
    ${lines}=    Evaluate    $raw.split('\\r\\n')
    Should Be Equal    ${lines}[-1]    ${EMPTY}    The file must end with CRLF
    ${bare}=    Evaluate    '\\n' in $raw.replace('\\r\\n', '')
    Should Not Be True    ${bare}    A line ends with a bare LF
    Log    ${raw}

TC-W-DEBT-013 Debt names that look like formulas never reach the CSV as formulas
    [Tags]    regression    P1
    Open Finealth Pro    /debt-payoff/
    Rename Debts For Csv
    Field Value Should Be    Debt name    =SUM(A1)    0
    ${f}=    Export Debt Csv
    ${raw}=    Read Text File Raw    ${f}
    Should Not Contain    ${raw}    SUM(A1)
    ${rows}=    Read CSV File    ${f}
    FOR    ${row}    IN    @{rows}
        FOR    ${cell}    IN    @{row}
            Should Not Match Regexp    ${cell}    ^[=+@]    Cell "${cell}" would run as a formula
        END
    END
    ${csv}=    Call Engine    toCsv    ["Debt","Note"]    [["=SUM(A1)","+1"],["@x","-cmd"]]
    Should Be Equal    ${csv}    Debt,Note\r\n'=SUM(A1),'+1\r\n'@x,'-cmd\r\n

TC-W-DEBT-014 CSV quotes commas and quotes, and leaves negative numbers as numbers
    [Tags]    regression    P3
    ${csv}=    Call Engine    toCsv    ["a","b"]    [["x,y","=SUM(A1)"],[-12.5,"say \\"hi\\""]]
    Should Be Equal    ${csv}    a,b\r\n"x,y",'=SUM(A1)\r\n-12.5,"say ""hi"""\r\n
    Open Finealth Pro    /debt-payoff/
    Rename Debts For Csv
    ${f}=    Export Debt Csv
    ${rows}=    Read CSV File    ${f}
    FOR    ${row}    IN    @{rows[1:]}
        FOR    ${cell}    IN    @{row}
            Should Match Regexp    ${cell}    ^-?\\d+(\\.\\d\\d)?$    Cell "${cell}" is not a plain number
        END
    END

TC-W-DEBT-015 Edited debts are saved on the device and come back after a reload
    [Tags]    regression    P2
    Open Finealth    /debt-payoff/
    Set Field    Debt name    Store card    0
    Set Field    Balance    90000    0
    Saved Planner Should Contain    debts    "name":"Store card"    "balance":90000
    Reload And Wait
    Field Value Should Be    Debt name    Store card    0
    Field Value Should Be    Balance    90000    0
    Kpi Should Be    Total owed    ₹3,70,000
    Evidence    After reload: Store card ₹90,000 kept
