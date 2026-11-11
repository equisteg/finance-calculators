*** Settings ***
Documentation     Disclaimer and legal pages (feature: Legal, REQ-014 and the terms/disclaimer parts of REQ-021):
...               the disclaimer under every planner, Privacy, Terms, Refund and Contact naming Equisteg with a contact
...               email, the Terms sections, the "How it is worked out" block under a tool result, and the printed report.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    legal

*** Variables ***
${EMAIL}          support@equisteg.com

*** Keywords ***
Legal Page Should Name Equisteg
    [Arguments]    ${path}    ${heading}
    Go To Page    ${path}
    Heading Should Contain    ${heading}
    Main Text Should Contain    Last updated 9 November 2026
    Main Text Should Contain    Equisteg
    Page Should Contain Element    xpath=//main//a[@href="mailto:${EMAIL}"]
    Element Should Contain    css=footer    A product by Equisteg
    Evidence    ${path}: Equisteg and ${EMAIL}

*** Test Cases ***
TC-W-LEG-001 The disclaimer is visible and readable under every planner
    [Tags]    sanity    regression    P1
    Open Finealth    /
    FOR    ${path}    IN    /health-check/    /debt-payoff/    /goal-planner/    /retirement-planner/    /loan-prepayment/
        Go To Page    ${path}
        Disclaimer Should Be Visible
        Element Should Contain    ${DISCLAIMER}    not financial, tax, investment or legal advice
        Element Should Contain    ${DISCLAIMER}    may contain errors
        ${size}=    Get Computed Style    [data-testid="disclaimer"]    fontSize
        ${px}=    Number From Text    ${size}
        Should Be True    ${px} >= 14    Disclaimer on ${path} is ${size}
        ${fg}=    Get Computed Style    [data-testid="disclaimer"]    color
        Should Not Be Equal    ${fg}    rgba(0, 0, 0, 0)
        Evidence    Disclaimer on ${path}
    END

TC-W-LEG-002 Privacy, Terms and Contact name Equisteg as the legal entity and give a contact email
    [Tags]    regression    P2
    Open Finealth    /privacy/
    Legal Page Should Name Equisteg    /privacy/    Privacy policy
    Main Text Should Contain    Equisteg ("we") makes Finealth.
    Legal Page Should Name Equisteg    /terms/    Terms of use
    Main Text Should Contain    These terms are an agreement between you and Equisteg
    Legal Page Should Name Equisteg    /contact/    Contact
    Main Text Should Contain    We reply within two working days.
    Main Text Should Contain    Business details

TC-W-LEG-003 The Refund page names Equisteg and states the 14-day refund, cancelling and Android rules
    [Tags]    regression    P2
    Open Finealth    /refund/
    Heading Should Contain    Refunds & cancellation
    FOR    ${h}    IN    14-day refund    Cancelling Pro Yearly    Android purchases    Calculation errors    After a refund
        Heading Should Contain    ${h}    level=2
    END
    Main Text Should Contain    within 14 days of paying
    Page Should Contain Element    xpath=//main//a[@href="mailto:${EMAIL}"]
    Evidence    Refund page sections
    Main Text Should Contain    Equisteg

TC-W-LEG-004 Terms carry the no-advice, accuracy, warranty, liability, indemnity and statutory-rights sections
    [Tags]    regression    P2
    Open Finealth    /terms/
    ${hs}=    Get WebElements    css=main h2
    ${names}=    Evaluate    [h.text for h in $hs]
    Should Be Equal    ${names}    ${{ ['1. Information, not advice', '2. Accuracy and estimates', '3. Your responsibilities', '4. Finealth Pro', '5. Acceptable use', '6. No warranty', '7. Limitation of liability', '8. Indemnity', '9. Your statutory rights', '10. Links to other sites', '11. Changes, law and disputes'] }}
    Evidence    Eleven sections in order

