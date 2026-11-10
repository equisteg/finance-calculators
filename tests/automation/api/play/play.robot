*** Settings ***
Documentation     POST /api/v1/play/verify (feature: Platform API, REQ-012 server side for Android): the Worker checks a
...               Google Play purchase with the Play Developer API. Google (oauth2 + androidpublisher) is a scripted fake
...               (api-bridge.mjs) with a throwaway service account. Test cases: fragment tests/cases/fragments/api.json.
Resource          ../../resources/api-android.resource
Test Tags         api    play

*** Variables ***
${PTOKEN}         abcdefghijkl.AO-J1Oxyz_purchase-token-1234567890

*** Test Cases ***
TC-A-PLAY-001 An active Play subscription returns a pro_monthly token from the base plan, capped at the Play expiry
    [Tags]    sanity    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_sub_active
    Log API Result    ${r}
    Token Should Be    ${r}    pro_monthly    play
    Token Expiry Should Be About    ${r}    ${2 * 86400}
    ${o}=    Upstream Calls    ${r}    POST    oauth2.googleapis.com/token
    Should Be Equal    ${o}[0][body][grant_type]    urn:ietf:params:oauth:grant-type:jwt-bearer
    Should Be Equal As Integers    ${o}[0][body][assertion_parts]    3
    ${s}=    Upstream Calls    ${r}    GET    subscriptionsv2
    Should Be Equal    ${s}[0][url]    https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.tezech.finealth/purchases/subscriptionsv2/tokens/${PTOKEN}
    Should Be Equal    ${s}[0][auth]    google-bearer-ok
    Nothing Leaked    ${r}

TC-A-PLAY-002 A Play lifetime purchase returns pro_lifetime; a cancelled yearly still in its paid period stays Pro
    [Tags]    regression    integration    P1
    ${r}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro_lifetime", "kind": "product"}    play_lifetime
    Token Should Be    ${r}    pro_lifetime    play
    ${p}=    Upstream Calls    ${r}    GET    /purchases/products/pro_lifetime/tokens/${PTOKEN}
    Length Should Be    ${p}    1
    ${c}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_sub_canceled_in_period
    Token Should Be    ${c}    pro_yearly    play
    Should Be Equal As Integers    ${c}[ttl]    604800

TC-A-PLAY-003 Expired, revoked (410) and refunded Play purchases are refused with 403
    [Tags]    regression    integration    P1
    ${e}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_sub_expired
    API Error Should Be    ${e}    403    expired
    ${g}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_sub_gone_410
    Should Be Equal As Integers    ${g}[status]    403
    FOR    ${sc}    IN    play_lifetime_refunded    play_lifetime_refundable_zero
        ${f}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro_lifetime", "kind": "product"}    ${sc}
        API Error Should Be    ${f}    403    refunded
    END

TC-A-PLAY-004 Unknown product, a missing service account and a Google 404 are answered without a token or a logged purchase token
    [Tags]    regression    integration    P2
    ${u}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "other", "kind": "product"}    play_lifetime
    Should Be Equal As Integers    ${u}[status]    400
    ${k}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "product"}    play_lifetime
    Should Be Equal As Integers    ${k}[status]    400
    ${n}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_sub_active    env={"GOOGLE_PLAY_SA_KEY": null}
    API Error Should Be    ${n}    503    unavailable
    No Upstream Calls    ${n}
    ${nf}=    Call API    POST    /api/v1/play/verify    {"purchaseToken": "${PTOKEN}", "productId": "pro", "kind": "subscription"}    play_404
    API Error Should Be    ${nf}    400    invalid_key
    Nothing Leaked    ${nf}
