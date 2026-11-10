*** Settings ***
Documentation     POST /api/v1/checkout (feature: Platform API, REQ-011 server side, REQ-018): the Worker creates the
...               Razorpay order or subscription at the server price. Razorpay is a scripted fake (api-bridge.mjs).
...               Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    checkout

*** Test Cases ***
TC-A-CHK-001 Lifetime INR checkout creates the order at the server price ₹499 even when the client sends another amount
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR", "amount": 100}    order_created
    Log API Result    ${r}
    Should Be Equal As Integers    ${r}[status]    200
    ${expected}=    Evaluate    {"provider": "razorpay", "keyId": $r["keyId"], "plan": "pro_lifetime", "currency": "INR", "amount": 49900, "orderId": "${ORDER}", "name": "Finealth", "description": "Finealth Pro, lifetime"}
    Should Be Equal    ${r}[json]    ${expected}
    ${o}=    Upstream Calls    ${r}    POST    /orders
    Length Should Be    ${o}    1
    Should Be Equal    ${o}[0][auth]    razorpay-basic-ok
    Should Be Equal As Integers    ${o}[0][body][amount]    49900
    Should Be Equal    ${o}[0][body][currency]    INR
    Should Be Equal    ${o}[0][body][notes][product]    finealth
    Should Be Equal    ${o}[0][body][notes][plan]    pro_lifetime
    Should Match Regexp    ${o}[0][body][receipt]    ^fh-[0-9a-f]{24}$
    Nothing Leaked    ${r}

TC-A-CHK-002 Lifetime USD checkout is 1999 cents (US$19.99)
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "USD"}    order_created
    Should Be Equal As Integers    ${r}[status]    200
    Should Be Equal As Integers    ${r}[json][amount]    1999
    Should Be Equal    ${r}[json][currency]    USD
    ${o}=    Upstream Calls    ${r}    POST    /orders
    Should Be Equal As Integers    ${o}[0][body][amount]    1999
    Should Be Equal    ${o}[0][body][currency]    USD

TC-A-CHK-003 Yearly checkout creates a subscription from the configured INR plan id at ₹199
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_yearly", "currency": "INR"}    sub_created
    Log API Result    ${r}
    Should Be Equal As Integers    ${r}[status]    200
    Should Be Equal As Integers    ${r}[json][amount]    19900
    Should Be Equal    ${r}[json][subscriptionId]    ${SUB}
    Should Be Equal    ${r}[json][description]    Finealth Pro, yearly
    ${s}=    Upstream Calls    ${r}    POST    /subscriptions
    ${expected}=    Evaluate    {"plan_id": "plan_YearlyINR00001", "total_count": 10, "customer_notify": True, "notes": {"product": "finealth", "plan": "pro_yearly"}}
    Should Be Equal    ${s}[0][body]    ${expected}

TC-A-CHK-004 USD yearly without a USD plan answers 503 "International payments are not enabled yet." with no INR fallback
    [Tags]    regression    P2
    ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_yearly", "currency": "USD"}    sub_created
    ...    env={"RAZORPAY_PLAN_ID_YEARLY_USD": "<razorpay-plan-id-yearly-usd>"}
    API Error Should Be    ${r}    503    unavailable    ${INTL_OFF}
    No Upstream Calls    ${r}

TC-A-CHK-005 Missing Razorpay key id, secret or signing key answers 503 without calling Razorpay
    [Tags]    regression    P1
    FOR    ${over}    IN    {"RAZORPAY_KEY_ID": null}    {"RAZORPAY_KEY_SECRET": null}    {"RAZORPAY_KEY_ID": "<razorpay-key-id>"}    {"LICENCE_SIGNING_KEY": null}
        ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR"}    order_created    env=${over}
        API Error Should Be    ${r}    503    unavailable
        No Upstream Calls    ${r}
    END

TC-A-CHK-006 Unknown plan, unsupported currency, web monthly or an empty body is refused with 400
    [Tags]    regression    P2
    FOR    ${body}    IN    {"plan": "gold", "currency": "INR"}    {"plan": "pro_lifetime", "currency": "EUR"}    {"plan": "pro_monthly", "currency": "INR"}    {}
        ${r}=    Call API    POST    /api/v1/checkout    ${body}    order_created
        API Error Should Be    ${r}    400    invalid_request
        No Upstream Calls    ${r}
    END

TC-A-CHK-007 Kill switch "checkout" pauses buying with 503 while licence verify keeps working
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR"}    lifetime_captured    env={"KILL_SWITCHES": "foo, checkout"}
    API Error Should Be    ${r}    503    unavailable    ${PAUSED}
    No Upstream Calls    ${r}
    ${v}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    lifetime_captured    env={"KILL_SWITCHES": "foo, checkout"}
    Token Should Be    ${v}    pro_lifetime
    ${x}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR"}    lifetime_captured    env={"KILL_SWITCHES": "checkoutx"}
    Should Be Equal As Integers    ${x}[status]    200

TC-A-CHK-008 Razorpay 500, 401 or a network failure on create answers 503, sends the order once and logs the upstream status
    [Tags]    regression    integration    P1
    FOR    ${sc}    ${code}    IN    razorpay_5xx    500    razorpay_401    401
        ${r}=    Call API    POST    /api/v1/checkout    {"plan": "pro_lifetime", "currency": "INR"}    ${sc}
        API Error Should Be    ${r}    503    unavailable
        Length Should Be    ${r}[upstream]    1    No retry on create (no duplicate orders)
        Logs Should Contain Event    ${r}    upstream_error    "upstream":${code}
    END
    ${n}=    Call API    POST    /api/v1/checkout    {"plan": "pro_yearly", "currency": "INR"}    network_down
    API Error Should Be    ${n}    503    unavailable
