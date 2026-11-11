*** Settings ***
Documentation     Quick calculators page /quick-calculators/ (feature: Quick calculators, REQ-026 (with REQ-015, REQ-017 and REQ-024)): market
...               reference values with their history, the six quick calculators for the visitor's country, and the region
...               switch. These sections were on the home page until 11 Nov 2026 (old IDs in each case's Remarks).
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-home.json).
Resource          ../../resources/common.resource
Test Teardown     Close Finealth
Test Tags         web    quick

*** Test Cases ***
TC-W-QCK-001 The page has its own heading, title, canonical and disclaimer, and is linked from the home page and footer
    [Tags]    sanity    regression    P1
    Open Finealth    /quick-calculators/
    Heading Should Contain    Quick calculators    level=1
    ${h1}=    Get Element Count    css=h1
    Should Be Equal As Integers    ${h1}    1
    Title Should Be    Quick calculators: EMI, SIP, income tax, GST/VAT and market prices · Finealth
    Page Should Contain Element    css=head link[rel="canonical"][href$="/quick-calculators/"]
    Disclaimer Should Be Visible
    Element Should Contain    ${DISCLAIMER}    not financial, tax, investment or legal advice
    Page Should Contain Element    css=footer a[href="/quick-calculators/"]
    Evidence    Quick calculators page
    Go To Page    /
    Page Should Contain Element    css=[data-testid="quick-answers-link"][href="/quick-calculators/"]
    # Jump (no smooth scroll) and centre the link, so the click does not land mid-scroll.
    Execute Javascript    document.querySelector('[data-testid="quick-answers-link"]').scrollIntoView({block: 'center', behavior: 'instant'})
    Wait Until Element Is Visible    css=[data-testid="quick-answers-link"]
    Click Element    css=[data-testid="quick-answers-link"]
    Wait Until Location Contains    /quick-calculators/
    Wait Until Element Is Visible    css=[data-testid="quick-calcs"]
    ${order}=    Execute Javascript    return [...document.querySelectorAll('[data-testid="quick-page"] > *')].map(e => e.dataset.testid || e.tagName).join(',')
    Should Match Regexp    ${order}    quick-calcs,disclaimer    The disclaimer must come straight after the calculators (no ad beside a result): ${order}
    ${sitemap}=    Fetch Text    ${BASE_URL}/sitemap.xml
    Should Contain    ${sitemap}[text]    /quick-calculators/</loc>

TC-W-QCK-002 Market values are labelled as stored reference values, with units, change and a history
    [Tags]    regression    P2
    Open Finealth    /quick-calculators/
    Scroll Element Into View    css=[data-testid="markets"]
    Heading Should Contain    Where prices stand    level=2
    Element Should Contain    css=\#markets-title    in Mumbai
    Test Id Text Should Be    engine-badge    REFERENCE VALUES · NOT LIVE
    Element Should Contain    css=[data-testid="markets"]    not live prices
    ${cards}=    Get Element Count    css=[data-testid="asset-card"]
    Should Be Equal As Integers    ${cards}    5
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    Gold (24K Pure)
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    10 grams
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    ₹1,52,890
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    vs reference date
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(4)    NIFTY 50
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(4)    pts
    Evidence    Five India reference cards
    Heading Should Contain    How prices moved over the decades    level=3
    Element Should Contain    css=[data-testid="markets"]    Past prices do not predict future returns.
    Element Should Contain    css=[data-testid="markets"]    Source: India Bullion and Jewellers Association (IBJA)
    Evidence    Price history with its source

TC-W-QCK-003 Changing the city changes the market heading and keeps the values in rupees
    [Tags]    regression    P3
    Open Finealth    /quick-calculators/
    Scroll Element Into View    css=[data-testid="markets"]
    Select From List By Value    css=select[aria-label="City"]    Delhi
    Wait Until Element Contains    css=\#markets-title    in Delhi
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    ₹
    Evidence    Market heading follows the city

TC-W-QCK-004 Switching the header currency to GBP rebases markets and quick calculators to the United Kingdom
    [Tags]    regression    P2
    Open Finealth    /quick-calculators/
    Select From List By Value    css=header select[aria-label="Currency"]    GBP
    Wait Until Element Contains    css=\#markets-title    in United Kingdom
    Wait Until Element Contains    css=\#quick-title    for United Kingdom
    Element Should Contain    css=[data-testid="quick-calcs"]    Stamp Duty (SDLT)
    Element Should Not Contain    css=[data-testid="quick-calcs"]    GST (CGST + SGST Split)
    Element Should Contain    css=[data-testid="quick-calcs"]    £
    Element Should Contain    css=[data-testid="markets"]    FTSE 100
    Evidence    UK markets and calculators
    ${selects}=    Get Element Count    css=select[aria-label="Currency"]
    Should Be Equal As Integers    ${selects}    1    There is one region control (the header Currency)

TC-W-QCK-005 Quick EMI calculator gives the exact instalment and follows the sliders
    [Tags]    sanity    regression    P1
    Open Finealth    /quick-calculators/
    Scroll Element Into View    css=[data-testid="quick-calcs"]
    Element Attribute Value Should Be    xpath=//button[normalize-space(.)="Loan EMI & Amortization"]    aria-pressed    true
    Element Should Contain    css=[data-testid="quick-calcs"]    ₹35,00,000
    Element Should Contain    css=[data-testid="quick-calcs"]    ₹30,374
    Element Should Contain    css=[data-testid="quick-calcs"]    +₹37,89,760
    Evidence    ₹35,00,000 at 8.5 % for 20 years = ₹30,374 a month
    Set Range    Repayment Tenure    10
    Wait Until Element Contains    css=[data-testid="quick-calcs"]    10 Years
    Wait Until Element Contains    css=[data-testid="quick-calcs"]    ₹43,395
    Evidence    10 years = ₹43,395 a month

TC-W-QCK-006 Phone widths 320 and 360 px: no sideways scroll and the market cards scroll in one row
    [Tags]    regression    P3
    Open Finealth    /quick-calculators/    width=360
    FOR    ${w}    IN    320    360
        Set Window Width    ${w}    800
        Reload Page
        Wait For Page Rendered
        Page Has No Horizontal Scroll
        Elements Should Fit Their Boxes    [data-testid="asset-card"] .asset-value
        Evidence    ${w} px
    END
    Scroll Element Into View    css=.asset-rail
    ${display}=    Get Computed Style    .asset-rail    display
    Should Be Equal    ${display}    flex
    ${scrolls}=    Execute Javascript    const r = document.querySelector('.asset-rail'); return r.scrollWidth > r.clientWidth
    Should Be True    ${scrolls}    The market cards should scroll sideways in one row on a phone
    Evidence    Market rail on a phone

TC-W-QCK-007 Keyboard: the market row takes focus and scrolls with the arrow keys
    [Tags]    regression    P3
    Open Finealth    /quick-calculators/    width=390
    Set Window Width    390    800
    Reload Page
    Wait For Page Rendered
    Scroll Element Into View    css=.asset-rail
    Execute Javascript    document.querySelector('.asset-rail').focus()
    Press Keys    None    ARROW_RIGHT    ARROW_RIGHT    ARROW_RIGHT
    Sleep    0.6s    reason=keyboard scrolling is smooth
    ${x}=    Execute Javascript    return document.querySelector('.asset-rail').scrollLeft
    Should Be True    ${x} > 0    Arrow keys did not scroll the market row
    Evidence    Market row scrolled with the keyboard

