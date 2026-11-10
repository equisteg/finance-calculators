*** Settings ***
Documentation     Shared set-up for every Finealth suite: browser, addresses, fields, evidence screenshots.
...               Variables come from run.py (BASE_URL, MOBILE_URL, PRO_URL, PRO_TOKEN, PRO_TOKEN_REFRESH, PRO_TOKEN_EXPIRED,
...               ENV, BROWSER, HEADLESS, SLOW, RESULTS).
...               Finealth is a static Next.js site: every page is a real path with a trailing slash (/health-check/) and
...               renders into <main id="main">. Numbers typed on a page are saved in localStorage (finealth.v1.*).
Library           SeleniumLibrary    timeout=15s    implicit_wait=0s    run_on_failure=Capture Failure Evidence
Library           FinealthLib
Library           Collections
Library           String
Library           OperatingSystem

*** Variables ***
${BASE_URL}       http://127.0.0.1:3100
${MOBILE_URL}     http://127.0.0.1:3101
${PRO_URL}        http://127.0.0.1:3102
${PRO_TOKEN}      ${EMPTY}
${PRO_TOKEN_REFRESH}    ${EMPTY}
${PRO_TOKEN_EXPIRED}    ${EMPTY}
${ENV}            local
${BROWSER}        chrome
${HEADLESS}       False
${SLOW}           0
${RESULTS}        ${OUTPUT_DIR}
${DOWNLOADS}      ${RESULTS}${/}downloads
${ROOT}           ${{ __import__("os").path.normpath(r"${CURDIR}" + "/../../..") }}
${DATA}           ${ROOT}${/}tests${/}testdata
${MAIN}           css=main#main
${DISCLAIMER}     css=[data-testid="disclaimer"]
# The app's splash (apps/mobile/src/components/SplashSequence.tsx): the only element with inline z-index 99999.
# It is in the pre-rendered HTML and is removed from the DOM when the 2.2 s sequence ends.
${APP_SPLASH}     css=body div[style*="z-index:99999"], body div[style*="z-index: 99999"]

*** Keywords ***
Open Finealth
    [Documentation]    Opens the website at ${path} (e.g. / or /health-check/) with a clean browser storage, so every
    ...    test starts from the example household, and keeps a screenshot as evidence.
    [Arguments]    ${path}=/    ${phone}=False    ${dark}=False    ${width}=1366    ${base}=${BASE_URL}    ${keep_storage}=False
    ...    ${reduced_motion}=False
    Open Finealth Browser    ${base}${path}    ${BROWSER}    ${HEADLESS}    ${DOWNLOADS}    ${phone}    ${dark}    ${width}
    ...    reduced_motion=${reduced_motion}
    Set Selenium Speed    ${SLOW}
    IF    not ${keep_storage}
        Clear Site Storage
        Reload Page
    END
    Wait For Page Rendered
    Evidence    Opened ${path}