TC-W-LEG-005 A tool result is followed by how it is worked out, rates last checked, not covered, the official source, report a mistake and the disclaimer
    [Tags]    sanity    regression    P1
    Open Finealth    /tools/australia-income-tax-calculator/
    Test Id Should Contain    tool-result    $17,520
    ${src}=    Set Variable    css=[data-testid="tool-source"]
    Element Should Contain    ${src}    How it is worked out.
    Element Should Contain    ${src}    ATO resident rates from 1 July 2026
    Element Should Contain    ${src}    Rates last checked: 9 November 2026
    Element Should Contain    ${src}    Not covered:
    Element Attribute Value Should Be    xpath=//*[@data-testid="tool-source"]//a[normalize-space(.)="ATO simple tax calculator"]    href    https://www.ato.gov.au/calculators-and-tools/simple-tax-calculator
    Element Attribute Value Should Be    xpath=//*[@data-testid="tool-source"]//a[normalize-space(.)="ATO simple tax calculator"]    rel    noopener noreferrer
    Element Should Contain    ${src}    Found a mistake?
    Element Attribute Value Should Be    xpath=//*[@data-testid="tool-source"]//a[normalize-space(.)="Tell us"]    href    ${BASE_URL}/contact/
    Disclaimer Should Be Visible
    ${order}=    Execute Javascript    const r = document.querySelector('[data-testid="tool-result"]'), s = document.querySelector('[data-testid="tool-source"]'), d = document.querySelector('[data-testid="disclaimer"]'); return !!(r.compareDocumentPosition(s) & 4) && !!(s.compareDocumentPosition(d) & 4);
    Should Be True    ${order}    Expected result, then the source block, then the disclaimer
    Evidence    Source block and disclaimer under the result

TC-W-LEG-006 Printing the Pro health report hides the header, footer, inputs and ads and prints dark text on white
    [Tags]    regression    P2
    Open Finealth Pro    /health-check/
    Element Should Be Visible    css=[data-testid="print-report"]
    Emulate Media    print
    Sleep    1s    reason=the body colours have a short transition; a real print renders the end state
    ${h}=    Is Element Displayed    header
    Should Not Be True    ${h}    The header prints
    ${f}=    Is Element Displayed    footer
    Should Not Be True    ${f}    The footer prints
    ${i}=    Is Element Displayed    [data-testid="in-income"]
    Should Not Be True    ${i}    The inputs print
    ${bg}=    Get Computed Style    body    backgroundColor
    Should Be Equal    ${bg}    rgb(255, 255, 255)
    ${fg}=    Get Computed Style    [data-testid="health-score"]    color
    Should Be Equal    ${fg}    rgb(0, 0, 0)
    ${pl}=    Is Element Displayed    [data-testid="health-pillars"]
    Should Be True    ${pl}    The pillars are missing from the print
    ${d}=    Is Element Displayed    [data-testid="disclaimer"]
    Should Be True    ${d}    The disclaimer is missing from the print
    Page Should Load No Ad Script
    Evidence    Print view
    Emulate Media    screen

TC-W-LEG-007 Contact collects nothing: no form, an email link only, and a warning never to send card details
    [Tags]    regression    P3
    Open Finealth    /contact/
    ${inputs}=    Get Element Count    css=main input, main textarea, main form
    Should Be Equal As Integers    ${inputs}    0
    Page Should Contain Element    xpath=//main//a[@href="mailto:${EMAIL}"]
    Main Text Should Contain    never your card details
    Main Text Should Not Match    sign in|log in|create an account|password
    Evidence    Contact page: email only

TC-W-LEG-008 At 320 px the tool page disclaimer and source block fit without sideways scroll
    [Tags]    regression    P3
    Open Finealth    /tools/australia-income-tax-calculator/
    Set Window Width    320    800
    Reload Page
    Wait For Page Rendered
    Disclaimer Should Be Visible
    Page Has No Horizontal Scroll
    Elements Should Fit Their Boxes    [data-testid="disclaimer"], [data-testid="tool-source"]
    Evidence    320 px: disclaimer fits
