*** Settings ***
Documentation     Pricing and checkout (feature: Pricing, REQ-011 pricing and checkout, REQ-021 payment acknowledgement):
...               plans and prices in ₹ and US$, the estimates-only acknowledgement, "Coming soon" while Razorpay is off,
...               a paid checkout still being confirmed, and the page for a browser that already has Pro.
...               Real Razorpay test-mode purchases need a build with NEXT_PUBLIC_RAZORPAY_ENABLED=1 and a running API
...               (staging in Razorpay test mode): those tests skip unless the RAZORPAY_TEST environment variable is 1.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    pricing

*** Variables ***
${RZP}            %{RAZORPAY_TEST=}
${NO_RZP}         Needs Razorpay test mode: a build with NEXT_PUBLIC_RAZORPAY_ENABLED=1, the licence key and a running API (set RAZORPAY_TEST=1 and --base-url to that staging site)

*** Test Cases ***
TC-W-PRC-001 Plans and prices in rupees: Free ₹0, Yearly ₹199, Lifetime ₹499, Monthly only on Android
    [Tags]    sanity    regression    P1
    Open Finealth    /pricing/
    Heading Should Contain    Free to check. Pro to plan.
    Main Text Should Contain    Prices in Indian rupees, including GST.
    Element Attribute Value Should Be    xpath=//*[@data-testid="currency-toggle"]//button[normalize-space(.)="₹ INR"]    aria-pressed    true
    Main Text Should Contain    ₹0
    Test Id Text Should Be    price-yearly    ₹199
    Main Text Should Contain    per year · about ₹17 a month
    Test Id Text Should Be    price-lifetime    ₹499
    Main Text Should Contain    one payment, yours forever
    Main Text Should Contain    Monthly (₹29 per month, cancel any time) is available in the Android app only
    ${feat}=    Get Element Count    xpath=//main//h2[starts-with(normalize-space(.), "Pro · Yearly")]/following-sibling::ul/li
    Should Be Equal As Integers    ${feat}    8    "Everything in Free, plus:" and the 7 Pro features
    Main Text Should Contain    Retirement odds.
    Evidence    Plans in rupees

TC-W-PRC-002 Switching Pay in to US$ shows the international prices
    [Tags]    regression    P2
    Open Finealth    /pricing/
    Click Element    xpath=//*[@data-testid="currency-toggle"]//button[normalize-space(.)="US$ USD"]
    Test Id Text Should Be    price-yearly    US$7.99
    Test Id Text Should Be    price-lifetime    US$19.99
    Main Text Should Contain    Prices in US dollars.
    Main Text Should Contain    $0
    Main Text Should Contain    Monthly (US$0.99 per month, cancel any time) is available in the Android app only
    Element Should Contain    css=[data-testid="price-compare"]    US$7.99 a year
    Element Attribute Value Should Be    xpath=//*[@data-testid="currency-toggle"]//button[normalize-space(.)="US$ USD"]    aria-pressed    true
    Evidence    Plans in US dollars
    Click Element    xpath=//*[@data-testid="currency-toggle"]//button[normalize-space(.)="₹ INR"]
    Test Id Text Should Be    price-yearly    ₹199

TC-W-PRC-003 While Razorpay is switched off both buy buttons are disabled "Coming soon", even after ticking the box
    [Tags]    regression    P1
    Open Finealth    /pricing/
    Element Text Should Be    css=[data-testid="buy-yearly"]    Coming soon
    Element Text Should Be    css=[data-testid="buy-lifetime"]    Coming soon
    Element Should Be Disabled    css=[data-testid="buy-yearly"]
    Element Should Be Disabled    css=[data-testid="buy-lifetime"]
    Get Network Requests
    Click Element    css=[data-testid="pay-ack-box"]
    Checkbox Should Be Selected    css=[data-testid="pay-ack-box"]
    Element Should Be Disabled    css=[data-testid="buy-yearly"]
    Element Should Be Disabled    css=[data-testid="buy-lifetime"]
    Run Keyword And Ignore Error    Click Element    css=[data-testid="buy-lifetime"]
    Wait For Network Idle
    ${reqs}=    Get Network Requests
    ${rzp}=    Evaluate    [r['url'] for r in $reqs if 'razorpay' in r['url'] or '/api/v1/checkout' in r['url']]
    Should Be Empty    ${rzp}    Checkout was contacted: ${rzp}
    Page Should Not Contain Element    css=iframe.razorpay-checkout-frame
    Evidence    Coming soon, no checkout opened

TC-W-PRC-004 The estimates-only acknowledgement is unticked by default and links to Terms and Refund policy
    [Tags]    sanity    regression    P1
    Open Finealth    /pricing/
    Element Should Be Visible    css=[data-testid="pay-ack"]
    Checkbox Should Not Be Selected    css=[data-testid="pay-ack-box"]
    Element Should Contain    css=[data-testid="pay-ack"]    estimates for information only
    Element Should Contain    css=[data-testid="pay-ack"]    not financial, investment, tax or legal advice
    Element Should Contain    css=[data-testid="pay-ack"]    results can contain errors and tax rates can change
    Element Should Contain    css=[data-testid="pay-ack"]    I agree to the Terms and the Refund & cancellation policy.
    Element Attribute Value Should Be    xpath=//*[@data-testid="pay-ack"]//a[normalize-space(.)="Terms"]    href    ${BASE_URL}/terms/
    Element Attribute Value Should Be    xpath=//*[@data-testid="pay-ack"]//a[normalize-space(.)="Refund & cancellation policy"]    href    ${BASE_URL}/refund/
    Evidence    Acknowledgement unticked
    Click Element    css=[data-testid="pay-ack-box"]
    Checkbox Should Be Selected    css=[data-testid="pay-ack-box"]
    Click Element    css=[data-testid="pay-ack-box"]
    Checkbox Should Not Be Selected    css=[data-testid="pay-ack-box"]
    Click Element    xpath=//*[@data-testid="pay-ack"]//a[normalize-space(.)="Terms"]
    Wait Until Location Contains    /terms/
    Heading Should Contain    Terms of use

