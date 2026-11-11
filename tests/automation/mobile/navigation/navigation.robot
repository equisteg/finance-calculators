*** Settings ***
Documentation     Android app bottom dock and tool bar (feature: Android app, REQ-015): switching categories without a
...               reload and keeping what was typed. Test cases: fragment tests/cases/fragments/android.json.
Resource          ../../resources/api-android.resource
Test Teardown     Close Finealth
Test Tags         android    navigation

*** Test Cases ***
TC-M-NAV-001 The bottom dock opens each category's first tool without reloading the app
    [Tags]    sanity    regression    P1
    Open Finealth App
    Mark Document
    FOR    ${label}    ${slug}    ${heading}    IN
    ...    Income    / income    Annual CTC to Take-Home
    ...    Debts    / debts    Loan Repayment & EMI
    ...    Macro    / macro    Purchasing Power Reality
    ...    Wealth    / wealth    SIP Wealth Accumulator
        Tap Dock    ${label}
        Wait Until Keyword Succeeds    5s    0.2s    Panel Heading Should Be    ${heading}
        ${s}=    Get Element Attribute    xpath=//header//span[contains(., "/ ")]    textContent
        Should Be Equal    ${s.strip()}    ${slug}
        ${cls}=    Get Element Attribute    xpath=//footer//button//span[normalize-space(.)="${label}"]    class
        Should Contain    ${cls}    text-zinc-100
        Evidence    ${label}
    END
    Document Should Not Have Reloaded

TC-M-NAV-002 A value typed in SIP is still there after visiting every other category
    [Tags]    regression    P1
    Open App Tool    Wealth    SIP Engine    SIP Wealth Accumulator
    Set App Slider    0    42500
    Result Row Should Be    Total Invested    ₹76,50,000
    FOR    ${label}    IN    Income    Debts    Macro    Wealth
        Tap Dock    ${label}
    END
    Wait Until Keyword Succeeds    5s    0.2s    Panel Heading Should Be    SIP Wealth Accumulator
    Result Row Should Be    Total Invested    ₹76,50,000
    Big Figure Should Be    ₹2,14,44,480
    Evidence    ₹42,500 kept after a round trip

TC-M-NAV-003 Each category's tool bar lists its tools, and tapping a tool opens it and names it in the header
    [Tags]    regression    P3
    Open Finealth App
    FOR    ${cat}    ${tools}    IN
    ...    Wealth    SIP Engine|Lump Sum|SWP Cashflow|Fixed Deposit
    ...    Income    In-Hand Salary|Tax: New vs Old|GST Calculator
    ...    Debts    Loan & EMI|Loan Compare
    ...    Macro    Purchasing Power|FIRE Freedom
        Tap Dock    ${cat}
        ${names}=    Execute Javascript    return [...document.querySelectorAll('header button')].map(b => b.textContent.trim()).join('|')
        Should Be Equal    ${names}    ${tools}
    END
    Tap Dock    Debts
    Tap Tool    Loan Compare
    ${id}=    Get Element Attribute    css=header span.uppercase.text-zinc-400    textContent
    Should Be Equal    ${id}    loancompare
    Evidence    Loan Compare open
