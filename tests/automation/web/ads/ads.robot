*** Settings ***
Documentation     Ads gating (feature: Ads, REQ-013, NFR-005): free visitors get the AdSense loader once, with the
...               publisher listed in ads.txt; Pro users and browsers with an unconfirmed licence load no ad script at
...               all; a production build without slot ids shows no ad box. Real ad units need AdSense slot ids, which
...               are not set on local builds, so where an ad sits is checked only for the absence of boxes here.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    ads

*** Variables ***
${PUB}            pub-1503863859594756

*** Test Cases ***
TC-W-ADS-001 Free plan: the AdSense loader is added once, for the publisher in ads.txt, and no ad sits in a result
    [Tags]    regression    integration    P2
    Open Finealth    /tools/australia-income-tax-calculator/
    Wait Until Page Contains Element    css=script#adsbygoogle-js    10s
    Ad Script Count Should Be    1
    ${src}=    Get Element Attribute    css=script#adsbygoogle-js    src
    Should Be Equal    ${src}    https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${PUB}
    Page Should Not Contain Element    css=[data-testid="tool-result"] ins.adsbygoogle
    Page Should Not Contain Element    css=[data-testid="tool-result"] [aria-label="Advertisement"]
    Evidence    One loader script on a free tool page
    Click Element    xpath=//header//nav[@aria-label="Main"]//a[normalize-space(.)="Health Check"]
    Wait Until Location Contains    /health-check/
    Wait For Page Rendered
    Click Element    xpath=//header//nav[@aria-label="Main"]//a[normalize-space(.)="Debt Planner"]
    Wait Until Location Contains    /debt-payoff/
    Wait For Page Rendered
    Ad Script Count Should Be    1
    Page Should Not Contain Element    css=[data-testid="debt-result"] ins.adsbygoogle
    Evidence    Still one loader after moving between pages

TC-W-ADS-002 Pro: no ad script on any page
    [Tags]    sanity    regression    P1
    Open Finealth Pro    /health-check/
    Wait For Network Idle
    Page Should Load No Ad Script
    # forget the requests of the empty page Open Finealth Pro visits before it stores the licence
    Get Network Requests
    FOR    ${path}    IN    /    /tools/australia-income-tax-calculator/    /debt-payoff/    /pricing/
        Go To Page    ${path}    base=${PRO_URL}
        Pro Badge Should Show
        Wait For Network Idle
        Page Should Load No Ad Script
        Page Should Not Contain Element    css=ins.adsbygoogle
        Page Should Not Contain Element    css=[aria-label="Advertisement"]
    END
    ${reqs}=    Get Network Requests
    ${ads}=    Evaluate    [r['url'] for r in $reqs if 'googlesyndication' in r['url'] or 'doubleclick' in r['url']]
    Should Be Empty    ${ads}    Pro made ad requests: ${ads}
    Evidence    Pro: no ad script, no ad request

TC-W-ADS-003 A stored licence that cannot be confirmed: no ads and no Pro features, with a retry notice
    [Tags]    regression    P2
    Open Finealth Pro    /
    Tamper Pro Token
    Go To Page    /tools/australia-income-tax-calculator/    base=${PRO_URL}
    Test Id Text Should Be    pro-unconfirmed    Couldn’t confirm Pro — retrying.
    Wait For Network Idle
    Page Should Load No Ad Script
    Free Plan Should Show
    Go To Page    /health-check/    base=${PRO_URL}
    Wait Until Element Is Visible    css=[data-testid="health-pro-gate"]
    Page Should Load No Ad Script
    Evidence    Unconfirmed licence: no ads, no Pro

TC-W-ADS-004 ads.txt lists exactly the AdSense publisher the pages use
    [Tags]    regression    P2
    ${txt}=    Fetch OK    /ads.txt
    ${lines}=    Evaluate    [l.strip() for l in $txt.splitlines() if l.strip() and not l.strip().startswith('#')]
    Length Should Be    ${lines}    1
    Should Be Equal    ${lines}[0]    google.com, ${PUB}, DIRECT, f08c47fec0942fa0
    ${r}=    Fetch Text    ${BASE_URL}/ads.txt
    Should Start With    ${r}[headers][content-type]    text/plain

TC-W-ADS-005 A production build without slot ids shows no ad box or placeholder anywhere
    [Tags]    regression    P3
    Open Finealth    /
    FOR    ${path}    IN    /    /health-check/    /tools/australia-income-tax-calculator/    /pricing/
        Go To Page    ${path}
        Wait For Network Idle
        Page Should Not Contain Element    css=[data-testid="ad-placeholder"]
        Page Should Not Contain Element    css=ins.adsbygoogle
        Page Should Not Contain    An AdSense unit shows here
    END
    Evidence    No ad box on a production build without slot ids

TC-W-ADS-006 A browser with a stored licence that cannot be verified gets no ad script
    [Tags]    regression    P3
    Open Finealth    /
    Set Local Storage Item    finealth.pro.v1    {"key":"pay_TestKey12345678","plan":"pro_yearly","token":"a.b"}
    Go To Page    /tools/australia-income-tax-calculator/
    Wait For Network Idle
    Page Should Load No Ad Script
    Free Plan Should Show
    Evidence    Stored but unverifiable licence on the free build: no ad script
