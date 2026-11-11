*** Settings ***
Documentation     Restore Pro and the licence token (feature: Pro, REQ-012): a signed token unlocks Pro, a tampered or
...               rolled-back token does not, Restore Pro checks the ID shape before anything is sent, and Pro can be
...               removed. Runs on the test-key Pro build (${PRO_URL}, tests/automation/tools/build-pro-site.mjs), which
...               trusts a throwaway Ed25519 key and has no licence API behind it (so every refresh "cannot be reached").
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    pro

*** Test Cases ***
TC-W-PRO-001 A valid signed token unlocks Pro on every page
    [Tags]    sanity    regression    P1
    Open Finealth Pro    /pro/
    Pro Badge Should Show
    Test Id Should Contain    pro-active    ACTIVE IN THIS BROWSER
    Test Id Should Contain    pro-active    Pro Yearly
    Test Id Should Contain    pro-active    Purchased via Razorpay
    ${exp}=    Evaluate    __import__('json').loads(__import__('base64').urlsafe_b64decode($PRO_TOKEN.split('.')[0] + '=='))['exp']
    ${date}=    Evaluate    __import__('datetime').datetime.utcfromtimestamp(max(${exp} - 172800, __import__('time').time())).strftime('%-d %B %Y')
    Test Id Text Should Be    pro-renews    ${date}
    Evidence    Restore Pro page: active, next check ${date}
    Go To Page    /health-check/    base=${PRO_URL}
    Pro Badge Should Show
    Wait Until Element Is Visible    css=[data-testid="health-pillars"]
    Element Should Be Visible    css=[data-testid="print-report"]
    Element Should Be Visible    css=[data-testid="save-snapshot"]
    Page Should Not Contain Element    css=[data-testid="health-pro-gate"]
    Go To Page    /debt-payoff/    base=${PRO_URL}
    Page Should Not Contain Element    css=[data-testid="debt-pro-gate"]
    Page Should Not Contain Element    css=[data-testid="debt-limit"]
    Evidence    Pro features unlocked

TC-W-PRO-002 A tampered token is not trusted: free plan, no pillars, a quiet retry notice
    [Tags]    sanity    regression    P1
    Open Finealth Pro    /
    Tamper Pro Token
    Go To Page    /health-check/    base=${PRO_URL}
    Free Plan Should Show
    Wait Until Element Is Visible    css=[data-testid="health-pro-gate"]
    Page Should Not Contain Element    css=[data-testid="health-pillars"]
    Page Should Not Contain Element    css=[data-testid="save-snapshot"]
    Test Id Text Should Be    pro-unconfirmed    Couldn’t confirm Pro — retrying.
    Ad Script Count Should Be    0
    Evidence    Tampered token: free plan
    Go To Page    /pro/    base=${PRO_URL}
    Page Should Not Contain Element    css=[data-testid="pro-active"]
    Element Should Be Visible    css=[data-testid="licence-key"]

TC-W-PRO-003 Restore Pro refuses text that is not a payment or subscription ID and sends nothing
    [Tags]    regression    P2
    Open Pro Build Without Licence    /pro/
    Element Should Be Enabled    css=[data-testid="activate-pro"]
    Get Network Requests
    Input Text    css=[data-testid="licence-key"]    hello
    Click Element    css=[data-testid="activate-pro"]
    Test Id Text Should Be    activate-error    Paste the payment ID (pay_…) or subscription ID (sub_…) from your Razorpay receipt.
    ${reqs}=    Get Network Requests
    ${api}=    Evaluate    [r['url'] for r in $reqs if '/api/' in r['url'] or 'hello' in r['url'] or 'hello' in r['body']]
    Should Be Empty    ${api}    A request was sent: ${api}
    ${p}=    Get Local Storage Item    finealth.pro.v1
    Should Be Equal    ${p}    ${None}
    Evidence    Hint shown, no request

TC-W-PRO-004 A device clock set back more than an hour cannot keep an old token alive
    [Tags]    regression    P2
    Open Finealth Pro    /
    ${raw}=    Get Local Storage Item    finealth.pro.v1
    ${later}=    Evaluate    int(__import__('time').time()) + 7200
    ${rec}=    Evaluate    {**__import__('json').loads($raw), 'lastSeen': ${later}}
    ${json}=    Evaluate    __import__('json').dumps($rec)
    Set Local Storage Item    finealth.pro.v1    ${json}
    Go To Page    /health-check/    base=${PRO_URL}
    Free Plan Should Show
    Test Id Text Should Be    pro-unconfirmed    Couldn’t confirm Pro — retrying.
    Page Should Not Contain Element    css=[data-testid="health-pillars"]
    ${after}=    Get Local Storage Item    finealth.pro.v1
    Should Contain    ${after}    "lastSeen": ${later}
    Evidence    Clock behind the last time seen: Pro not trusted until refreshed online

TC-W-PRO-005 A well-formed ID that the licence check cannot confirm shows a calm error and stores nothing
    [Tags]    regression    integration    P2
    Open Pro Build Without Licence    /pro/
    Input Text    css=[data-testid="licence-key"]    pay_ABCDEFGH1234
    Click Element    css=[data-testid="activate-pro"]
    Test Id Text Should Be    activate-error    The licence check is unavailable right now. Please try again shortly.
    ${reqs}=    Get Network Requests
    ${api}=    Evaluate    [r for r in $reqs if r['url'].endswith('/api/v1/licence/verify')]
    Should Not Be Empty    ${api}
    Should Contain    ${api}[0][body]    "key":"pay_ABCDEFGH1234"
    Should Contain    ${api}[0][body]    "activate":true
    ${p}=    Get Local Storage Item    finealth.pro.v1
    Should Be Equal    ${p}    ${None}
    Free Plan Should Show
    Evidence    Unavailable message, nothing stored

TC-W-PRO-006 Remove Pro from this browser returns to the free plan
    [Tags]    regression    P2
    Open Finealth Pro    /pro/
    Click Centered    css=[data-testid="remove-pro"]
    ${msg}=    Handle Alert    ACCEPT
    Should Start With    ${msg}    Remove Pro from this browser?
    Wait Until Element Is Visible    css=[data-testid="licence-key"]
    Free Plan Should Show
    ${p}=    Get Local Storage Item    finealth.pro.v1
    Should Be Equal    ${p}    ${None}
    Evidence    Pro removed

TC-W-PRO-007 On a site without the licence key, Restore Pro is switched off
    [Tags]    regression    P3
    Open Finealth    /pro/
    Element Should Be Disabled    css=[data-testid="activate-pro"]
    Main Text Should Contain    Pro activation is not switched on for this site yet.
    Element Attribute Value Should Be    css=[data-testid="licence-key"]    placeholder    pay_… or sub_…
    Free Plan Should Show
    Evidence    Restore Pro disabled on the build without a licence key

TC-W-PRO-008 A stored licence with an old-format key is ignored without a notice
    [Tags]    regression    P3
    Open Pro Build Without Licence    /
    Set Local Storage Item    finealth.pro.v1    {"key":"GUMROAD-1234-5678","plan":"pro_yearly","token":"${PRO_TOKEN}"}
    Go To Page    /health-check/    base=${PRO_URL}
    Free Plan Should Show
    Page Should Not Contain Element    css=[data-testid="pro-unconfirmed"]
    Page Should Not Contain Element    css=[data-testid="health-pillars"]
    Evidence    Old key format: free plan, no notice
