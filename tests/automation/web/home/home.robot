*** Settings ***
Documentation     Home page (feature: Home, REQ-025 with REQ-022 to REQ-024): a landing page only. Hero with the live
...               example score, proof strip, planners, how it works, popular calculators, the quick calculators card, Free vs
...               Pro, privacy promise, questions and the final call to action. Markets and quick calculators: ../quick/.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-home.json).
Resource          ../../resources/common.resource
Test Teardown     Close Finealth
Test Tags         web    home

*** Variables ***
${HERO}           css=[data-testid="home-hero"]
${BENTO}          css=[data-testid="planner-bento"]
@{HOME_SECTIONS}    home-hero    proof-strip    planners-title    how-it-works    popular-tools    quick-answers    free-vs-pro    privacy-promise    home-faq    final-cta

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
    Element Attribute Value Should Be    css=[data-testid="hero-card"] [role="img"][aria-label^="Score"]    aria-label    Score 75 out of 100, Good
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

TC-W-HOM-006 The home page is a landing page only: no calculator inputs, market cards or quick calculators on it
    [Documentation]    Founder request 11 Nov 2026: a dedicated home page. The markets and quick calculators moved to
    ...    /quick-calculators/ (feature Quick calculators, TC-W-QCK-*).
    [Tags]    sanity    regression    P1
    Open Finealth    /
    FOR    ${css}    IN    [data-testid="markets"]    [data-testid="quick-calcs"]    [data-testid="asset-card"]    main input    main select    main input[type="range"]
        Page Should Not Contain Element    css=${css}
    END
    ${sections}=    Execute Javascript    return [...document.querySelectorAll('main section[data-testid], main section[aria-labelledby]')].map(s => s.dataset.testid || s.getAttribute('aria-labelledby'))
    Should Be Equal    ${sections}    ${HOME_SECTIONS}    The home sections changed order: ${sections}
    Evidence    Landing sections only, in the expected order

TC-W-HOM-007 The quick calculators card lists what is on that page and opens it
    [Tags]    regression    P2
    Open Finealth    /
    Scroll Element Into View    css=[data-testid="quick-answers"]
    Heading Should Contain    Quick calculators    level=2
    ${items}=    Get Element Count    css=[data-testid="quick-answers"] li
    Should Be Equal As Integers    ${items}    6
    ${links}=    Get Element Count    css=[data-testid="quick-answers"] li a[href^="/quick-calculators/#"]
    Should Be Equal As Integers    ${links}    6    Each item should link to its section on the quick calculators page
    FOR    ${t}    IN    Loan EMI and mortgage    SIP and savings growth    Income tax and take-home pay    GST, VAT and sales tax    Gold, silver and index prices
        Element Should Contain    css=[data-testid="quick-answers"]    ${t}
    END
    Evidence    Quick calculators card
    Click Element    css=[data-testid="quick-answers-link"]
    Wait Until Location Contains    /quick-calculators/
    Wait Until Element Is Visible    css=[data-testid="quick-calcs"]
    Heading Should Contain    Quick calculators    level=1
    Evidence    Opened /quick-calculators/
    # Each chip opens its own calculator, not just the first tab.
    Go To Page    /
    Execute Javascript    document.querySelector('[data-testid="quick-answers"] a[href$="#ctc"]').scrollIntoView({block: 'center', behavior: 'instant'})
    Click Element    css=[data-testid="quick-answers"] a[href$="#ctc"]
    Wait Until Location Contains    /quick-calculators/#ctc
    Wait Until Page Contains Element    xpath=//button[@aria-pressed="true"][normalize-space()="CTC to In-Hand Salary"]
    Evidence    The Salary (CTC) chip opened the CTC calculator

