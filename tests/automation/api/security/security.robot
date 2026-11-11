*** Settings ***
Documentation     Worker request guards (feature: Platform API, REQ-018): CSRF origin check, CORS allow-list, JSON-only
...               bodies, body size limit and rate limit. Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    security

*** Test Cases ***
TC-A-SEC-001 A foreign Origin is refused with 403 on verify, checkout and confirm before any store call
    [Tags]    sanity    regression    P1
    FOR    ${path}    IN    /api/v1/licence/verify    /api/v1/checkout    /api/v1/checkout/confirm
        ${r}=    Call API    POST    ${path}    {"key": "${PAY}"}    lifetime_captured    {"origin": "https://evil.example"}
        API Error Should Be    ${r}    403    forbidden_origin    Requests from this site are not allowed.
        No Upstream Calls    ${r}
    END

TC-A-SEC-002 CORS allows the app origin and refuses a preflight from a foreign site
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    lifetime_captured    {"origin": "finealth://app"}
    Should Be Equal As Integers    ${r}[status]    200
    Should Be Equal    ${r}[headers][access-control-allow-origin]    finealth://app
    ${bad}=    Call API    OPTIONS    /api/v1/licence/verify    ${NONE}    none    {"origin": "https://evil.example"}
    Should Be Equal As Integers    ${bad}[status]    403
    ${ok}=    Call API    OPTIONS    /api/v1/licence/verify    ${NONE}    none    {"origin": "finealth://app"}
    Should Be Equal As Integers    ${ok}[status]    204
    Should Be Equal    ${ok}[headers][access-control-allow-methods]    GET, POST, OPTIONS
    Dictionary Should Not Contain Key    ${ok}[headers]    access-control-allow-credentials

TC-A-SEC-003 Non-JSON content type, invalid JSON and a wrongly typed field are refused
    [Tags]    regression    P2
    ${r}=    Call API With    POST    /api/v1/checkout    ${NONE}    none    {"content-type": "application/x-www-form-urlencoded"}    raw_body=plan=x
    API Error Should Be    ${r}    415    unsupported_media_type    Send the request body as application/json.
    ${j}=    Call API With    POST    /api/v1/licence/verify    ${NONE}    none    raw_body={nope
    Should Be Equal As Integers    ${j}[status]    400
    ${t}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": "yes"}
    API Error Should Be    ${t}    400    invalid_request
    No Upstream Calls    ${t}

TC-A-SEC-004 A body over 16 KB is refused with 413
    [Tags]    regression    P2
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "pad": "$PAD17K"}    lifetime_captured
    API Error Should Be    ${r}    413    payload_too_large    The request body is too large.
    No Upstream Calls    ${r}

TC-A-SEC-005 The sixth verify or checkout from one address within a minute gets 429 with Retry-After 60
    [Tags]    regression    integration    P1
    ${r}=    Call API With    POST    /api/v1/licence/verify    {"key": "${PAY}"}    lifetime_captured    repeat=6
    ${first5}=    Get Slice From List    ${r}[statuses]    0    5
    ${ok}=    Create List    ${200}    ${200}    ${200}    ${200}    ${200}
    Lists Should Be Equal    ${first5}    ${ok}
    API Error Should Be    ${r}    429    rate_limited
    Should Be Equal    ${r}[headers][retry-after]    60
    ${c}=    Call API With    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR"}    order_created    repeat=6
    Should Be Equal As Integers    ${c}[statuses][4]    200
    Should Be Equal As Integers    ${c}[statuses][5]    429
