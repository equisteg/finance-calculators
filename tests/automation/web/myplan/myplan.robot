*** Settings ***
Documentation     My Plan (feature: My Plan, REQ-009 local storage, backup and restore; REQ-010 progress snapshots, Pro):
...               numbers saved in this browser, the real Download backup button, Restore from file with the files in
...               tests/testdata/web/backups/, corrupt storage, Delete my data, and Pro snapshots with CSV export.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    myplan

*** Variables ***
${HEALTH_70K}     {"monthlyIncome":100000,"monthlyExpenses":70000,"monthlyDebtPayments":15000,"emergencyFund":225000,"costlyDebt":60000,"investments":1200000,"age":35,"dependents":2,"lifeCover":5000000,"hasHealthCover":true}
${SNAPSHOTS}      [{"at":"2026-09-01T10:00:00.000Z","score":60,"pillars":{"savings":10,"emergency":8,"debtLoad":12,"costlyDebt":10,"retirement":10,"protection":10},"currency":"INR","netWorth":1000000},{"at":"2026-10-01T10:00:00.000Z","score":75,"pillars":{"savings":15,"emergency":10,"debtLoad":15,"costlyDebt":10,"retirement":15,"protection":10},"currency":"INR","netWorth":1365000}]

*** Test Cases ***
TC-W-PLAN-001 Numbers typed in the Health Check are still there after a reload
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Test Id Text Should Be    health-score    75
    Set Field    in-expenses    70000
    Test Id Text Should Be    health-score    68
    Evidence    Spending changed to 70,000: score 68
    Reload Page
    Wait For Page Rendered
    Field Value Should Be    in-expenses    70000
    Test Id Text Should Be    health-score    68
    Test Id Text Should Be    health-grade    Good
    Page Should Not Contain    The numbers below are an example household
    ${raw}=    Get Local Storage Item    finealth.v1.health
    ${h}=    Evaluate    json.loads($raw)    json
    Should Be Equal As Numbers    ${h}[monthlyExpenses]    70000
    Evidence    After the reload: 70,000 and score 68 kept

TC-W-PLAN-002 Download backup saves every plan in one Finealth JSON file
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Set Local Storage Item    finealth.v1.health    ${HEALTH_70K}
    Set Local Storage Item    finealth.theme    dark
    Go To Page    /my-plan/
    Clear Folder    ${DOWNLOADS}
    ${t0}=    Get Epoch Time
    Click Element    css=[data-testid="backup-download"]
    ${file}=    Wait For New Download    ${DOWNLOADS}    .json    since=${t0}
    ${today}=    Evaluate    __import__('datetime').datetime.utcnow().strftime('%Y-%m-%d')
    Should End With    ${file}    finealth-backup-${today}.json
    ${b}=    Read JSON File    ${file}
    Should Be Equal    ${b}[app]    finealth
    Should Be Equal As Integers    ${b}[version]    1
    Should Match Regexp    ${b}[exportedAt]    ^\\d{4}-\\d\\d-\\d\\dT
    Should Be Equal As Numbers    ${b}[data][health][monthlyExpenses]    70000
    Should Not Contain    ${b}[data]    theme
    Dictionary Should Not Contain Key    ${b}    finealth.pro.v1
    Evidence    Backup downloaded: ${file}

TC-W-PLAN-003 Restoring a valid backup brings back all four plans
    [Tags]    sanity    regression    P1
    Open Finealth    /my-plan/
    Restore Backup File    ${BACKUPS}${/}valid-backup.json
    Restore Message Should Be    Restored: health, debts, goals, retirement. Open any tool to see your numbers.
    Evidence    Restore message lists the four sections
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    92
    Test Id Text Should Be    health-grade    Excellent
    Field Value Should Be    in-income    150000
    Go To Page    /debt-payoff/
    Test Id Should Contain    tool-kpis    ₹3,00,000
    Test Id Text Should Be    debt-free-in    2 yr 0 mo
    Go To Page    /goal-planner/
    Test Id Should Contain    goal-0-result    Will cost ₹3,37,080 in 2 years. Save ₹10,824 a month.
    Go To Page    /retirement-planner/
    Test Id Should Contain    tool-kpis    ₹4,28,63,400
    Evidence    Restored numbers shown in the planners

TC-W-PLAN-004 A backup with one invalid section restores the valid ones and skips the bad one
    [Tags]    regression    P2
    Open Finealth    /my-plan/
    Restore Backup File    ${BACKUPS}${/}one-invalid-section.json
    Restore Message Should Be    Restored: health, debts. Open any tool to see your numbers.
    ${goals}=    Get Local Storage Item    finealth.v1.goals
    Should Be Equal    ${goals}    ${None}
    Evidence    Goals skipped
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    92
    Go To Page    /goal-planner/
    Test Id Should Contain    tool-kpis    1 of 3
    Test Id Should Contain    goal-0-result    Will cost ₹30,07,261 in 7 years.
    Evidence    Goal planner still shows the example goals

