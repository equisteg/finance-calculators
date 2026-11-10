*** Settings ***
Documentation     Non-functional: performance (NFR-002 Monte Carlo 1,000 runs × 80 years < 100 ms on a mid-range phone;
...               NFR-003 Lighthouse mobile performance ≥ 90 on tool pages; NFR-013 CLS < 0.1 on the debt planner and home
...               at 412 px). Test cases: tests/cases/test-cases.xlsx (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    performance

*** Variables ***
# This machine is much faster than a mid-range phone; 4× CPU slowdown is the usual phone factor, so the desktop budget
# is 100 ms / 4 = 25 ms.
${PHONE_FACTOR}    4

*** Test Cases ***
TC-N-PERF-001 Monte Carlo: 1,000 runs × 80 years complete in under 100 ms on a phone (under 25 ms here, 4× margin)
    [Tags]    regression    P1
    ${t}=    Time Monte Carlo    1000    80    7
    Log    median ${t}[median_ms] ms, slowest ${t}[max_ms] ms, runs ${t}[runs], years ${t}[years]
    Should Be Equal As Integers    ${t}[runs]    1000
    Should Be True    0 <= ${t}[result][successRate] <= 1
    ${phone}=    Evaluate    ${t}[median_ms] * ${PHONE_FACTOR}
    Should Be True    ${phone} < 100    Monte Carlo median ${t}[median_ms] ms × ${PHONE_FACTOR} = ${phone} ms, budget 100 ms

TC-N-PERF-002 Debt planner at 412 px loads with CLS below 0.1
    [Tags]    regression    P1
    Open Finealth    /
    Set Window Width    412    915
    Go To Page    /debt-payoff/
    Wait Until Element Is Visible    css=[data-testid="debt-pro-gate"]
    ${cls}=    Get Layout Shift    1.5
    ${w}=    Execute Javascript    return window.innerWidth
    Log    CLS ${cls} at a ${w} px wide window
    Should Be Equal As Integers    ${w}    412
    Evidence    Debt planner at 412 px, CLS ${cls}
    Should Be True    ${cls} < 0.1    Layout shift ${cls} on /debt-payoff/ (budget 0.1)

TC-N-PERF-003 Home page at 412 px loads with CLS below 0.1
    [Tags]    regression    P1
    Open Finealth    /health-check/
    Set Window Width    412    915
    Go To Page    /
    ${w}=    Execute Javascript    return window.innerWidth
    Should Be Equal As Integers    ${w}    412
    Wait Until Element Is Visible    css=[data-testid="engine-badge"]
    ${cls}=    Get Layout Shift    1.5
    Evidence    Home at 412 px, CLS ${cls}
    Should Be True    ${cls} < 0.1    Layout shift ${cls} on / (budget 0.1)

TC-N-PERF-004 Lighthouse mobile performance is at least 90 on the planner pages (staging)
    [Tags]    regression    integration    P1
    ${lhci}=    Tool Is Installed    lhci
    Skip If    not ${lhci}    Lighthouse CI (lhci) is not installed on this machine. Run it against staging with: npx @lhci/cli autorun --config=tests/load/lighthouserc.json --collect.url=<staging URL>/health-check/ (or this case with --env staging --base-url <staging URL> once lhci is installed)
    Skip If    '${ENV}' == 'local'    Lighthouse scores are measured on staging (real Worker, compression, CDN), not the local static server: run with --env staging --base-url <staging URL>
    ${r}=    Run Process    npx    --no-install    lhci    autorun    --config\=tests/load/lighthouserc.json
    ...    --collect.url\=${BASE_URL}/health-check/    --collect.url\=${BASE_URL}/debt-payoff/    cwd=${ROOT}    timeout=600s
    Log    ${r.stdout}\n${r.stderr}
    Should Be Equal As Integers    ${r.rc}    0    Lighthouse assertions failed (performance < 0.9): ${r.stdout}

TC-N-PERF-005 The Lighthouse config lists real pages and asserts performance ≥ 0.9 on each
    [Tags]    regression    P2
    ${cfg}=    Read JSON File    ${ROOT}/tests/load/lighthouserc.json
    ${urls}=    Set Variable    ${cfg}[ci][collect][url]
    ${n}=    Get Length    ${urls}
    Should Be True    ${n} >= 5    Only ${n} pages in lighthouserc.json
    FOR    ${u}    IN    @{urls}
        ${r}=    Fetch Text    ${BASE_URL}${u}
        Should Be Equal As Integers    ${r}[status]    200    ${u} in lighthouserc.json does not exist (HTTP ${r}[status])
    END
    ${perf}=    Set Variable    ${cfg}[ci][assert][assertMatrix][0][assertions][categories:performance]
    Should Be Equal    ${perf}[0]    error
    Should Be True    ${perf}[1][minScore] >= 0.9    Performance assertion is ${perf}[1][minScore], NFR-003 needs 0.9
    Should Be True    ${cfg}[ci][collect][numberOfRuns] >= 3
