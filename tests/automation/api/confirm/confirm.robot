*** Settings ***
Documentation     POST /api/v1/checkout/confirm (feature: Platform API, REQ-011 and REQ-012 server side): after the
...               Razorpay popup the Worker checks the payment signature and returns the first Pro token.
...               Razorpay is a scripted fake (api-bridge.mjs). Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    confirm

*** Test Cases ***
TC-A-CNF-001 Confirm with a good order signature returns the token, the licence key and plan and records activation 1
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}    lifetime_captured
    Log API Result    ${r}
    Token Should Be    ${r}    pro_lifetime
    Should Be Equal    ${r}[json][key]    ${PAY}
    Should Be Equal    ${r}[json][plan]    pro_lifetime
    Should Be Equal    ${r}[claims][kh]    ${r}[keyHashes][${PAY}]
    ${notes}=    Patched Notes    ${r}    /payments/${PAY}
    Should Be Equal    ${notes}[fh_activations]    1
    Should Be Equal    ${notes}[fh_confirmed]    1
    Should Be Equal    ${notes}[product]    finealth
    Nothing Leaked    ${r}

TC-A-CNF-002 A bad signature (other secret, ids swapped, junk, malformed id) is refused with 400 before any Razorpay call
    [Tags]    regression    P1
    FOR    ${body}    IN
    ...    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG_OTHER"}
    ...    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG_SWAPPED"}
    ...    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "not-hex"}
    ...    {"razorpay_payment_id": "bad id", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}
        ${r}=    Call API    POST    /api/v1/checkout/confirm    ${body}    lifetime_captured
        API Error Should Be    ${r}    400    invalid_payment    ${BAD_PAYMENT}
        No Upstream Calls    ${r}
    END

TC-A-CNF-003 Subscription confirm checks HMAC(payment_id|subscription_id) and returns the sub_ key with plan pro_yearly
    [Tags]    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${FIRST_PAY}", "razorpay_subscription_id": "${SUB}", "razorpay_signature": "$SIG"}    sub_first_confirm
    Log API Result    ${r}
    Token Should Be    ${r}    pro_yearly
    Should Be Equal    ${r}[json][key]    ${SUB}
    Should Be Equal    ${r}[claims][kh]    ${r}[keyHashes][${SUB}]
    ${notes}=    Patched Notes    ${r}    /payments/${FIRST_PAY}
    Should Be Equal    ${notes}[fh_activations]    1

TC-A-CNF-004 An authorized payment of our order is captured at ₹499 before Pro; a failed capture answers 409 pending
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}    lifetime_authorized
    Token Should Be    ${r}    pro_lifetime
    ${cap}=    Upstream Calls    ${r}    POST    /payments/${PAY}/capture
    Length Should Be    ${cap}    1
    ${expected}=    Evaluate    {"amount": 49900, "currency": "INR"}
    Should Be Equal    ${cap}[0][body]    ${expected}
    ${f}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}    lifetime_authorized_capture_fails
    API Error Should Be    ${f}    409    pending
    No Patch    ${f}

TC-A-CNF-005 A retried confirm of an already confirmed payment answers 200 without counting another activation
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}    lifetime_confirmed
    Token Should Be    ${r}    pro_lifetime
    No Patch    ${r}
    ${o}=    Call API    POST    /api/v1/checkout/confirm    {"razorpay_payment_id": "${PAY}", "razorpay_order_id": "${ORDER}", "razorpay_signature": "$SIG"}    lifetime_other_order
    API Error Should Be    ${o}    400    invalid_key
