*** Settings ***
Documentation     Android app offline use (feature: Android app, REQ-015, NFR-008): every calculator keeps computing on
...               the phone with the network cut (Chrome DevTools Network.emulateNetworkConditions offline).
...               Test cases: fragment tests/cases/fragments/android.json.
Resource          ../../resources/api-android.resource
Test Teardown     Close Finealth
Test Tags         android    offline

*** Test Cases ***
TC-M-OFF-001 With the network cut, SIP, salary, EMI and purchasing power still recalculate with no network errors
    [Tags]    sanity    regression    P1
    Open Finealth App
    Browser Log Lines
    ${online}=    Set Network Offline    True
    Should Not Be True    ${online}    navigator.onLine is still true
    Tap Dock    Wealth
    Tap Tool    SIP Engine
    Set App Slider    0    55000
    Big Figure Should Be    ₹2,77,51,680
    Evidence    SIP offline
    FOR    ${cat}    ${heading}    IN    Income    Annual CTC to Take-Home    Debts    Loan Repayment & EMI    Macro    Purchasing Power Reality
        Tap Dock    ${cat}
        Wait Until Keyword Succeeds    5s    0.2s    Panel Heading Should Be    ${heading}
        ${before}=    Big Figure
        Should Match Regexp    ${before}    ₹[\\d,]+
        ${b}=    Slider Bounds    0
        ${v}=    Evaluate    round(${b}[min] + (${b}[max] - ${b}[min]) * 0.8)
        Set App Slider    0    ${v}
        Wait Until Keyword Succeeds    5s    0.2s    Big Figure Should Change    ${before}
        Evidence    ${cat} offline
    END
    ${lines}=    Browser Log Lines
    ${net}=    Evaluate    [l for l in $lines if __import__('re').search(r'fetch|xhr|err_internet|err_network|networkerror', l, 2)]
    Should Be Empty    ${net}    Network errors while offline: ${net}
    Set Network Offline    False

TC-M-OFF-002 Airplane mode switched on in Android settings: the installed app opens and computes
    [Tags]    regression    P2
    [Documentation]    Manual (Automatable N in the sheet): NEEDS HUMAN on a real Android device. Airplane mode is an OS
    ...    setting a browser cannot switch; TC-M-OFF-001 covers the app's own offline behaviour in this run. Kept here as a
    ...    documented skip so the sheet's Automation Script resolves.
    Skip    NEEDS HUMAN: real Android device (Airplane mode is an Android setting; see tests/mobile/native)

*** Keywords ***
Big Figure Should Change
    [Arguments]    ${before}
    ${now}=    Big Figure
    Should Not Be Equal    ${now}    ${before}
