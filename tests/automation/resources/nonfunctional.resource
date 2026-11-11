*** Settings ***
Documentation     Shared data and keywords of the non-functional suites (tests/automation/web/nfr, fragment
...               tests/cases/fragments/nonfunctional.json). Builds on common.resource and NonfunctionalLib.
Resource          common.resource
Library           NonfunctionalLib
Library           Process

*** Variables ***
# The 20 key pages of NFR-009 (same list as tests/web/specs/a11y.spec.ts)
@{KEY_PAGES}      /    /health-check/    /debt-payoff/    /goal-planner/    /retirement-planner/    /loan-prepayment/
...               /tools/    /pricing/    /emi-calculator/    /my-plan/    /about/    /privacy/    /terms/    /refund/
...               /contact/    /pro/    /sip-calculator/    /compound-interest/    /tools/australia-income-tax-calculator/
...               /no-such-page/
# Pages that show a result (NFR-010)
@{PLANNERS}       /health-check/    /debt-payoff/    /goal-planner/    /retirement-planner/    /loan-prepayment/
@{CALCULATORS}    /emi-calculator/    /sip-calculator/    /compound-interest/
# Tools that use statutory rates (statutory: true in apps/web/src/lib/toolCatalog.ts) (NFR-015)
@{STATUTORY_TOOLS}    australia-income-tax-calculator    canada-income-tax-calculator    canada-sales-tax-calculator
...               gratuity-calculator    hra-exemption-calculator    india-tax-regime-calculator
...               new-zealand-income-tax-calculator    ppf-calculator    singapore-income-tax-calculator
...               uk-stamp-duty-calculator    us-federal-tax-calculator    world-vat-gst-calculator

*** Keywords ***
Set Field Safely
    [Documentation]    Set Field, retried once the smooth scroll has settled (a field far down a long planner can still be
    ...    moving under the floating header on the first click).
    [Arguments]    ${name}    ${value}    ${index}=0
    Wait Until Keyword Succeeds    3x    0.8s    Set Field    ${name}    ${value}    ${index}

Get Tool Slugs
    [Documentation]    The calculator pages listed on All tools (/tools/<slug>/), in page order, without repeats.
    Go To Page    /tools/
    ${links}=    Get WebElements    css=main a[href^="/tools/"]
    ${slugs}=    Create List
    FOR    ${a}    IN    @{links}
        ${href}=    Get Element Attribute    ${a}    href
        ${slug}=    Evaluate    [p for p in $href.split('/') if p][-1]
        IF    $slug != 'tools' and $slug not in $slugs    Append To List    ${slugs}    ${slug}
    END
    RETURN    ${slugs}

Page Should Render Without Main Heading Wait
    [Documentation]    For pages whose content is static (legal, 404): the shell and #main are enough.
    Wait Until Page Contains Element    ${MAIN}    20s

Open Key Page
    [Arguments]    ${path}
    Go To    ${BASE_URL}${path}
    Wait Until Page Contains Element    ${MAIN}    20s
    Wait Until Element Is Visible    css=main#main h1    20s

Axe Should Pass On Key Pages
    [Documentation]    Runs axe (WCAG 2.2 A/AA, glass flattened) on every key page and fails listing every page with a
    ...    serious or critical issue.
    ${failed}=    Create Dictionary
    FOR    ${path}    IN    @{KEY_PAGES}
        Open Key Page    ${path}
        Sleep    0.4s    reason=let the entrance animation settle
        ${v}=    Run Axe
        IF    ${v}    Set To Dictionary    ${failed}    ${path}=${v}
    END
    Evidence    Last page checked
    Should Be Empty    ${failed}    Serious/critical WCAG issues by page: ${failed}

No Sideways Scroll On Key Pages
    [Arguments]    ${width}
    Set Window Width    ${width}    800
    ${failed}=    Create List
    FOR    ${path}    IN    @{KEY_PAGES}
        Open Key Page    ${path}
        ${w}=    Execute Javascript    return [document.documentElement.scrollWidth, document.documentElement.clientWidth]
        IF    ${w}[0] > ${w}[1] + 1    Append To List    ${failed}    ${path} (${w}[0] px in ${w}[1] px)
    END
    Evidence    ${width} px: last page checked
    Should Be Empty    ${failed}    Pages that scroll sideways at ${width} px: ${failed}

Result Text Of Planner
    [Documentation]    The result block text of a planner page (data-testid tool-kpis), used to see it recompute.
    ${t}=    Text Of    tool-kpis
    RETURN    ${t}

Non GET Requests Should Be None
    [Arguments]    @{numbers}
    ${non_get}=    No Request Should Carry    @{numbers}
    Should Be Empty    ${non_get}    Requests that send data: ${non_get}
