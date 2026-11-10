*** Settings ***
Documentation     Home page (feature: Home, REQ-025 with REQ-022 to REQ-024): hero with the live example score, proof strip,
...               planners, how it works, market reference values, quick calculators, popular calculators, Free vs Pro,
...               privacy promise, questions and the final call to action.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-home.json).
Resource          ../../resources/common.resource
Test Teardown     Close Finealth
Test Tags         web    home

*** Variables ***
${HERO}           css=[data-testid="home-hero"]
${BENTO}          css=[data-testid="planner-bento"]

*** Test Cases ***
TC-W-HOM-001 Hero shows the promise, two actions and a live example score from the engine
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Element Should Contain    ${HERO} h1    Know your money's health
    Element Should Contain    ${HERO} h1    in two minutes.
    Element Should Contain    ${HERO}    Nothing you type leaves your device.
    Element Text Should Be    css=[data-testid="hero-start"]    Start free health check
    Element Text Should Be    css=[data-testid="hero-tools"]    See all calculators
    Evidence    Headline and the two actions
    Element Should Contain    css=[data-testid="hero-card"] figcaption    EXAMPLE HOUSEHOLD
    Element Attribute Value Should Be    css=[data-testid="hero-card"] figure[role="img"]    aria-label    Score 75 out of 100, Good
    Test Id Text Should Be    hero-grade    Good
    Element Should Contain    css=[data-testid="hero-card"]    ₹25,000
    Element Should Contain    css=.hero-stats    25 %
    Element Should Contain    css=.hero-stats    3.0 mo
    Element Should Contain    css=.hero-stats    15 %
    Test Id Should Contain    hero-top-action    TOP PRIORITY · +10 PTS
    Test Id Should Contain    hero-top-action    Build your emergency fund
    Evidence    Live example card: 75 Good, three figures, top priority
    ${chips}=    Get Element Count    css=[data-testid="hero-trust"] li
    Should Be Equal As Integers    ${chips}    4
    Element Should Contain    css=[data-testid="hero-trust"]    No login, no bank link
    Element Should Contain    css=[data-testid="hero-trust"]    Pro from ₹17 a month
    Page Should Contain Element    css=main h1    limit=1
    Page Should Have No Console Problems

TC-W-HOM-002 The two hero actions open the Health Check and All tools
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Click Element    css=[data-testid="hero-start"]
    Wait Until Location Contains    /health-check/
    Heading Should Contain    Financial Health Check
    Test Id Text Should Be    health-score    75
    Evidence    Start free health check opened the Health Check with the example household
    Go Back
    Wait For Page Rendered
    Click Element    css=[data-testid="hero-tools"]
    Wait Until Location Contains    /tools/
    Heading Should Contain    Every money tool
    Evidence    See all calculators opened All tools

TC-W-HOM-003 Proof strip states four facts and the calculator count matches the tools library
    [Tags]    regression    P2
    Open Finealth    /
    ${n}=    Get Element Count    css=[data-testid="proof-strip"] .proof-item
    Should Be Equal As Integers    ${n}    4
    Element Text Should Be    css=[data-testid="proof-strip"] .proof-item:nth-child(1) .proof-value    6
    Element Should Contain    css=[data-testid="proof-strip"] .proof-item:nth-child(1)    planners for debts, goals and retirement
    ${count}=    Get Text    css=[data-testid="proof-strip"] .proof-item:nth-child(2) .proof-value
    Should Match Regexp    ${count}    ^\\d+\\+$    The calculator fact reads "${count}", expected N+
    Element Should Contain    css=[data-testid="proof-strip"] .proof-item:nth-child(2)    calculators, free to use
    Element Text Should Be    css=[data-testid="proof-strip"] .proof-item:nth-child(3) .proof-value    0
    Element Should Contain    css=[data-testid="proof-strip"] .proof-item:nth-child(3)    numbers sent to a server
    Element Text Should Be    css=[data-testid="proof-strip"] .proof-item:nth-child(4) .proof-value    2 min
    Element Should Contain    css=[data-testid="proof-strip"] .proof-item:nth-child(4)    to your first score
    Evidence    Proof strip
    Go To Page    /tools/
    ${cards}=    Get Element Count    css=[data-testid^="tool-card-"]
    Should Be Equal    ${count}    ${cards}+    The strip says ${count} but All tools lists ${cards} tools

