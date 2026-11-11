*** Settings ***
Documentation     Non-functional: privacy (NFR-004 no financial input leaves the device, 0 requests carrying form values;
...               NFR-005 Pro users load no ad script, 0 ad scripts). Distinctive numbers are typed into each planner and
...               calculator, then the browser's network log is searched for them. Test cases: tests/cases/test-cases.xlsx
...               (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    privacy

*** Test Cases ***
TC-N-PRIV-001 Health Check: typed income and savings never leave the device
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Set Field Safely    in-income    987613
    Set Field Safely    in-expenses    413579
    Set Field Safely    in-fund    271839
    Set Field Safely    in-invest    3141597
    Test Id Should Contain    tool-kpis    ₹
    Local Storage Should Contain Text    987613
    Evidence    Distinctive numbers typed; score recomputed
    Reload Page
    Wait For Page Rendered
    Wait Until Keyword Succeeds    5s    0.3s    Field Value Should Be    in-income    987613
    Field Value Should Be    in-expenses    413579
    Field Value Should Be    in-fund    271839
    Field Value Should Be    in-invest    3141597
    Evidence    Reloaded: the typed numbers come back from the device
    Non GET Requests Should Be None    987613    413579    271839    3141597

TC-N-PRIV-002 Debt Payoff: typed balances, rates and extra payment never leave the device
    [Tags]    regression    P1
    Open Finealth    /debt-payoff/
    Set Field Safely    BALANCE    86421    0
    Set Field Safely    MINIMUM    4377    0
    Set Field Safely    in-extra    5813
    Local Storage Should Contain Text    86421
    Evidence    Debts edited
    Non GET Requests Should Be None    86421    4377    5813

TC-N-PRIV-003 Goal Planner: typed goal cost and monthly budget never leave the device
    [Tags]    regression    P1
    Open Finealth    /goal-planner/
    Set Field Safely    COST TODAY    2468013    0
    Set Field Safely    in-goal-budget    43219
    Local Storage Should Contain Text    2468013
    Evidence    Goal edited
    Non GET Requests Should Be None    2468013    43219

TC-N-PRIV-004 Retirement and Loan Prepayment: typed savings and loan balance never leave the device
    [Tags]    regression    P1
    Open Finealth    /retirement-planner/
    Set Field Safely    SAVED SO FAR    813577
    Set Field Safely    in-ret-saving    27913
    Local Storage Should Contain Text    813577
    Evidence    Retirement edited
    Go To Page    /loan-prepayment/
    ${before}=    Text Of    tool-kpis
    Set Field Safely    in-outstanding    2513579
    Set Field Safely    in-lump    213457
    Wait Until Keyword Succeeds    5s    0.3s    Element Text Should Not Be    css=[data-testid="tool-kpis"]    ${before}
    Evidence    Prepayment edited
    Non GET Requests Should Be None    813577    27913    2513579    213457

TC-N-PRIV-005 Every calculator and tool: a typed amount never leaves the device and nothing is sent
    [Tags]    regression    P1
    Open Finealth    /tools/
    ${slugs}=    Get Tool Slugs
    ${n}=    Get Length    ${slugs}
    Should Be True    ${n} >= 36    Only ${n} tools listed
    ${typed}=    Set Variable    ${0}
    FOR    ${slug}    IN    @{slugs}
        Go To Page    /tools/${slug}/
        ${ok}=    Type Into First Number Input    917353
        IF    ${ok}
            ${typed}=    Evaluate    ${typed} + 1
        END
    END
    ${moved}=    Create List
    FOR    ${path}    ${label}    ${value}    IN
    ...    /emi-calculator/    Borrowing Principal    4370000
    ...    /sip-calculator/    Monthly Deposit    17500
    ...    /compound-interest/    Initial Principal    735000
        Go To Page    ${path}
        Set Range    ${label}    ${value}
        ${v}=    Get Field Value    ${label}
        Append To List    ${moved}    ${v}
    END
    Evidence    Last calculator
    Log    Typed 917353 into ${typed} of ${n} tools; sliders at ${moved}
    Should Be True    ${typed} >= 30    Only ${typed} tools took the typed amount
    Non GET Requests Should Be None    917353    @{moved}

TC-N-PRIV-006 Pro build: no AdSense script on six pages, while the free build loads it
    [Tags]    regression    integration    P1
    Open Finealth    /
    Wait Until Page Contains Element    css=#adsbygoogle-js    10s
    Evidence    Free build: the AdSense loader is present (control)
    Close Finealth
    Open Finealth Pro    /
    ${before_seed}=    Get Network Requests    # flush: the very first load ran before the licence was stored
    FOR    ${path}    IN    /    /health-check/    /debt-payoff/    /retirement-planner/    /tools/    /emi-calculator/
        Go To Page    ${path}    ${PRO_URL}
        Sleep    1s    reason=give the ad loader time to run if it were going to
        Page Should Load No Ad Script
    END
    ${reqs}=    Get Network Requests
    ${ads}=    Evaluate    [r['url'] for r in $reqs if 'googlesyndication' in r['url'] or 'doubleclick' in r['url'] or 'adservice' in r['url']]
    Should Be Empty    ${ads}    Pro user downloaded ad resources: ${ads}
    Evidence    Pro build: 0 ad scripts

TC-N-PRIV-007 Everything the app keeps stays in finealth.* browser storage
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Set Field Safely    in-income    123457
    FOR    ${path}    IN    @{PLANNERS}
        Go To Page    ${path}
    END
    ${keys}=    Get Local Storage Keys
    Log    ${keys}
    Should Not Be Empty    ${keys}
    ${outside}=    Local Storage Keys Outside Namespace
    Should Be Empty    ${outside}    Keys outside finealth.*: ${outside}
    ${cookies}=    Get Cookies    as_dict=True
    Should Be Empty    ${cookies}    The site set cookies: ${cookies}
