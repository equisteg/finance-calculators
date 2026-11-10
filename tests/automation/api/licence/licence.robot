*** Settings ***
Documentation     POST /api/v1/licence/verify (feature: Platform API, REQ-012 server side, REQ-018): Restore Pro and token
...               refresh for lifetime (pay_…) and yearly (sub_…) keys. Razorpay is a scripted fake (api-bridge.mjs).
...               Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    licence

*** Test Cases ***
TC-A-LIC-001 A captured lifetime payment returns a 7-day pro_lifetime token; the key is never echoed or logged
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": true}    lifetime_captured
    Log API Result    ${r}
    Token Should Be    ${r}    pro_lifetime
    Should Be Equal    ${r}[claims][kh]    ${r}[keyHashes][${PAY}]
    Should Be Equal As Integers    ${r}[ttl]    604800
    Should Not Contain    ${r}[text]    ${PAY}
    ${notes}=    Patched Notes    ${r}    /payments/${PAY}
    Should Be Equal    ${notes}[fh_activations]    1
    Nothing Leaked    ${r}

TC-A-LIC-002 A refunded lifetime payment (full or partial) is refused with 403 refunded and nothing is written
    [Tags]    sanity    regression    integration    P1
    FOR    ${sc}    IN    lifetime_refunded    lifetime_partial_refund
        ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": true}    ${sc}
        API Error Should Be    ${r}    403    refunded    ${REFUNDED}
        No Patch    ${r}
    END

TC-A-LIC-003 A payment that is not a Finealth order, carries injected notes or a wrong amount is refused like a malformed key
    [Tags]    regression    integration    P1
    FOR    ${sc}    IN    lifetime_not_ours    lifetime_injected_notes    lifetime_wrong_amount    razorpay_404
        ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    ${sc}
        API Error Should Be    ${r}    400    invalid_key    ${INVALID_KEY}
    END
    FOR    ${key}    IN    ABCD1234-EF567890-12345678-90ABCDEF    pay_short    pay_LifeTime12345A/../x
        ${m}=    Call API    POST    /api/v1/licence/verify    {"key": "${key}"}    lifetime_captured
        API Error Should Be    ${m}    400    invalid_key    ${INVALID_KEY}
        No Upstream Calls    ${m}
    END

TC-A-LIC-004 Razorpay 5xx answers 503 unavailable (never invalid_key) after one retry; 5xx then success grants Pro
    [Tags]    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    razorpay_5xx
    Log API Result    ${r}
    API Error Should Be    ${r}    503    unavailable
    Length Should Be    ${r}[upstream]    2    The 5xx is retried exactly once
    Logs Should Contain Event    ${r}    upstream_error    "upstream":500
    ${q}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    razorpay_429
    API Error Should Be    ${q}    503    unavailable
    Length Should Be    ${q}[upstream]    1    A 429 is not retried
    ${ok}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    razorpay_5xx_then_ok
    Token Should Be    ${ok}    pro_lifetime
    ${n}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    network_down
    API Error Should Be    ${n}    503    unavailable

TC-A-LIC-005 The 5th activation is allowed, the 6th refused; a refresh with our own token never counts, a forged one does
    [Tags]    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": true}    lifetime_notes4
    Token Should Be    ${r}    pro_lifetime
    ${notes}=    Patched Notes    ${r}    /payments/${PAY}
    Should Be Equal    ${notes}[fh_activations]    5
    ${x}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": true}    lifetime_at_limit
    API Error Should Be    ${x}    403    too_many_activations    ${TOO_MANY}
    No Patch    ${x}
    ${t}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "token": "$OUR_TOKEN_EXPIRED"}    lifetime_at_limit
    Token Should Be    ${t}    pro_lifetime
    No Patch    ${t}
    ${f}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "token": "$FORGED_TOKEN"}    lifetime_at_limit
    API Error Should Be    ${f}    403    too_many_activations
    ${c}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}", "activate": true}    lifetime_notes4    env={"MAX_ACTIVATIONS": "2"}
    API Error Should Be    ${c}    403    too_many_activations

TC-A-LIC-006 An active yearly subscription returns a 7-day pro_yearly token; renewal in 2 days caps it at renewal + 3 days
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_active
    Log API Result    ${r}
    Token Should Be    ${r}    pro_yearly
    Should Be Equal As Integers    ${r}[ttl]    604800
    Should Be Equal    ${r}[claims][kh]    ${r}[keyHashes][${SUB}]
    ${s}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_renews_in_2_days
    Token Should Be    ${s}    pro_yearly
    Token Expiry Should Be About    ${s}    ${5 * 86400}

TC-A-LIC-007 Cancelled-and-ended, halted, refunded or not-yet-charged subscriptions get no token
    [Tags]    regression    integration    P1
    ${c}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_cancelled_past
    API Error Should Be    ${c}    403    expired
    ${h}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_halted
    API Error Should Be    ${h}    403    expired
    ${f}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_latest_refunded
    API Error Should Be    ${f}    403    refunded    ${REFUNDED}
    No Patch    ${f}
    ${a}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_authenticated
    API Error Should Be    ${a}    409    pending
    ${o}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_not_ours
    API Error Should Be    ${o}    400    invalid_key    ${INVALID_KEY}

TC-A-LIC-008 Cancelled with time left keeps Pro to the period end with no grace; a renewal retry gets 3 days of grace only
    [Tags]    regression    integration    P2
    ${c}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_cancelled_future
    Token Should Be    ${c}    pro_yearly
    Token Expiry Should Be About    ${c}    ${3 * 86400}
    ${p}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_pending_1_day_late
    Token Should Be    ${p}    pro_yearly
    Token Expiry Should Be About    ${p}    ${2 * 86400}
    ${late}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}"}    sub_pending_4_days_late
    API Error Should Be    ${late}    403    expired

TC-A-LIC-009 Unreadable invoices or a missing signing key answer 503 and never grant or write anything
    [Tags]    regression    integration    P2
    ${r}=    Call API    POST    /api/v1/licence/verify    {"key": "${SUB}", "activate": true}    sub_invoices_down
    API Error Should Be    ${r}    503    unavailable
    No Patch    ${r}
    Logs Should Contain Event    ${r}    upstream_error
    ${k}=    Call API    POST    /api/v1/licence/verify    {"key": "${PAY}"}    lifetime_captured    env={"LICENCE_SIGNING_KEY": null}
    API Error Should Be    ${k}    503    unavailable
    No Upstream Calls    ${k}
