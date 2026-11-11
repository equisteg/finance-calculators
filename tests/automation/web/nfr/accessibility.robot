*** Settings ***
Documentation     Non-functional: accessibility (NFR-009, WCAG 2.2 AA on key pages in light and dark modes, 0 serious or
...               critical axe issues; keyboard-only use; accessible names). Test cases: tests/cases/test-cases.xlsx, sheet
...               "Test Cases" (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    accessibility

*** Test Cases ***
TC-N-ACC-001 Twenty key pages in light mode have 0 serious or critical axe issues
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Axe Should Pass On Key Pages

TC-N-ACC-002 Twenty key pages in dark mode have 0 serious or critical axe issues
    [Tags]    regression    P1
    Open Finealth    /    dark=True
    ${bg}=    Get Computed Style    body    backgroundColor
    Should Be Equal    ${bg}    rgb(20, 17, 14)    The dark "Espresso" ground is not applied (${bg})
    Axe Should Pass On Key Pages

TC-N-ACC-003 The five planners at phone width (390 px) have 0 serious or critical axe issues in light and dark
    [Tags]    regression    P2
    FOR    ${dark}    IN    False    True
        Open Finealth    /    phone=True    dark=${dark}
        ${failed}=    Create Dictionary
        FOR    ${path}    IN    @{PLANNERS}
            Open Key Page    ${path}
            Sleep    0.4s
            ${v}=    Run Axe
            IF    ${v}    Set To Dictionary    ${failed}    ${path}=${v}
        END
        Evidence    Phone width, dark=${dark}
        Should Be Empty    ${failed}    Serious/critical WCAG issues at 390 px (dark=${dark}): ${failed}
        Close Finealth
    END

TC-N-ACC-004 Keyboard only: skip link, the main action and a planner input are reachable and work
    [Tags]    regression    P1
    Open Finealth    /
    ${n}=    Tab Until Focused    a.skip-link    3
    Element Text Should Be    css=a.skip-link    Skip to content
    Evidence    First Tab focuses "Skip to content"
    ${n}=    Tab Until Focused    [data-testid="hero-start"]    40
    Press Key On Focused    ENTER
    Wait Until Location Contains    /health-check/
    Wait For Page Rendered
    Test Id Text Should Be    health-score    75
    ${n}=    Tab Until Focused    [data-testid="in-fund"]    60
    Execute Javascript    document.activeElement.select()
    Press Key On Focused    450000
    Press Key On Focused    TAB
    Test Id Text Should Be    health-score    85
    Evidence    Emergency savings changed with the keyboard only: score 85

TC-N-ACC-005 Every money input on the planners has an accessible name and the score ring has a text alternative
    [Tags]    regression    P2
    Open Finealth    /health-check/
    Element Attribute Value Should Be    css=main [role="img"][aria-label^="Score"]    aria-label    Score 75 out of 100, Good
    ${all}=    Create Dictionary
    FOR    ${path}    IN    @{PLANNERS}    @{CALCULATORS}
        Open Key Page    ${path}
        ${bad}=    Unnamed Form Fields
        IF    ${bad}    Set To Dictionary    ${all}    ${path}=${bad}
    END
    Evidence    Last page checked
    Should Be Empty    ${all}    Form fields without an accessible name: ${all}
