*** Settings ***
Documentation     Non-functional: compliance (NFR-010 disclaimer on every result screen, visible on 5/5 planners; NFR-015
...               statutory rates carry a last-checked date no older than 12 months, shown on every tax tool).
...               Test cases: tests/cases/test-cases.xlsx (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    compliance

*** Test Cases ***
TC-N-CMPL-001 The disclaimer is visible on 5 of 5 planners and on the home page
    [Tags]    sanity    regression    P1
    Open Finealth    /
    Disclaimer Should Be Visible
    ${seen}=    Set Variable    ${0}
    FOR    ${path}    IN    @{PLANNERS}
        Go To Page    ${path}
        Disclaimer Should Be Visible
        Element Should Contain    ${DISCLAIMER}    not financial
        ${seen}=    Evaluate    ${seen} + 1
    END
    Evidence    Disclaimer on the last planner
    Should Be Equal As Integers    ${seen}    5

TC-N-CMPL-002 The disclaimer is visible on every calculator and tool result page
    [Tags]    regression    P1
    Open Finealth    /tools/
    ${slugs}=    Get Tool Slugs
    ${missing}=    Create List
    FOR    ${path}    IN    @{CALCULATORS}
        Go To Page    ${path}
        ${ok}=    Run Keyword And Return Status    Disclaimer Should Be Visible
        IF    not ${ok}    Append To List    ${missing}    ${path}
    END
    FOR    ${slug}    IN    @{slugs}
        Go To Page    /tools/${slug}/
        ${ok}=    Run Keyword And Return Status    Disclaimer Should Be Visible
        IF    not ${ok}    Append To List    ${missing}    ${slug}
    END
    ${n}=    Get Length    ${slugs}
    Log    Checked 3 calculators and ${n} tools
    Evidence    Last tool
    Should Be Empty    ${missing}    Result pages without the disclaimer: ${missing}

TC-N-CMPL-003 Every statutory tax tool shows "Rates last checked" with a date no older than 12 months
    [Tags]    regression    P1
    ${src}=    Read Repo File    packages/finance-core/src/world.ts
    ${iso}=    Evaluate    __import__('re').search(r"RATES_LAST_CHECKED = '(\\d{4}-\\d{2}-\\d{2})'", $src).group(1)
    ${age}=    Days Since ISO Date    ${iso}
    Should Be True    0 <= ${age} <= 365    RATES_LAST_CHECKED ${iso} is ${age} days old (limit 365)
    ${label}=    Evaluate    __import__('datetime').date.fromisoformat($iso).strftime('%-d %B %Y')
    ${catalog}=    Read Repo File    apps/web/src/lib/toolCatalog.ts
    ${count}=    Evaluate    $catalog.count('statutory: true')
    ${listed}=    Get Length    ${STATUTORY_TOOLS}
    Should Be Equal As Integers    ${count}    ${listed}    toolCatalog.ts has ${count} statutory tools, the test lists ${listed}
    Open Finealth    /tools/
    Main Text Should Contain    ${label}
    FOR    ${slug}    IN    @{STATUTORY_TOOLS}
        Go To Page    /tools/${slug}/
        Element Should Contain    css=[data-testid="tool-source"]    Rates last checked: ${label}
    END
    Evidence    Last tax tool: Rates last checked ${label} (${age} days ago)

TC-N-CMPL-004 Results are information only: no sign-in, no product names to buy, no "you should" advice
    [Tags]    regression    P2
    Open Finealth    /
    FOR    ${path}    IN    @{PLANNERS}    @{CALCULATORS}
        Go To Page    ${path}
        Main Text Should Not Match    sign in|log in|create an account|you should (buy|invest in)|we recommend (buying|the fund)|guaranteed returns?
        Element Should Contain    ${DISCLAIMER}    advice
    END
    Evidence    Last page checked

