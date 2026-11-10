*** Settings ***
Documentation     Site-wide navigation and look (feature: Navigation, REQ-023 light and dark modes, calm motion; REQ-024
...               one header and footer on every page, skip link, stable layout, 404 page): the theme switch and its
...               memory, blocked storage, device dark mode with reduced motion, the skip link, the shared header and
...               footer, the logo, the main navigation, layout shift and the 404 page.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    nav

*** Variables ***
${LIGHT_BG}       rgb(245, 241, 234)
${DARK_BG}        rgb(20, 17, 14)
${TOGGLE}         css=[data-testid="theme-toggle"]
${MAIN_NAV}       xpath=//header//nav[@aria-label="Main"]

*** Keywords ***
Body Background Should Be
    [Arguments]    ${colour}
    Wait Until Keyword Succeeds    5s    0.2s    Computed Style Should Be    body    backgroundColor    ${colour}

Computed Style Should Be
    [Arguments]    ${css}    ${prop}    ${expected}
    ${v}=    Get Computed Style    ${css}    ${prop}
    Should Be Equal    ${v}    ${expected}

Theme Attribute
    ${t}=    Execute Javascript    return document.documentElement.dataset.theme || ''
    RETURN    ${t}

Focused Element Should Be Inside Main
    ${in}=    Execute Javascript    return !!(document.activeElement && document.activeElement.closest('#main'))
    Should Be True    ${in}    Focus is not inside the main content

Focused Element Should Be On Screen
    [Documentation]    The focused element is inside the window (the skip link slides in with a short transition).
    ${top}=    Execute Javascript    return document.activeElement.getBoundingClientRect().top
    Should Be True    ${top} >= 0    The focused element is off screen (top ${top})

Shared Header And Footer Should Show
    [Arguments]    ${path}
    ${t}=    Get Element Count    ${TOGGLE}
    Should Be Equal As Integers    ${t}    1    ${path}: theme switches
    ${navs}=    Get Element Count    ${MAIN_NAV}
    Should Be Equal As Integers    ${navs}    1    ${path}: Main navs
    ${links}=    Get Element Count    ${MAIN_NAV}//a
    Should Be Equal As Integers    ${links}    6    ${path}: Main nav links
    Page Should Contain Element    css=header select[aria-label="Currency"]
    Page Should Contain Element    css=header a[aria-label="Finealth home"]
    Element Should Contain    css=footer    A product by Equisteg
    Element Attribute Value Should Be    xpath=//footer//a[normalize-space(.)="Equisteg"]    href    https://equisteg.com/
    ${f}=    Get Element Count    css=footer
    Should Be Equal As Integers    ${f}    1    ${path}: footers
    Page Should Contain Element    css=main#main    limit=1

*** Test Cases ***
TC-W-NAV-001 The moon switch turns the site dark, the choice is remembered across pages and reloads, and switches back
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Body Background Should Be    ${LIGHT_BG}
    Element Attribute Value Should Be    ${TOGGLE}    aria-label    Switch to dark mode
    Click Element    ${TOGGLE}
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    dark
    Body Background Should Be    ${DARK_BG}
    Element Attribute Value Should Be    ${TOGGLE}    aria-label    Switch to light mode
    ${saved}=    Get Local Storage Item    finealth.theme
    Should Be Equal    ${saved}    dark
    Evidence    Dark mode
    Reload Page
    Wait For Page Rendered
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    dark
    Body Background Should Be    ${DARK_BG}
    Go To Page    /pricing/
    Body Background Should Be    ${DARK_BG}
    Evidence    Still dark after a reload and on another page
    Click Element    ${TOGGLE}
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    light
    Body Background Should Be    ${LIGHT_BG}
    ${saved}=    Get Local Storage Item    finealth.theme
    Should Be Equal    ${saved}    light

TC-W-NAV-002 With browser storage blocked the switch still changes the page, without errors, but is not remembered
    [Tags]    regression    P3
    Open Finealth    /health-check/
    Block Browser Storage On Next Load
    Reload Page
    Wait For Page Rendered
    ${blocked}=    Execute Javascript    try { localStorage.length; return false } catch (e) { return true }
    Should Be True    ${blocked}    Storage is not blocked
    Test Id Text Should Be    health-score    75
    Click Element    ${TOGGLE}
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    dark
    Body Background Should Be    ${DARK_BG}
    Evidence    Dark for this page with storage blocked
    Page Should Have No Console Problems
    Reload Page
    Wait For Page Rendered
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    ${EMPTY}
    Body Background Should Be    ${LIGHT_BG}
    Evidence    Not remembered after the reload

TC-W-NAV-003 Device dark mode with reduced motion: opens dark at once and runs no reveal or fade animations
    [Tags]    regression    P3
    Open Finealth    /    dark=True    reduced_motion=True
    ${t}=    Theme Attribute
    Should Be Equal    ${t}    ${EMPTY}
    ${bg}=    Get Computed Style    body    backgroundColor
    Should Be Equal    ${bg}    ${DARK_BG}
    Element Attribute Value Should Be    ${TOGGLE}    aria-label    Switch to light mode
    ${running}=    Get Running Animations
    Should Be Empty    ${running}    Animations running with reduced motion: ${running}
    ${faded}=    Execute Javascript    return [...document.querySelectorAll('main *')].filter(e => e.textContent.trim() && parseFloat(getComputedStyle(e).opacity) < 1 && e.getClientRects().length).length
    Should Be Equal As Integers    ${faded}    0
    Evidence    Dark, no motion