TC-W-HOM-008 Switching the header currency to GBP changes the Pro price on the home page and keeps one region control
    [Tags]    regression    P2
    Open Finealth    /
    Element Should Contain    css=[data-testid="plan-pro-price"]    ₹199
    Select From List By Value    css=header select[aria-label="Currency"]    GBP
    Wait Until Element Contains    css=[data-testid="plan-pro-price"]    US$7.99
    ${selects}=    Get Element Count    css=select[aria-label="Currency"]
    Should Be Equal As Integers    ${selects}    1    There is one region control (the header Currency)
    Evidence    Pro price follows the currency

TC-W-HOM-009 The home page has a title, description and its own canonical in the pre-rendered HTML
    [Tags]    sanity    regression    P2
    ${html}=    Fetch Text    ${BASE_URL}/
    Should Be Equal As Integers    ${html}[status]    200
    Should Contain    ${html}[text]    <title>Finealth: free financial health check, debt and goal planner</title>
    Should Match Regexp    ${html}[text]    <link rel="canonical" href="https://[^"]+/"/>
    Should Match Regexp    ${html}[text]    <meta name="description" content="Check your financial health
    ${count}=    Evaluate    $html['text'].count('rel="canonical"')
    Should Be Equal As Integers    ${count}    1    The home page should carry exactly one canonical
    Evidence    Title, description and one canonical in the static HTML

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

TC-W-HOM-014 Phone widths 320 and 360 px: no sideways scroll and the example figures fit
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

TC-W-HOM-015 Keyboard: Tab reaches the hero actions, every planner and the quick calculators link with a visible focus ring
    [Tags]    regression    P3
    Open Finealth    /
    Execute Javascript    window.__tabbed = []; window.__ring = null; document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)
    # Press Tab one stop at a time and record where focus lands, plus the focus style on the quick calculators link.
    FOR    ${n}    IN RANGE    80
        Press Keys    None    TAB
        ${done}=    Execute Javascript
        ...    const a = document.activeElement; const id = a && a.dataset ? a.dataset.testid : null;
        ...    window.__tabbed.push(id || (a && a.closest('[data-testid="planner-bento"]') ? 'planner:' + a.getAttribute('href') : ''));
        ...    if (id === 'quick-answers-link') { const s = getComputedStyle(a); window.__ring = s.outlineStyle + '|' + s.outlineWidth + '|' + s.boxShadow; }
        ...    return id === 'quick-answers-link';
        IF    ${done}    BREAK
    END
    ${reached}=    Execute Javascript    return window.__tabbed.filter(Boolean).join(',')
    FOR    ${id}    IN    hero-start    hero-tools    quick-answers-link
        Should Contain    ${reached}    ${id}    Tab never reached ${id}: ${reached}
    END
    ${planners}=    Execute Javascript    return new Set(window.__tabbed.filter(t => t.startsWith('planner:'))).size
    Should Be Equal As Integers    ${planners}    6    Tab should reach all six planners: ${reached}
    # The style while focused by keyboard must differ from the same link at rest.
    ${rest}=    Execute Javascript    document.activeElement.blur(); const s = getComputedStyle(document.querySelector('[data-testid="quick-answers-link"]')); return s.outlineStyle + '|' + s.outlineWidth + '|' + s.boxShadow
    ${ring}=    Execute Javascript    return window.__ring
    Should Not Be Equal    ${ring}    ${rest}    The focused link looks the same as at rest (no focus ring)
    Evidence    Tab order reached: ${reached}

TC-W-HOM-016 Dark mode: espresso ground, readable headings and the same sections
    [Tags]    regression    P2
    Open Finealth    /    dark=True
    ${bg}=    Get Computed Style    body    backgroundColor
    Should Be Equal    ${bg}    rgb(20, 17, 14)
    ${fg}=    Get Computed Style    \#planners-title    color
    ${ratio}=    Contrast Ratio    ${fg}    ${bg}
    Should Be True    ${ratio} >= 4.5    Section heading contrast ${ratio}:1 is below 4.5:1
    ${h2}=    Get Element Count    css=main h2
    Should Be Equal As Integers    ${h2}    8
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