TC-W-HOM-004 Planners grid links all six planners with their free limits, and each link opens its planner
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Heading Should Contain    Six planners,    level=2
    ${links}=    Get Element Count    ${BENTO} a
    Should Be Equal As Integers    ${links}    6
    Element Should Contain    css=.b-debt    FREE · 3 DEBTS
    Element Should Contain    css=.b-goals    FREE · 1 GOAL
    Element Should Contain    css=.b-retire    FREE + PRO
    Element Should Contain    css=.b-health    Savings rate
    Element Should Contain    css=.b-health    Insurance
    Evidence    Six planner cards with their tags
    FOR    ${href}    ${heading}    IN
    ...    /health-check/    Financial Health Check
    ...    /debt-payoff/    Debt Payoff Planner
    ...    /goal-planner/    Goal Planner
    ...    /loan-prepayment/    Loan Prepayment
    ...    /retirement-planner/    Retirement Planner
    ...    /my-plan/    My Plan
        Go To Page    /
        Click Centered    css=[data-testid="planner-bento"] a[href="${href}"]
        Wait Until Location Contains    ${href}
        Heading Should Contain    ${heading}
    END
    Evidence    Last planner opened from the grid

TC-W-HOM-005 How it works shows three numbered steps from numbers to a plan
    [Tags]    regression    P3
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="how-it-works"]
    Heading Should Contain    From ten numbers    level=2
    ${steps}=    Get Element Count    css=[data-testid="how-it-works"] ol > li
    Should Be Equal As Integers    ${steps}    3
    Element Should Contain    css=[data-testid="how-it-works"] li:nth-child(1)    Type ten numbers
    Element Should Contain    css=[data-testid="how-it-works"] li:nth-child(2)    Get your score
    Element Should Contain    css=[data-testid="how-it-works"] li:nth-child(3)    Follow the plan
    Evidence    Three steps

TC-W-HOM-006 Market values are labelled as stored reference values, with units, change and a history
    [Tags]    regression    P2
    Open Finealth    /
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

TC-W-HOM-007 Changing the city changes the market heading and keeps the values in rupees
    [Tags]    regression    P3
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="markets"]
    Select From List By Value    css=select[aria-label="City"]    Delhi
    Wait Until Element Contains    css=\#markets-title    in Delhi
    Element Should Contain    css=[data-testid="asset-card"]:nth-child(1)    ₹
    Evidence    Market heading follows the city

TC-W-HOM-008 Switching the header currency to GBP rebases markets and quick calculators to the United Kingdom
    [Tags]    regression    P2
    Open Finealth    /
    Select From List By Value    css=header select[aria-label="Currency"]    GBP
    Wait Until Element Contains    css=\#markets-title    in United Kingdom
    Wait Until Element Contains    css=\#quick-title    for United Kingdom
    Element Should Contain    css=[data-testid="quick-calcs"]    Stamp Duty (SDLT)
    Element Should Not Contain    css=[data-testid="quick-calcs"]    GST (CGST + SGST Split)
    Element Should Contain    css=[data-testid="quick-calcs"]    £
    Element Should Contain    css=[data-testid="markets"]    FTSE 100
    Evidence    UK markets and calculators
    Element Should Contain    css=[data-testid="plan-pro-price"]    US$7.99
    ${selects}=    Get Element Count    css=select[aria-label="Currency"]
    Should Be Equal As Integers    ${selects}    1    There is one region control (the header Currency)

TC-W-HOM-009 Quick EMI calculator gives the exact instalment and follows the sliders
    [Tags]    sanity    regression    P1
    Open Finealth    /
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

TC-W-HOM-010 Popular calculators lists the three calculator pages first, six library tools and a link to all tools
    [Tags]    regression    P2
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="popular-tools"]
    ${links}=    Get Element Count    css=nav[aria-label="Popular calculators"] a
    Should Be Equal As Integers    ${links}    9
    Element Attribute Value Should Be    css=nav[aria-label="Popular calculators"] a:nth-child(1)    href    ${BASE_URL}/sip-calculator/
    Element Attribute Value Should Be    css=nav[aria-label="Popular calculators"] a:nth-child(2)    href    ${BASE_URL}/emi-calculator/
    Element Attribute Value Should Be    css=nav[aria-label="Popular calculators"] a:nth-child(3)    href    ${BASE_URL}/compound-interest/
    Element Should Contain    css=[data-testid="all-tools-link"]    tools →
    Evidence    Popular calculators
    Click Element    css=nav[aria-label="Popular calculators"] a:nth-child(1)
    Wait Until Location Contains    /sip-calculator/
    Heading Should Contain    SIP
    Evidence    SIP calculator opened