TC-W-NAV-004 Keyboard: the first Tab shows "Skip to content" and Enter jumps past the header to the content
    [Tags]    sanity    regression    P1
    Open Finealth    /health-check/
    Press Keys    None    TAB
    ${name}=    Execute Javascript    return document.activeElement.textContent.trim()
    Should Be Equal    ${name}    Skip to content
    Wait Until Keyword Succeeds    2s    0.1s    Focused Element Should Be On Screen
    Evidence    Skip to content is the first focus stop
    Press Keys    None    ENTER
    Wait Until Location Contains    \#main
    Press Keys    None    TAB
    Focused Element Should Be Inside Main
    Evidence    Next Tab lands in the main content

TC-W-NAV-005 Home, planner, tool, legal and pricing pages share one header and one footer with "A product by Equisteg"
    [Tags]    regression    P2
    Open Finealth    /
    FOR    ${path}    IN    /    /health-check/    /tools/australia-income-tax-calculator/    /privacy/    /pricing/    /my-plan/
        Go To Page    ${path}
        Shared Header And Footer Should Show    ${path}
    END
    Evidence    Same header and footer

TC-W-NAV-006 The logo returns to the home page from any page
    [Tags]    regression    P2
    Open Finealth    /terms/
    Element Should Contain    css=header a[aria-label="Finealth home"]    Finealth
    Click Element    css=header a[aria-label="Finealth home"]
    Wait Until Location Is    ${BASE_URL}/
    Wait For Page Rendered
    Element Should Contain    css=main h1    Know your money's health
    Go To Page    /no-such-page/
    Click Element    css=header a[aria-label="Finealth home"]
    Wait Until Location Is    ${BASE_URL}/
    Evidence    Logo opened the home page

TC-W-NAV-007 Each main navigation link opens its page and is marked as the current page
    [Tags]    regression    P2
    Open Finealth    /
    FOR    ${label}    ${path}    ${heading}    IN
    ...    Health Check    /health-check/    Financial Health Check
    ...    Debt Planner    /debt-payoff/    Debt Payoff Planner
    ...    Goals    /goal-planner/    Goal Planner
    ...    Retirement    /retirement-planner/    Retirement
    ...    Prepayment    /loan-prepayment/    Prepayment
    ...    All tools    /tools/    Every money tool
        Click Element    ${MAIN_NAV}//a[normalize-space(.)="${label}"]
        Wait Until Location Is    ${BASE_URL}${path}
        Heading Should Contain    ${heading}
        Element Attribute Value Should Be    ${MAIN_NAV}//a[normalize-space(.)="${label}"]    aria-current    page
        ${current}=    Get Element Count    ${MAIN_NAV}//a[@aria-current="page"]
        Should Be Equal As Integers    ${current}    1
    END
    Evidence    All six links work

TC-W-NAV-008 No layout shift while the Pro check finishes on a phone (CLS below 0.1)
    [Tags]    regression    P2
    Open Finealth    /debt-payoff/    width=412
    Set Window Width    412    915
    Reload Page
    Wait Until Element Is Visible    css=[data-testid="debt-pro-gate"]    15s
    ${cls}=    Get Layout Shift    1
    Should Be True    ${cls} < 0.1    Layout shift on /debt-payoff/: ${cls}
    Go To Page    /
    ${cls}=    Get Layout Shift    1.5
    Should Be True    ${cls} < 0.1    Layout shift on /: ${cls}
    Evidence    CLS below 0.1

TC-W-NAV-009 A mistyped address shows the 404 page with the shared header, a way home and a working skip link
    [Tags]    regression    P2
    Open Finealth    /no-such-page/
    Heading Should Contain    This page does not exist
    Title Should Be    Page not found · Finealth
    Main Text Should Contain    Your saved plans are safe on this device.
    Shared Header And Footer Should Show    /no-such-page/
    Press Keys    None    TAB
    ${name}=    Execute Javascript    return document.activeElement.textContent.trim()
    Should Be Equal    ${name}    Skip to content
    Press Keys    None    ENTER
    Press Keys    None    TAB
    Focused Element Should Be Inside Main
    Evidence    404 page
    Click Element    xpath=//main//a[normalize-space(.)="Go to the home page"]
    Wait Until Location Is    ${BASE_URL}/

TC-W-NAV-010 At 320 px the home and 404 pages do not scroll sideways and the header rail scrolls within itself
    [Tags]    regression    P3
    Open Finealth    /
    Set Window Width    320    800
    Reload Page
    Wait For Page Rendered
    Page Has No Horizontal Scroll
    Elements Should Fit Their Boxes    .hero-stats .stat > span:first-child
    ${rail}=    Execute Javascript    const n = document.querySelector('header nav[aria-label="Main"]'); return [n.scrollWidth > n.clientWidth, getComputedStyle(n).overflowX]
    Should Be True    ${rail}[0]    The header rail fits at 320 px (expected it to scroll)
    Should Be True    '${rail}[1]' in ('auto', 'scroll')
    Go To Page    /no-such-page/
    Page Has No Horizontal Scroll
    Evidence    320 px: no sideways scroll
