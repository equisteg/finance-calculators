*** Settings ***
Documentation     Android app shell (feature: Android app, REQ-015, REQ-014): brand header, splash, status-bar and
...               gesture-bar insets, disclaimer. Runs the screens the Capacitor app ships (apps/mobile/out) in a
...               390 x 844 phone window. Test cases: fragment tests/cases/fragments/android.json.
Resource          ../../resources/api-android.resource
Test Teardown     Close Finealth
Test Tags         android    app

*** Test Cases ***
TC-M-APP-001 App shell shows the brand header and reserves the status-bar and gesture-bar insets
    [Tags]    sanity    regression    P1
    Open Finealth App
    Element Should Be Visible    css=header
    ${brand}=    Get Element Attribute    css=header span.font-serif    textContent
    Should Be Equal    ${brand}    finealth
    Element Should Be Visible    css=header img[alt="Finealth Logo"]
    Image Should Decode    header img[alt="Finealth Logo"]
    ${slug}=    Get Element Attribute    xpath=//header//span[contains(., "/ ")]    textContent
    Should Be Equal    ${slug.strip()}    / wealth
    ${vp}=    Get Element Attribute    css=meta[name="viewport"]    content
    Should Contain    ${vp}    viewport-fit=cover
    Page Should Contain Element    css=header.safe-top
    Page Should Contain Element    css=footer.safe-bottom
    ${pad}=    Get Computed Style    header    padding-top
    Should Match Regexp    ${pad}    ^\\d+(\\.\\d+)?px$
    Page Has No Horizontal Scroll
    Evidence    Brand header, safe-area classes, no sideways scroll

TC-M-APP-002 The splash shows for about two seconds, then the dashboard opens on Wealth → SIP Engine
    [Tags]    regression    P2
    Open Finealth Browser    ${MOBILE_URL}/    ${BROWSER}    ${HEADLESS}    ${DOWNLOADS}    True
    Page Should Contain    Autonomous Wealth Architecture
    Evidence    Splash on launch
    Wait Until Page Does Not Contain    Autonomous Wealth Architecture    5s
    Panel Heading Should Be    SIP Wealth Accumulator
    ${active}=    Get Element Attribute    xpath=//footer//button[.//span[normalize-space(.)="Wealth"]]//span[normalize-space(.)="Wealth"]    class
    Should Contain    ${active}    text-zinc-100
    Evidence    Dashboard after the splash

TC-M-APP-003 Every calculator result screen shows the "Information only" disclaimer
    [Tags]    regression    P1
    [Documentation]    Finance category rule and NFR-010: a disclaimer on every result screen.
    Open Finealth App
    FOR    ${cat}    ${tool}    IN    Wealth    SIP Engine    Wealth    Fixed Deposit    Income    In-Hand Salary    Debts    Loan & EMI    Macro    FIRE Freedom
        Tap Dock    ${cat}
        Tap Tool    ${tool}
        Wait Until Page Contains Element    ${DISCLAIMER}    10s    ${tool} shows a result without the disclaimer (data-testid="disclaimer")
        Scroll Element Into View    ${DISCLAIMER}
        Wait Until Element Is Visible    ${DISCLAIMER}    5s    ${tool}: the disclaimer is in the page but not visible
        Wait Until Element Contains    ${DISCLAIMER}    Information only    5s
        Evidence    ${tool} with its disclaimer
    END

TC-M-APP-004 Native status bar is dark (#0a0a0c) with light icons and never overlaps the header on a real phone
    [Tags]    regression    P2
    [Documentation]    Manual (Automatable N in the sheet): NEEDS HUMAN on a real Android device. The native status bar is
    ...    not part of the web screens this suite runs; the WebdriverIO twin tests/mobile/native/finealth-native.appium.spec.ts
    ...    checks it on a device. Kept here as a documented skip so the sheet's Automation Script resolves.
    Skip    NEEDS HUMAN: real Android device (the status bar is native; see tests/mobile/native)