TC-W-PLAN-005 A JSON file from another app is refused and nothing changes
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Set Local Storage Item    finealth.v1.health    ${HEALTH_70K}
    Go To Page    /my-plan/
    Restore Backup File    ${BACKUPS}${/}not-finealth.json
    Restore Message Should Be    That file is not a Finealth backup.
    Element Attribute Value Should Be    ${STATUS}    class    notice mt-4 mb-0 notice-danger
    Evidence    Refused: not a Finealth backup
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    68

TC-W-PLAN-006 A file that is not JSON is refused with its own message
    [Tags]    regression    P2
    Open Finealth    /my-plan/
    Restore Backup File    ${BACKUPS}${/}not-json.json
    Restore Message Should Be    That file is not a Finealth backup (it is not valid JSON).
    ${keys}=    Get Local Storage Keys
    ${data}=    Evaluate    [k for k in $keys if k.startswith('finealth.v1.')]
    Should Be Empty    ${data}
    Evidence    Refused: not valid JSON
    Page Should Have No Console Problems

TC-W-PLAN-007 A Finealth backup whose every section is invalid restores nothing
    [Tags]    regression    P3
    Open Finealth    /my-plan/
    Restore Backup File    ${BACKUPS}${/}all-invalid.json
    Restore Message Should Be    The backup had nothing we could restore.
    ${keys}=    Get Local Storage Keys
    ${data}=    Evaluate    [k for k in $keys if k.startswith('finealth.v1.')]
    Should Be Empty    ${data}
    Evidence    Nothing restored

TC-W-PLAN-008 A backup larger than 2 MB is refused before it is read
    [Tags]    regression    P3
    ${big}=    Write Big File    ${OUTPUT_DIR}${/}big-backup.json    2.1
    Open Finealth    /my-plan/
    Restore Backup File    ${big}
    Restore Message Should Be    That file is too large to be a Finealth backup.
    Evidence    Too large
    Remove File    ${big}