Open Finealth Pro
    [Documentation]    Opens the test-key Pro build at ${path} with a signed licence stored, as after Restore Pro.
    ...    ${token} defaults to the 6-day token; pass ${PRO_TOKEN_REFRESH} (1 day left) or ${PRO_TOKEN_EXPIRED} for the
    ...    refresh and outage cases, with ${expect_pro}=False when the page is not expected to show Pro.
    ...    ${before_load} runs after the licence is stored and before the page is opened (e.g. Block API Requests).
    ...    Skipped when no Pro build or token is set up (tools/build-pro-site.mjs) or off local (staging's key is not ours).
    [Arguments]    ${path}=/    ${phone}=False    ${token}=${PRO_TOKEN}    ${expect_pro}=True    ${before_load}=${EMPTY}
    Skip If    '${ENV}' != 'local'    Pro cases run only locally: the ${ENV} build trusts its own licence key, not the throwaway test key
    Skip If    '${token}' == ''    No Pro test token: run node tests/automation/tools/build-pro-site.mjs first
    Open Finealth Browser    ${PRO_URL}/    ${BROWSER}    ${HEADLESS}    ${DOWNLOADS}    ${phone}
    Set Selenium Speed    ${SLOW}
    Clear Site Storage
    Seed Pro Licence    ${token}
    IF    '${before_load}' != ''    Run Keyword    ${before_load}
    Go To    ${PRO_URL}${path}
    Wait For Page Rendered
    IF    ${expect_pro}
        Wait Until Page Contains Element    css=[data-testid="pro-badge"]    15s
        Evidence    Opened ${path} with Pro
    ELSE
        Evidence    Opened ${path} with a stored licence
    END

Open Finealth App
    [Documentation]    Opens the Android app's screens (the static export the Capacitor app ships, apps/mobile/out) in
    ...    a 390 x 844 phone window, and waits until the splash (about 2.2 s) has left the page.
    [Arguments]    ${path}=/
    Open Finealth Browser    ${MOBILE_URL}${path}    ${BROWSER}    ${HEADLESS}    ${DOWNLOADS}    True
    Set Selenium Speed    ${SLOW}
    Clear Site Storage
    Reload Page
    Wait Until Page Contains Element    css=body    10s
    Wait Until Page Does Not Contain Element    ${APP_SPLASH}    10s
    Evidence    App opened at ${path}

Close Finealth
    Close All Browsers

Go To Page
    [Arguments]    ${path}    ${base}=${BASE_URL}
    Go To    ${base}${path}
    Wait For Page Rendered

Wait For Page Rendered
    [Documentation]    The page shell is pre-rendered HTML; the client code then fills <main>. Waits for its h1.
    Wait Until Page Contains Element    ${MAIN}    20s
    Wait Until Element Is Visible    css=main#main h1    20s

Evidence
    [Documentation]    A screenshot embedded in log.html, so every important step can be checked afterwards.
    [Arguments]    ${note}=
    IF    '${note}' != ''    Log    ${note}
    Capture Page Screenshot    EMBED

Capture Failure Evidence
    Run Keyword And Ignore Error    Capture Page Screenshot    EMBED

Test Id
    [Documentation]    Locator for an element by its data-testid.
    [Arguments]    ${id}
    RETURN    css=[data-testid="${id}"]

Text Of
    [Documentation]    Visible text of the element with data-testid ${id} (waits until it is visible).
    [Arguments]    ${id}
    Wait Until Element Is Visible    css=[data-testid="${id}"]
    ${t}=    Get Text    css=[data-testid="${id}"]
    RETURN    ${t}

Test Id Should Contain
    [Arguments]    ${id}    ${text}    ${timeout}=10s
    Wait Until Element Contains    css=[data-testid="${id}"]    ${text}    ${timeout}

Test Id Text Should Be
    [Arguments]    ${id}    ${text}    ${timeout}=10s
    Wait Until Element Is Visible    css=[data-testid="${id}"]    ${timeout}
    Wait Until Keyword Succeeds    ${timeout}    0.3s    Element Text Should Be    css=[data-testid="${id}"]    ${text}

Heading Should Contain
    [Arguments]    ${text}    ${level}=1    ${timeout}=15s
    Wait Until Element Is Visible    xpath=//main//h${level}\[contains(normalize-space(.), "${text}")]    ${timeout}

Click Button Named
    [Documentation]    Clicks the button or link whose text or aria-label is ${name} (or starts with it).
    [Arguments]    ${name}
    ${b}=    Set Variable    xpath=(//main//button|//main//a|//header//button|//header//a)[normalize-space(.)="${name}" or @aria-label="${name}" or starts-with(normalize-space(.), "${name}")]
    Wait Until Element Is Visible    ${b}
    Click Centered    ${b}

Main Text Should Contain
    [Arguments]    ${text}    ${timeout}=10s
    Wait Until Element Contains    ${MAIN}    ${text}    ${timeout}

Main Text Should Not Match
    [Documentation]    Fails when the visible text of <main> (lower case) matches the regular expression ${pattern}.
    [Arguments]    ${pattern}
    ${text}=    Get Text    ${MAIN}
    Should Not Match Regexp    ${text.lower()}    ${pattern}

Disclaimer Should Be Visible
    Scroll Element Into View    ${DISCLAIMER}
    Element Should Be Visible    ${DISCLAIMER}
    Element Should Contain    ${DISCLAIMER}    Information only

Page Should Have No Console Problems
    ${problems}=    Get Browser Console Problems
    Should Be Empty    ${problems}    The browser console reported: ${problems}

Page Should Load No Ad Script
    Page Should Not Contain Element    css=#adsbygoogle-js
    Page Should Not Contain Element    css=script[src*="googlesyndication"]

Page Should Pass Axe
    ${violations}=    Run Axe
    Should Be Empty    ${violations}    Serious or critical WCAG issues: ${violations}

Number Of Test Id Should Be
    [Documentation]    The number inside the element with data-testid ${id} equals ${expected} (within ${tolerance}).
    [Arguments]    ${id}    ${expected}    ${tolerance}=0
    ${t}=    Text Of    ${id}
    ${n}=    Number From Text    ${t}
    Should Be True    abs(${n} - ${expected}) <= ${tolerance}    ${id} shows ${t}, expected ${expected}
