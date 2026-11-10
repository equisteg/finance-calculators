*** Settings ***
Documentation     Non-functional: reliability (NFR-008 the static pages work when the API is down: all tools usable).
...               Every /api/* request is blocked in the browser (Chrome DevTools Network.setBlockedURLs), as if the
...               Worker were down; TC-N-REL-007 instead makes /api/* answer HTTP 503 with an HTML page (a proxy error).
...               The Pro cases use the test-key build and its three tokens (tools/build-pro-site.mjs): 6 days left,
...               1 day left (inside the 2-day refresh window, so the app asks the API) and expired. Test cases: tests/cases/test-cases.xlsx (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    reliability

*** Test Cases ***
TC-N-REL-001 With /api/* down, the five planners still compute and remember the numbers
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Block API Requests
    Go To Page    /health-check/
    Set Field Safely    in-fund    450000
    Test Id Text Should Be    health-score    85
    Go To Page    /debt-payoff/
    ${before}=    Text Of    debt-free-in
    Set Field Safely    in-extra    10000
    Wait Until Keyword Succeeds    5s    0.3s    Element Text Should Not Be    css=[data-testid="debt-free-in"]    ${before}
    Go To Page    /goal-planner/
    Set Field Safely    in-goal-budget    15000
    Test Id Should Contain    goals-surplus    ₹
    Go To Page    /retirement-planner/
    ${before}=    Text Of    ret-corpus
    Set Field Safely    in-ret-saving    40000
    Wait Until Keyword Succeeds    5s    0.3s    Element Text Should Not Be    css=[data-testid="ret-corpus"]    ${before}
    Go To Page    /loan-prepayment/
    ${before}=    Text Of    tenure-saved
    Set Field Safely    in-lump    500000
    Wait Until Keyword Succeeds    5s    0.3s    Element Text Should Not Be    css=[data-testid="tenure-saved"]    ${before}
    Evidence    Prepayment recomputed with the API blocked
    Go To Page    /health-check/
    Test Id Text Should Be    health-score    85
    Evidence    Health Check kept 85 after navigating, API still blocked

TC-N-REL-002 With /api/* down, every calculator and tool page renders a result
    [Tags]    regression    P1
    Open Finealth    /
    Block API Requests
    ${slugs}=    Get Tool Slugs
    ${broken}=    Create List
    FOR    ${slug}    IN    @{slugs}
        Go To Page    /tools/${slug}/
        Type Into First Number Input    50000
        ${ok}=    Run Keyword And Return Status    Wait Until Element Is Visible    css=[data-testid="tool-primary"]    5s
        IF    not ${ok}
            Append To List    ${broken}    ${slug}
        ELSE
            ${t}=    Get Text    css=[data-testid="tool-primary"]
            IF    $t.strip() == '' or 'NaN' in $t or 'undefined' in $t    Append To List    ${broken}    ${slug} (${t})
        END
    END
    FOR    ${path}    IN    @{CALCULATORS}
        Go To Page    ${path}
        Disclaimer Should Be Visible
        Main Text Should Not Match    \\bnan\\b|\\bundefined\\b
    END
    Evidence    Last calculator with the API blocked
    Should Be Empty    ${broken}    Tools without a result while the API is down: ${broken}

TC-N-REL-003 API unreachable: a Pro user keeps Pro (a valid token needs no API call)
    [Tags]    regression    integration    P1
    Open Finealth Pro    /
    Block API Requests
    Get Network Requests
    Go To Page    /health-check/    ${PRO_URL}
    Wait Until Page Contains Element    css=[data-testid="pro-badge"]    15s
    Element Should Be Visible    css=[data-testid="health-pillars"]
    Wait For Network Idle
    Page Should Load No Ad Script
    Page Should Not Contain    Something went wrong
    ${reqs}=    Get Network Requests
    ${api}=    Evaluate    [r['url'] for r in $reqs if '/api/' in r['url']]
    Should Be Empty    ${api}    A token with more than 2 days left still called the API: ${api}
    Evidence    Pro report shown with the licence API unreachable and no API call

TC-N-REL-005 API unreachable: a token inside the refresh window keeps Pro, with no ads
    [Tags]    regression    integration    P1
    Open Finealth Pro    /health-check/    token=${PRO_TOKEN_REFRESH}    before_load=Block API Requests
    Element Should Be Visible    css=[data-testid="health-pillars"]
    Page Should Not Contain Element    css=[data-testid="health-pro-gate"]
    Page Should Not Contain Element    css=[data-testid="pro-unconfirmed"]
    Wait For Network Idle
    Page Should Load No Ad Script
    ${reqs}=    Get Network Requests
    ${api}=    Evaluate    [r['url'] for r in $reqs if '/api/v1/licence/' in r['url']]
    Should Not Be Empty    ${api}    The app did not try to refresh a token with 1 day left
    Evidence    1 day left, refresh blocked: still Pro, no ad script
    Go To Page    /debt-payoff/    ${PRO_URL}
    Wait Until Page Contains Element    css=[data-testid="pro-badge"]    15s
    Page Should Not Contain Element    css=[data-testid="debt-pro-gate"]
    Wait For Network Idle
    Page Should Load No Ad Script
    Evidence    Debt planner still Pro

TC-N-REL-006 API unreachable: an expired token turns free and unconfirmed, loads no ads and keeps the licence
    [Tags]    regression    integration    P1
    Open Finealth Pro    /health-check/    token=${PRO_TOKEN_EXPIRED}    expect_pro=False    before_load=Block API Requests
    Test Id Text Should Be    pro-unconfirmed    Couldn’t confirm Pro — retrying.    15s
    Page Should Not Contain Element    css=[data-testid="pro-badge"]
    Wait Until Element Is Visible    css=[data-testid="health-pro-gate"]
    Page Should Not Contain Element    css=[data-testid="health-pillars"]
    Wait For Network Idle
    Page Should Load No Ad Script
    ${raw}=    Get Local Storage Item    finealth.pro.v1
    Should Not Be Equal    ${raw}    ${None}    The licence record was removed during an outage
    ${rec}=    Evaluate    __import__('json').loads($raw)
    Should Be Equal    ${rec}[token]    ${PRO_TOKEN_EXPIRED}
    Should Be Equal    ${rec}[key]    pay_TestKey12345678
    Evidence    Expired token, API unreachable: free + retry notice, no ads, licence kept for the next try

TC-N-REL-007 API answers 503 with an HTML page: Pro is kept, the page works and logs no errors
    [Tags]    regression    integration    P2
    Open Finealth Pro    /health-check/    token=${PRO_TOKEN_REFRESH}    before_load=Make API Answer 503 HTML
    ${calls}=    Execute Javascript    return window.__api503Calls || 0
    Should Be True    ${calls} >= 1    The app never asked the API, so the 503 answer was not exercised
    Element Should Be Visible    css=[data-testid="health-pillars"]
    Page Should Not Contain Element    css=[data-testid="pro-unconfirmed"]
    Set Field Safely    in-fund    450000
    Test Id Text Should Be    health-score    85
    Wait For Network Idle
    Page Should Load No Ad Script
    Page Should Not Contain    Something went wrong
    ${raw}=    Get Local Storage Item    finealth.pro.v1
    Should Contain    ${raw}    ${PRO_TOKEN_REFRESH}
    Page Should Have No Console Problems
    Evidence    503 HTML answer: still Pro, score recomputed, no console errors

TC-N-REL-004 With /api/* down, the browser console shows no page errors on the planners
    [Tags]    regression    P2
    Open Finealth    /
    Block API Requests
    ${problems}=    Create Dictionary
    FOR    ${path}    IN    @{PLANNERS}    /    /pricing/
        Go To Page    ${path}
        ${p}=    Get Browser Console Problems
        ${p}=    Evaluate    [m for m in $p if 'ERR_BLOCKED_BY_CLIENT' not in m]
        IF    ${p}    Set To Dictionary    ${problems}    ${path}=${p}
    END
    Evidence    Last page
    Should Be Empty    ${problems}    Console errors while the API is down: ${problems}
