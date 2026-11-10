*** Settings ***
Documentation     POST /api/v1/errors (feature: Platform API, REQ-018): client error reports are logged with personal
...               data scrubbed. Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    errors

*** Test Cases ***
TC-A-ERR-001 An error report is accepted with 204 and logged with email, tax id, phone and URL secrets scrubbed
    [Tags]    regression    P1
    ${body}=    Catenate    SEPARATOR=
    ...    {"platform": "web", "message": "Failed for priya@example.com with GSTIN 27AAPFU0939F1ZV and phone 9876543210",
    ...    "stack": "Error: x\\n    at save (https://finealth.app/_next/app.js?token=secret123:1:2)", "release": "web@1.2.3",
    ...    "route": "/invoice?client=priya@example.com\#x"}
    ${r}=    Call API    POST    /api/v1/errors    ${body}
    Log API Result    ${r}
    Should Be Equal As Integers    ${r}[status]    204
    ${lines}=    Logs Should Contain Event    ${r}    client_error
    ${line}=    Set Variable    ${lines}[0]
    FOR    ${pii}    IN    priya@example.com    27AAPFU0939F1ZV    9876543210    secret123
        Should Not Contain    ${line}    ${pii}
    END
    Should Contain    ${line}    [email]
    Should Contain    ${line}    [taxid]
    ${j}=    Evaluate    json.loads($line)    json
    Should Be Equal    ${j}[platform]    web
    Should Be Equal    ${j}[route]    /invoice

TC-A-ERR-002 Reports over 4 KB get 413 and an unknown platform gets 400
    [Tags]    regression    P2
    ${big}=    Evaluate    '{"platform": "web", "message": "' + 'x' * 5000 + '"}'
    ${r}=    Call API    POST    /api/v1/errors    ${big}
    Should Be Equal As Integers    ${r}[status]    413
    ${p}=    Call API    POST    /api/v1/errors    {"platform": "desktop", "message": "x"}
    Should Be Equal As Integers    ${p}[status]    400

TC-A-ERR-003 The legacy url field is accepted and only its path is kept
    [Tags]    regression    P3
    ${r}=    Call API    POST    /api/v1/errors    {"platform": "web", "message": "boom", "url": "https://finealth.app/pro?k=1"}
    Should Be Equal As Integers    ${r}[status]    204
    ${lines}=    Logs Should Contain Event    ${r}    client_error
    ${j}=    Evaluate    json.loads($lines[0])    json
    Should Be Equal    ${j}[route]    /pro
    Should Not Contain    ${lines}[0]    k=1
