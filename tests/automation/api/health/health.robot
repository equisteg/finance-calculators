*** Settings ***
Documentation     Worker health and routing (feature: Platform API, REQ-018). apps/api runs in Node; nothing real is called.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/api.json).
Resource          ../../resources/api-android.resource
Test Tags         api    health

*** Test Cases ***
TC-A-HLT-001 Health reports release, environment and config status with the security headers and no secrets
    [Tags]    sanity    regression    P1
    ${r}=    Call API    GET    /api/v1/health    ${NONE}    none    env={"RELEASE": "abc123"}
    Log API Result    ${r}
    Should Be Equal As Integers    ${r}[status]    200
    ${expected}=    Evaluate    {"ok": True, "release": "abc123", "env": "dev", "checks": {"signingKey": "ok", "razorpay": "ok"}}
    Should Be Equal    ${r}[json]    ${expected}
    Should Be Equal    ${r}[headers][cache-control]    no-store
    Should Be Equal    ${r}[headers][x-content-type-options]    nosniff
    Should Be Equal    ${r}[headers][x-frame-options]    DENY
    Should Not Be Empty    ${r}[headers][x-request-id]
    Nothing Leaked    ${r}
    No Upstream Calls    ${r}

TC-A-HLT-002 Health shows "missing" when the signing key or Razorpay secret is absent, or a test key runs in production
    [Tags]    regression    P2
    ${r}=    Call API    GET    /api/v1/health    ${NONE}    none    env={"LICENCE_SIGNING_KEY": null, "RAZORPAY_KEY_SECRET": null}
    Log API Result    ${r}
    Should Be Equal As Integers    ${r}[status]    200
    Should Be Equal    ${r}[json][checks][signingKey]    missing
    Should Be Equal    ${r}[json][checks][razorpay]    missing
    ${p}=    Call API    GET    /api/v1/health    ${NONE}    none    env={"ENVIRONMENT": "production"}
    Should Be Equal    ${p}[json][checks][razorpay]    missing
    Should Be Equal    ${p}[json][checks][signingKey]    ok
    No Upstream Calls    ${r}

TC-A-HLT-003 Unknown API path answers 404 JSON, and production 301s any other host to the canonical domain
    [Tags]    regression    P2
    ${r}=    Call API    GET    /api/v1/nope
    Should Be Equal As Integers    ${r}[status]    404
    ${nf}=    Evaluate    {"error": {"code": "not_found", "message": "Not found."}}
    Should Be Equal    ${r}[json]    ${nf}
    ${p}=    Call API    GET    https://finealth.workers.dev/api/v1/health    ${NONE}    none
    ...    env={"ENVIRONMENT": "production", "CANONICAL_HOST": "finealth.teiqtools.com"}
    Log API Result    ${p}
    Should Be Equal As Integers    ${p}[status]    301
    Should Be Equal    ${p}[headers][location]    https://finealth.teiqtools.com/api/v1/health