TC-W-PLAN-009 Corrupt saved data falls back to the example household on every planner without errors
    [Tags]    regression    P2
    Open Finealth    /
    Set Local Storage Item    finealth.v1.health    {not json
    Set Local Storage Item    finealth.v1.debts    [{"id":1,"name":5}]
    Set Local Storage Item    finealth.v1.goals    "x"
    Set Local Storage Item    finealth.v1.retirement    [1,2]
    Set Local Storage Item    finealth.v1.snapshots    {}
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    75
    Main Text Should Contain    The numbers below are an example household
    Go To Page    /debt-payoff/
    Test Id Should Contain    tool-kpis    ₹3,60,000
    Go To Page    /goal-planner/
    Test Id Should Contain    tool-kpis    1 of 3
    Go To Page    /retirement-planner/
    Test Id Should Contain    tool-kpis    28 yr
    Go To Page    /my-plan/
    Element Should Be Visible    css=[data-testid="backup-download"]
    Evidence    Every planner shows the example after corrupt storage
    Page Should Have No Console Problems

TC-W-PLAN-010 Delete my data removes every saved number but keeps the Pro licence and theme
    [Tags]    regression    P2
    Open Finealth    /
    Set Local Storage Item    finealth.v1.health    ${HEALTH_70K}
    Set Local Storage Item    finealth.v1.snapshots    ${SNAPSHOTS}
    Set Local Storage Item    finealth.pro.v1    {"key":"pay_TestKey12345678","plan":"pro_yearly","token":"x.y"}
    Set Local Storage Item    finealth.theme    dark
    Go To Page    /my-plan/
    Click Button Named    Delete my data
    ${msg}=    Handle Alert    ACCEPT
    Should Be Equal    ${msg}    Delete every number Finealth saved in this browser? Your Pro licence stays.
    Restore Message Should Be    Everything Finealth saved in this browser is deleted.
    ${keys}=    Get Local Storage Keys
    ${data}=    Evaluate    [k for k in $keys if k.startswith('finealth.v1.')]
    Should Be Empty    ${data}
    List Should Contain Value    ${keys}    finealth.pro.v1
    List Should Contain Value    ${keys}    finealth.theme
    Evidence    Data deleted, licence and theme kept
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    75

TC-W-PLAN-011 Cancelling Delete my data keeps everything
    [Tags]    regression    P3
    Open Finealth    /
    Set Local Storage Item    finealth.v1.health    ${HEALTH_70K}
    Go To Page    /my-plan/
    Click Button Named    Delete my data
    Handle Alert    DISMISS
    Page Should Not Contain Element    ${STATUS}
    ${h}=    Get Local Storage Item    finealth.v1.health
    Should Be Equal    ${h}    ${HEALTH_70K}
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    68
    Evidence    Nothing deleted after Cancel

TC-W-PLAN-012 Pro: Save snapshot on the Health Check shows the latest score on My Plan
    [Tags]    sanity    regression    P1
    Open Finealth Pro    /health-check/
    Click Element    css=[data-testid="save-snapshot"]
    Main Text Should Contain    Snapshot saved on this device. See your progress on My Plan.
    Evidence    Snapshot saved
    Click Element    xpath=//main//p[@role="status"]//a[normalize-space(.)="My Plan"]
    Wait Until Location Contains    /my-plan/
    Wait For Page Rendered
    Test Id Should Contain    myplan-latest    75
    Test Id Should Contain    myplan-progress    +0 pts
    Test Id Should Contain    myplan-progress    ₹13,65,000
    ${raw}=    Get Local Storage Item    finealth.v1.snapshots
    ${s}=    Evaluate    json.loads($raw)    json
    Length Should Be    ${s}    1
    Should Be Equal As Integers    ${s}[0][score]    75
    Evidence    My Plan: latest score 75

TC-W-PLAN-013 Free plan: progress tracking is behind the Pro gate while backup stays available
    [Tags]    regression    P2
    Open Finealth    /
    Set Local Storage Item    finealth.v1.snapshots    ${SNAPSHOTS}
    Go To Page    /my-plan/
    Wait Until Page Contains Element    css=[data-testid="myplan-pro-gate"]
    Element Should Contain    css=[data-testid="myplan-pro-gate"]    Progress tracking
    Element Should Contain    css=[data-testid="myplan-pro-gate"]    See Pro plans
    Element Should Contain    css=[data-testid="myplan-pro-gate"]    I already have Pro
    Page Should Not Contain Element    css=[data-testid="myplan-progress"]
    Page Should Not Contain Element    css=[data-testid="export-progress-csv"]
    Element Should Be Visible    css=[data-testid="backup-download"]
    Element Should Be Visible    xpath=//main//button[normalize-space(.)="Restore from file"]
    Go To Page    /health-check/
    Page Should Not Contain Element    css=[data-testid="save-snapshot"]
    Evidence    Free: Pro gate on progress, backup available

TC-W-PLAN-014 Pro with no snapshots: My Plan says so and links to the Health Check
    [Tags]    regression    P2
    Open Finealth Pro    /my-plan/
    Test Id Should Contain    myplan-progress    No snapshots yet. Run the Health Check and press Save snapshot.
    Page Should Not Contain Element    css=[data-testid="export-progress-csv"]
    Click Element    xpath=//*[@data-testid="myplan-progress"]//a[normalize-space(.)="Health Check"]
    Wait Until Location Contains    /health-check/
    Wait For Page Rendered
    Evidence    Link opened the Health Check

TC-W-PLAN-015 Pro with two snapshots: change, chart, CSV export and Delete snapshots
    [Tags]    regression    P2
    Open Finealth Pro    /
    Set Local Storage Item    finealth.v1.snapshots    ${SNAPSHOTS}
    Go To Page    /my-plan/    base=${PRO_URL}
    Wait Until Page Contains Element    css=[data-testid="pro-badge"]
    Test Id Should Contain    myplan-latest    75
    Test Id Should Contain    myplan-progress    +15 pts
    Page Should Contain Element    css=[data-testid="myplan-progress"] [aria-label="Health score over time"]
    Evidence    Two snapshots: +15 pts and the chart
    Clear Folder    ${DOWNLOADS}
    ${t0}=    Get Epoch Time
    Click Centered    css=[data-testid="export-progress-csv"]
    ${file}=    Wait For New Download    ${DOWNLOADS}    .csv    since=${t0}
    Should End With    ${file}    finealth-progress.csv
    ${rows}=    Read CSV File    ${file}
    Length Should Be    ${rows}    3
    Should Be Equal    ${rows}[0][0]    Date
    Should Be Equal    ${rows}[0][1]    Score
    Should Be Equal    ${rows}[1][0]    2026-09-01
    Should Be Equal    ${rows}[1][1]    60
    Should Be Equal    ${rows}[2][0]    2026-10-01
    Should Be Equal    ${rows}[2][1]    75
    Click Button Named    Delete snapshots
    Handle Alert    ACCEPT
    Test Id Should Contain    myplan-progress    No snapshots yet.
    ${raw}=    Get Local Storage Item    finealth.v1.snapshots
    Should Be Equal    ${raw}    []
    Evidence    Snapshots deleted
