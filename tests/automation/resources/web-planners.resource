*** Settings ***
Documentation     Extra keywords for the planner suites (Health Check, Debt Payoff, Goal Planner, Retirement, Loan
...               Prepayment): heading key figures, saved planner data, the money format and gap checks.
Resource          common.resource

*** Variables ***
${STORE}          finealth.v1.

*** Keywords ***
Kpi Should Be
    [Documentation]    The key figure ${label} beside the page title shows ${value} (and has tone ${tone} when given).
    [Arguments]    ${label}    ${value}    ${tone}=${EMPTY}    ${timeout}=10s
    ${kpi}=    Set Variable    xpath=//*[@data-testid="tool-kpis"]/div[span[normalize-space(.)="${label}"]]
    Wait Until Keyword Succeeds    ${timeout}    0.3s    Element Text Should Be    ${kpi}/b    ${value}
    IF    '${tone}' != ''
        ${cls}=    Get Element Attribute    ${kpi}    class
        Should Contain    ${cls}    ${tone}    Key figure ${label} has class "${cls}", expected tone ${tone}
    END

Seed Planner
    [Documentation]    Stores ${json} under finealth.v1.${key} (as a person's own earlier visit would) and reloads.
    [Arguments]    ${key}    ${json}
    Set Local Storage Item    ${STORE}${key}    ${json}
    Reload Page
    Wait For Page Rendered

Saved Planner Should Contain
    [Arguments]    ${key}    @{parts}
    ${raw}=    Get Local Storage Item    ${STORE}${key}
    Should Not Be Equal    ${raw}    ${None}    Nothing saved under ${STORE}${key}
    FOR    ${p}    IN    @{parts}
        Should Contain    ${raw}    ${p}
    END

Reload And Wait
    Reload Page
    Wait For Page Rendered

Mark Page
    [Documentation]    Sets a marker on window; Page Should Still Be Marked proves no full page reload happened since.
    Execute Javascript    window.__noReload = 'kept'

Page Should Still Be Marked
    ${m}=    Execute Javascript    return window.__noReload || ''
    Should Be Equal    ${m}    kept    The page reloaded

Main Should Not Show NaN
    ${t}=    Get Text    ${MAIN}
    Should Not Contain    ${t}    NaN
    Should Not Contain    ${t}    Infinity
    Should Not Contain    ${t}    undefined

Grid Rows Should Have No End Gap
    [Documentation]    Every .fieldgrid / .fitgrid row ends at the grid's right edge (within ${max} px), as FH-18 checks.
    [Arguments]    ${max}=2
    ${gaps}=    Execute Javascript
    ...    return [...document.querySelectorAll('.fieldgrid, .fitgrid')].filter(g => g.offsetParent !== null).map(g => {
    ...    const k = [...g.children]; if (!k.length) return 0;
    ...    return Math.round(g.getBoundingClientRect().right - k[k.length - 1].getBoundingClientRect().right); });
    Log    Gaps at the end of each grid: ${gaps}
    FOR    ${g}    IN    @{gaps}
        Should Be True    ${g} <= ${max}    A grid row ends ${g} px short of its right edge (${gaps})
    END

Remove Item Named
    [Arguments]    ${name}
    Click Centered    xpath=//main//button[@aria-label="Remove ${name}"]

Count Of
    [Arguments]    ${css}
    ${n}=    Get Element Count    css=${css}
    RETURN    ${n}

Settle On
    [Documentation]    Scrolls ${locator} to the middle of the window at once (the site scrolls smoothly, which can leave
    ...    a click landing on the old position) and waits for the layout to settle.
    [Arguments]    ${locator}
    ${el}=    Get WebElement    ${locator}
    Execute Javascript    arguments[0].scrollIntoView({block: 'center', behavior: 'instant'})    ARGUMENTS    ${el}
    Sleep    0.6s

Click Settled
    [Arguments]    ${locator}
    Settle On    ${locator}
    Click Element    ${locator}
