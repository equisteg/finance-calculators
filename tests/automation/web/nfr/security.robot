*** Settings ***
Documentation     Non-functional: security (NFR-006 the Pro token cannot be forged or tampered, a tampered token falls back
...               to free; NFR-007 no secrets in the repo or the built bundles, 0 findings; security headers, HLD §9).
...               Test cases: tests/cases/test-cases.xlsx (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    security

*** Keywords ***
Page Should Be On The Free Plan
    [Arguments]    ${path}=/health-check/
    Go To Page    ${path}    ${PRO_URL}
    Test Id Text Should Be    health-score    75
    Page Should Contain Element    css=[data-testid="health-pro-gate"]
    Page Should Not Contain Element    css=[data-testid="pro-badge"]
    Page Should Not Contain Element    css=[data-testid="health-pillars"]

Page Header Lines
    [Documentation]    apps/web/public/_headers without its comment lines.
    ${raw}=    Read Repo File    apps/web/public/_headers
    ${h}=    Evaluate    "\\n".join(l.strip() for l in $raw.splitlines() if l.strip() and not l.strip().startswith('#'))
    RETURN    ${h}

*** Test Cases ***
TC-N-SEC-001 A Pro token with a tampered signature is refused and the page falls back to free
    [Tags]    sanity    regression    P1
    Open Finealth Pro    /health-check/
    Element Should Be Visible    css=[data-testid="health-pillars"]
    Evidence    Genuine token: Pro badge and full report
    Tamper Pro Token
    Page Should Be On The Free Plan
    Evidence    Tampered signature: free plan, Pro gate shown, full report gone

TC-N-SEC-002 A Pro token whose claims were edited (lifetime, 10-year expiry) is refused
    [Tags]    regression    P1
    Open Finealth Pro    /health-check/
    ${claims}=    Forge Pro Token Claims    plan=pro_lifetime    exp_years=10
    Log    Forged claims: ${claims}
    Page Should Be On The Free Plan
    Evidence    Edited claims with the old signature: free plan

TC-N-SEC-003 A Pro token signed with someone else's key is refused
    [Tags]    regression    P1
    Open Finealth Pro    /health-check/
    ${claims}=    Store Token Signed By Foreign Key
    Log    Self-signed claims: ${claims}
    Page Should Be On The Free Plan
    Set Local Storage Item    finealth.pro.v1    {"key":"pay_TestKey12345678","plan":"pro_yearly","token":"not-a-token"}
    Page Should Be On The Free Plan
    Evidence    Foreign-key and malformed tokens: free plan

TC-N-SEC-004 Repository secret scan reports 0 findings
    [Tags]    sanity    regression    P1
    ${r}=    Run Process    node    tests/tools/check-forbidden-files.mjs    cwd=${ROOT}    timeout=120s
    Log    ${r.stdout}\n${r.stderr}
    Should Be Equal As Integers    ${r.rc}    0    Secret scan findings: ${r.stdout} ${r.stderr}

TC-N-SEC-005 The built website and Android bundles contain 0 secret-shaped values
    [Tags]    regression    P1
    FOR    ${folder}    IN    apps/web/out    apps/mobile/out
        ${scan}=    Scan Folder For Secrets    ${ROOT}/${folder}
        Log    ${folder}: ${scan}[files] files scanned
        Should Be True    ${scan}[files] > 20    ${folder} looks empty (${scan}[files] files)
        Should Be Empty    ${scan}[findings]    Secret-shaped values in ${folder}: ${scan}[findings]
    END
    ${env}=    Read Repo File    apps/web/.env.example
    Should Not Match Regexp    ${env}    (?m)^NEXT_PUBLIC_\\w*(SECRET|PRIVATE|SIGNING)\\w*=    A secret is exposed through a public NEXT_PUBLIC_ variable

TC-N-SEC-006 Page security headers are defined for the static site (apps/web/public/_headers)
    [Documentation]    The local static server does not apply _headers, so the file the Cloudflare static assets read is
    ...    checked instead (apps/api/wrangler.jsonc: "Page security headers live in apps/web/public/_headers").
    ...    Comment lines are ignored: only real header lines count.
    [Tags]    regression    P1
    ${exists}=    Repo File Exists    apps/web/public/_headers
    Should Be True    ${exists}    apps/web/public/_headers is missing: pages are served without HSTS, X-Frame-Options, nosniff, Referrer-Policy or Permissions-Policy
    ${h}=    Page Header Lines
    Should Match Regexp    ${h}    (?m)^/\\*$    _headers has no "/*" rule for every page
    FOR    ${name}    IN    Strict-Transport-Security    X-Content-Type-Options: nosniff    Referrer-Policy    Permissions-Policy
        Should Contain    ${h.lower()}    ${name.lower()}    _headers does not set ${name}
    END
    Should Match Regexp    ${h.lower()}    frame-ancestors 'none'|x-frame-options:\\s*deny    _headers does not forbid framing
    Should Match Regexp    ${h.lower()}    strict-transport-security:\\s*max-age=(3153600\\d|[4-9]\\d{7})    HSTS max-age is below one year

TC-N-SEC-008 Every page carries a Content-Security-Policy (header or per-page meta)
    [Documentation]    HLD §9 / phase 6: a site-wide CSP in _headers plus per-page hashed <meta> CSP. Tracked as RSK-011.
    [Tags]    regression    P2
    ${h}=    Page Header Lines
    ${html}=    Read Repo File    apps/web/out/health-check/index.html
    ${meta}=    Evaluate    'http-equiv="content-security-policy"' in $html.lower()
    ${header}=    Evaluate    'content-security-policy' in $h.lower()
    Should Be True    ${header} or ${meta}    No Content-Security-Policy for pages: none in apps/web/public/_headers and no CSP meta in the built HTML (RSK-011)
    IF    ${header}    Should Contain    ${h.lower()}    frame-ancestors 'none'

TC-N-SEC-007 API responses carry the security headers and refuse a foreign origin and a non-JSON body
    [Tags]    regression    integration    P2
    ${r}=    Call API    GET    /api/v1/health
    Should Be Equal As Integers    ${r}[status]    200
    ${h}=    Set Variable    ${r}[headers]
    Should Be Equal    ${h}[x-content-type-options]    nosniff
    Should Be Equal    ${h}[x-frame-options]    DENY
    Should Be Equal    ${h}[referrer-policy]    no-referrer
    Should Contain    ${h}[content-security-policy]    frame-ancestors 'none'
    Should Contain    ${h}[strict-transport-security]    max-age=31536000
    Should Be Equal    ${h}[cache-control]    no-store
    ${f}=    Call API    POST    /api/v1/licence/verify    {"key":"pay_TestKey12345678"}    headers={"origin":"https://evil.example"}
    Should Be Equal As Integers    ${f}[status]    403
    Should Be Equal    ${f}[json][error][code]    forbidden_origin
