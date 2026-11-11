*** Settings ***
Documentation     Non-functional: load (NFR-012 licence API under load: p95 < 300 ms, errors < 1 % at 20 rps). k6 runs on
...               staging only, never production. Test cases: tests/cases/test-cases.xlsx
...               (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Tags         web    nfr    load

*** Test Cases ***
TC-N-LOAD-001 Licence API under load on staging: p95 below 300 ms and errors below 1 %
    [Tags]    regression    integration    P1
    ${k6}=    Tool Is Installed    k6
    Skip If    not ${k6}    k6 is not installed on this machine. Run it against staging with: k6 run --env PROFILE=load --env BASE_URL=<staging URL> tests/load/load.js (or this case with --env staging --base-url <staging URL>)
    Skip If    '${ENV}' == 'local'    Load tests run against staging only (never production, not the local static server): run with --env staging --base-url <staging URL>, or k6 run --env PROFILE=load --env BASE_URL=<staging URL> tests/load/load.js
    ${r}=    Run Process    k6    run    --env    PROFILE\=load    --env    BASE_URL\=${BASE_URL}
    ...    --summary-export\=${RESULTS}${/}k6-summary.json    tests/load/load.js    cwd=${ROOT}    timeout=600s
    Log    ${r.stdout}\n${r.stderr}
    ${s}=    Read JSON File    ${RESULTS}${/}k6-summary.json
    ${p95}=    Set Variable    ${s}[metrics][http_req_duration][p(95)]
    ${err}=    Set Variable    ${s}[metrics][http_req_failed][value]
    Should Be True    ${p95} < 300    p95 ${p95} ms (budget 300 ms)
    Should Be True    ${err} < 0.01    error rate ${err} (budget 1 %)

TC-N-LOAD-002 The k6 load profile enforces the NFR-012 limits and calls the licence routes
    [Tags]    regression    P2
    ${cfg}=    Read JSON File    ${ROOT}/tests/testdata/shared/load.json
    ${paths}=    Evaluate    [r['path'] for r in $cfg['routes']]
    Should Contain    ${paths}    /api/v1/health
    Should Contain    ${paths}    /api/v1/licence/verify
    Should Be True    ${cfg}[maxErrorRate] <= 0.01    maxErrorRate ${cfg}[maxErrorRate] (NFR-012: < 1 %)
    Should Be True    ${cfg}[p95Ms] <= 300    k6 threshold p95Ms is ${cfg}[p95Ms] ms but NFR-012 requires p95 < 300 ms
    ${js}=    Read Repo File    tests/load/load.js
    Should Contain    ${js}    p(95)<\${cfg.p95Ms
