*** Settings ***
Documentation     Extra keywords for the Worker API suites (tests/automation/api) and the Android app suites
...               (tests/automation/mobile). API requests run apps/api in Node with Razorpay and Google Play answered by
...               scripted fakes (libraries/api-bridge.mjs): nothing real is ever called and no real secret is used.
Resource          common.resource
Library           ApiAndroidLib.py

*** Variables ***
${PAY}            pay_LifeTime12345A
${ORDER}          order_Ord12345678AB
${SUB}            sub_Yearly12345ABC
${FIRST_PAY}      pay_SubFirst12345A
${DAY}            86400
${INVALID_KEY}    That licence key is not valid. Check the key on your Finealth Pro receipt (it starts with pay_ or sub_).
${REFUNDED}       This purchase was refunded, so Pro is no longer active.
${TOO_MANY}       This licence key has been activated on too many browsers. Contact support to reset it.
${BAD_PAYMENT}    We could not confirm this payment.
${INTL_OFF}       International payments are not enabled yet.
${PAUSED}         Buying Pro is paused for a short while. Please try again later.

*** Keywords ***
API Error Should Be
    [Documentation]    The response has HTTP ${status} and the JSON error code ${code} (and message ${message} when given).
    [Arguments]    ${r}    ${status}    ${code}    ${message}=${NONE}
    Should Be Equal As Integers    ${r}[status]    ${status}    HTTP status (body ${r}[text])
    Should Be Equal    ${r}[json][error][code]    ${code}
    IF    $message is not None    Should Be Equal    ${r}[json][error][message]    ${message}

No Upstream Calls
    [Arguments]    ${r}
    Should Be Empty    ${r}[upstream]    The Worker called Razorpay/Google: ${r}[upstream]

Nothing Leaked
    [Documentation]    Neither the Razorpay secret, the signing key nor the service-account key appears in the body,
    ...    headers or logs, and no licence key, payment id, signature or purchase token appears in the logs.
    [Arguments]    ${r}
    FOR    ${k}    ${v}    IN    &{r}[leaks]
        Should Not Be True    ${v}    Leak: ${k}
    END

Token Should Be
    [Documentation]    The response carries a licence token signed by this Worker with plan ${plan} and source ${src}.
    [Arguments]    ${r}    ${plan}    ${src}=razorpay
    Should Be Equal As Integers    ${r}[status]    200    HTTP status (body ${r}[text])
    Should Not Be Equal    ${r}[claims]    ${NONE}    The token does not verify with this Worker's public key
    Should Be Equal    ${r}[claims][plan]    ${plan}
    Should Be Equal    ${r}[claims][src]    ${src}
    Should Be Equal    ${r}[claims][env]    dev

Token Expiry Should Be About
    [Documentation]    The token expires ${seconds} s from now (within one minute).
    [Arguments]    ${r}    ${seconds}
    ${left}=    Evaluate    ${r}[claims][exp] - ${r}[now]
    Should Be True    abs(${left} - (${seconds})) <= 60    Token expires in ${left} s, expected about ${seconds} s

Patched Notes
    [Documentation]    The notes the Worker wrote back to Razorpay with PATCH ${path} (fails when there was no PATCH).
    [Arguments]    ${r}    ${path}
    ${p}=    Upstream Calls    ${r}    PATCH    ${path}
    Length Should Be    ${p}    1    Expected one PATCH ${path}: ${r}[upstream]
    RETURN    ${p}[0][body][notes]

No Patch
    [Arguments]    ${r}
    ${p}=    Upstream Calls    ${r}    PATCH
    Should Be Empty    ${p}    Nothing may be written to Razorpay: ${p}

Open App Tool
    [Documentation]    Opens the Android app, taps the dock category and tool, and checks the panel heading.
    [Arguments]    ${category}    ${tool}    ${heading}
    Open Finealth App
    Tap Dock    ${category}
    Tap Tool    ${tool}
    Wait Until Keyword Succeeds    5s    0.2s    Panel Heading Should Be    ${heading}
    Evidence    ${category} → ${tool}

Big Figure Should Be
    [Arguments]    ${expected}    ${timeout}=5s
    Wait Until Keyword Succeeds    ${timeout}    0.2s    Big Figure Equals    ${expected}

Big Figure Equals
    [Arguments]    ${expected}
    ${t}=    Big Figure
    Should Be Equal    ${t}    ${expected}

Result Row Should Be
    [Arguments]    ${label}    ${expected}    ${timeout}=5s
    Wait Until Keyword Succeeds    ${timeout}    0.2s    Result Row Equals    ${label}    ${expected}

Result Row Equals
    [Arguments]    ${label}    ${expected}
    ${t}=    Result Row    ${label}
    Should Be Equal    ${t}    ${expected}