TC-W-HOM-011 Free vs Pro shows what each plan includes and the price for the visitor's currency
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="free-vs-pro"]
    Element Should Contain    css=[data-testid="plan-free"]    ₹0
    Element Should Contain    css=[data-testid="plan-free"]    Debt planner for up to 3 debts
    Element Should Contain    css=[data-testid="plan-free"]    Goal planner for 1 goal
    Element Text Should Be    css=[data-testid="plan-pro-price"]    ₹199
    Element Should Contain    css=[data-testid="plan-pro"]    ₹499 once
    ${features}=    Get Element Count    css=[data-testid="plan-pro"] li
    Should Be Equal As Integers    ${features}    7
    Element Should Contain    css=[data-testid="plan-pro"]    Retirement odds.
    Evidence    Free and Pro in rupees
    Click Element    css=[data-testid="plans-pricing"]
    Wait Until Location Contains    /pricing/
    Test Id Text Should Be    price-yearly    ₹199
    Test Id Text Should Be    price-lifetime    ₹499
    Evidence    Pricing shows the same prices

TC-W-HOM-012 Questions open one at a time and the page carries FAQPage structured data
    [Tags]    regression    P2
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="home-faq"]
    ${q}=    Get Element Count    css=[data-testid="home-faq"] details
    Should Be Equal As Integers    ${q}    5
    Element Should Not Be Visible    xpath=//details[summary[.="Is this financial advice?"]]/p
    Click Element    xpath=//summary[.="Is this financial advice?"]
    Wait Until Element Is Visible    xpath=//details[summary[.="Is this financial advice?"]]/p
    Element Should Contain    xpath=//details[summary[.="Is this financial advice?"]]/p    It does not recommend any product
    Evidence    An answer opened
    ${ld}=    Execute Javascript    return JSON.parse([...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent).find(t => t.includes('FAQPage')))
    Should Be Equal    ${ld}[@type]    FAQPage
    Length Should Be    ${ld}[mainEntity]    5

TC-W-HOM-013 The page ends with one call to action and the disclaimer, and never asks to sign in
    [Tags]    regression    P2
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="final-cta"]
    Element Should Contain    css=[data-testid="final-cta"]    Two minutes,
    Element Should Contain    css=[data-testid="final-cta"] a[href="/health-check/"]    Start free health check
    Disclaimer Should Be Visible
    Element Should Contain    ${DISCLAIMER}    not financial, tax, investment or legal advice
    Evidence    Final call to action and disclaimer
    ${page}=    Get Text    css=body
    Should Not Match Regexp    ${page.lower()}    \\b(sign in|log in|sign up|create an account)\\b
    Element Should Contain    css=footer    A product by
    Element Should Contain    css=footer    Equisteg

TC-W-HOM-014 Phone widths 320 and 360 px: no sideways scroll, the example figures fit, markets scroll in one row
    [Tags]    regression    P3
    Open Finealth    /    width=360
    FOR    ${w}    IN    320    360
        Set Window Width    ${w}    800
        Reload Page
        Wait For Page Rendered
        Page Has No Horizontal Scroll
        Elements Should Fit Their Boxes    .hero-stats .stat span
        Evidence    ${w} px
    END
    Scroll Element Into View    css=.asset-rail
    ${display}=    Get Computed Style    .asset-rail    display
    Should Be Equal    ${display}    flex
    ${scrolls}=    Execute Javascript    const r = document.querySelector('.asset-rail'); return r.scrollWidth > r.clientWidth
    Should Be True    ${scrolls}    The market cards should scroll sideways in one row on a phone
    Evidence    Market rail on a phone

TC-W-HOM-015 Keyboard: the market row takes focus and scrolls with the arrow keys
    [Tags]    regression    P3
    Open Finealth    /    width=390
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

TC-W-HOM-016 Dark mode: espresso ground, readable headings and the same sections
    [Tags]    regression    P2
    Open Finealth    /    dark=True
    ${bg}=    Get Computed Style    body    backgroundColor
    Should Be Equal    ${bg}    rgb(20, 17, 14)
    ${fg}=    Get Computed Style    \#planners-title    color
    ${ratio}=    Contrast Ratio    ${fg}    ${bg}
    Should Be True    ${ratio} >= 4.5    Section heading contrast ${ratio}:1 is below 4.5:1
    ${h2}=    Get Element Count    css=main h2
    Should Be Equal As Integers    ${h2}    9
    Evidence    Home in dark mode

TC-W-HOM-017 Sections are never left transparent while scrolling (no faded or hidden content)
    [Tags]    regression    P2
    Open Finealth    /
    Sleep    1s    reason=the hero's own entrance fade (0.7 s) finishes first
    ${faded}=    Execute Javascript
    ...    return [...document.querySelectorAll('main > section, main > section *')].filter(e => parseFloat(getComputedStyle(e).opacity) < 0.99 && e.textContent.trim()).map(e => e.tagName + ' ' + e.textContent.trim().slice(0, 30)).slice(0, 10)
    Should Be Empty    ${faded}    These are transparent before they are scrolled into view: ${faded}
    Page Should Pass Axe
    Evidence    Every section fully visible; axe passes