TC-W-PRC-005 With checkout on, Buy stays disabled with a hint until the acknowledgement is ticked
    [Tags]    regression    integration    P1
    Skip If    '${RZP}' != '1'    ${NO_RZP}
    Open Finealth    /pricing/
    Checkbox Should Not Be Selected    css=[data-testid="pay-ack-box"]
    Element Should Be Disabled    css=[data-testid="buy-yearly"]
    Element Attribute Value Should Be    css=[data-testid="buy-yearly"]    title    Tick the box above the plans first
    Element Text Should Be    css=[data-testid="buy-yearly"]    Buy yearly · ₹199
    Element Text Should Be    css=[data-testid="buy-lifetime"]    Buy lifetime · ₹499
    Page Should Not Contain Element    css=iframe.razorpay-checkout-frame
    Click Element    css=[data-testid="pay-ack-box"]
    Element Should Be Enabled    css=[data-testid="buy-yearly"]
    Element Should Be Enabled    css=[data-testid="buy-lifetime"]
    Evidence    Buy enabled only after ticking

TC-W-PRC-006 Buying Lifetime with a Razorpay test card switches Pro on and shows the licence key with Copy
    [Tags]    regression    integration    P1
    Skip If    '${RZP}' != '1'    ${NO_RZP}
    Open Finealth    /pricing/
    Click Element    css=[data-testid="pay-ack-box"]
    Click Element    css=[data-testid="buy-lifetime"]
    Wait Until Element Is Visible    css=iframe.razorpay-checkout-frame    30s
    Select Frame    css=iframe.razorpay-checkout-frame
    Wait Until Page Contains    Card    30s
    Click Element    xpath=//*[normalize-space(.)="Card"]
    Input Text    css=input[name="card.number"]    4111111111111111
    Input Text    css=input[name="card.expiry"]    12 / 30
    Input Text    css=input[name="card.cvv"]    123
    Click Element    xpath=//button[contains(., "Pay")]
    Unselect Frame
    Wait Until Element Is Visible    css=[data-testid="checkout-success"]    120s
    Element Should Contain    css=[data-testid="checkout-success"]    Pro is active.
    ${key}=    Get Text    css=[data-testid="licence-key-display"]
    Should Match Regexp    ${key}    ^pay_[A-Za-z0-9]{8,40}$
    Element Should Be Visible    css=[data-testid="copy-key"]
    Pro Badge Should Show
    Evidence    Paid with a test card: Pro on, key ${key}

TC-W-PRC-007 A paid checkout that was never confirmed is kept and shown on Restore Pro on the next visit
    [Tags]    regression    P2
    Open Pro Build Without Licence    /
    Set Local Storage Item    finealth.pending.v1    {"pendingId":"pay_PendTest12345","orderId":"order_PendTest1234","signature":"sigTest123","plan":"pro_lifetime"}
    Go To Page    /pro/    base=${PRO_URL}
    Test Id Should Contain    pending-confirm    A payment is still being confirmed in this browser (ID pay_PendTest12345).
    Test Id Should Contain    pending-confirm    Pro switches on by itself once it is confirmed; you can also paste this ID above.
    Free Plan Should Show
    ${p}=    Get Local Storage Item    finealth.pending.v1
    Should Contain    ${p}    pay_PendTest12345
    Evidence    Pending payment shown with its ID; kept while the API cannot confirm it

TC-W-PRC-008 Pro already active: no acknowledgement box and both buttons read "Pro is active"
    [Tags]    regression    P2
    Open Finealth Pro    /pricing/
    Page Should Not Contain Element    css=[data-testid="pay-ack"]
    ${n}=    Get Element Count    xpath=//main//span[@aria-disabled="true" and normalize-space(.)="Pro is active"]
    Should Be Equal As Integers    ${n}    2
    Page Should Not Contain Element    css=[data-testid="buy-yearly"]
    Main Text Should Contain    Pro is active in this browser.
    Evidence    Pricing with Pro active

TC-W-PRC-009 Price comparison and questions are shown with the same prices
    [Tags]    regression    P3
    Open Finealth    /pricing/
    ${rows}=    Get Element Count    css=[data-testid="price-compare"] .stat
    Should Be Equal As Integers    ${rows}    4
    Element Should Contain    css=[data-testid="price-compare"]    checked 9 November 2026
    Element Should Contain    css=[data-testid="price-compare"]    ₹199 a year
    Element Should Contain    css=[data-testid="price-compare"]    or ₹499 for life
    ${q}=    Get Element Count    css=main dl dt
    Should Be Equal As Integers    ${q}    6
    Main Text Should Contain    Is this financial advice?
    Main Text Should Contain    It does not recommend products or tell you what to buy.
    Evidence    Comparison and questions

TC-W-PRC-010 A damaged pending-checkout record is ignored
    [Tags]    regression    P3
    Open Pro Build Without Licence    /
    Set Local Storage Item    finealth.pending.v1    {"pendingId":"order_bad","signature":""}
    Go To Page    /pro/    base=${PRO_URL}
    Wait Until Element Is Visible    css=[data-testid="licence-key"]
    Page Should Not Contain Element    css=[data-testid="pending-confirm"]
    Free Plan Should Show
    Evidence    No pending notice for a damaged record
    Page Should Have No Console Problems
