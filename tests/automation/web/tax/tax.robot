*** Settings ***
Documentation     Country tax tools (feature: TAX, REQ-020 with REQ-015): Australia, Canada, Singapore, New Zealand, US
...               (single and married joint), India old vs new regime with age and 80D, HRA, gratuity, world VAT/GST,
...               UK stamp duty and Canada sales tax. Golden numbers from packages/finance-core/src/world.test.ts.
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-tools.json).
Resource          ../../resources/web-tools.resource
Test Teardown     Close Finealth
Test Tags         web    tax

*** Variables ***
@{COUNTRY_TOOLS}    australia-income-tax-calculator    canada-income-tax-calculator    singapore-income-tax-calculator
...                 new-zealand-income-tax-calculator    us-federal-tax-calculator

*** Test Cases ***
TC-W-TAX-001 Australia: A$90,000 taxable gives income tax $17,520 and Medicare $1,800, with source and last-checked date
    [Tags]    sanity    regression    P1
    Open Tool    australia-income-tax-calculator
    Element Should Contain    css=main .eyebrow    AUSTRALIA · TAX & SALARY
    Field Value Should Be    in-g    90000
    Result Should Show    Income tax (after LITO)    $17,520
    Result Should Show    Medicare levy    $1,800
    Result Should Show    Take-home a month    $5,890
    Result Should Show    Effective rate    21.47%
    Test Id Should Contain    tool-source    ATO resident rates from 1 July 2026
    Test Id Should Contain    tool-source    Rates last checked:
    Element Should Contain    ${SOURCE}    ATO simple tax calculator
    Disclaimer Should Be Visible
    Evidence    Australia golden result
    Page Should Have No Console Problems

TC-W-TAX-002 Canada: C$60,000 gives federal tax $5,338, CPP $3,362 and EI $978
    [Tags]    regression    P1
    Open Tool    canada-income-tax-calculator
    Enter    in-g    60000
    Enter    in-p    0
    Result Should Show    Federal tax    $5,338
    Result Should Show    CPP + CPP2    $3,362
    Result Should Show    EI    $978
    Result Should Show    Provincial (estimate)    $0
    Result Should Show    Take-home a month    $4,193
    Evidence    Canada golden result

TC-W-TAX-003 Singapore: S$60,000 citizen pays CPF 12,000, chargeable 47,000, tax 1,040; a foreigner pays no CPF
    [Tags]    regression    P1
    Open Tool    singapore-income-tax-calculator
    Enter    in-g    60000
    Result Should Show    Employee CPF    $12,000
    Result Should Show    Chargeable income    $47,000
    Result Should Show    Income tax    $1,040
    Evidence    Singapore citizen golden result
    Enter    in-cpf    false
    Result Should Show    Employee CPF    $0
    Result Should Show    Chargeable income    $59,000
    Result Should Show    Income tax    $1,880
    Evidence    Not a citizen or PR: no CPF

TC-W-TAX-004 New Zealand: NZ$80,000 gives income tax $16,278 and ACC levy $1,400
    [Tags]    regression    P2
    Open Tool    new-zealand-income-tax-calculator
    Result Should Show    Income tax    $16,278
    Result Should Show    ACC levy    $1,400
    Result Should Show    Effective rate    22.1%
    Evidence    New Zealand golden result

TC-W-TAX-005 US married filing jointly: $150,000 with no state tax gives federal $15,340 and FICA $11,475
    [Tags]    regression    P1
    Open Tool    us-federal-tax-calculator
    Enter    in-g    150000
    Enter    in-status    joint
    Enter    in-s    0
    Result Should Show    Federal income tax    $15,340
    Result Should Show    FICA    $11,475
    Result Should Show    State (estimate)    $0
    Result Should Show    Take-home a month    $10,265
    Evidence    US joint golden result

TC-W-TAX-006 Every country tax tool gives 0 for 0 and for a negative income, with no NaN
    [Tags]    regression    P1
    Open Finealth    /tools/
    FOR    ${slug}    IN    @{COUNTRY_TOOLS}
        Go To Tool    ${slug}
        FOR    ${income}    IN    0    -5000
            Set Value By Script    [data-testid="in-g"]    ${income}
            Result Should Show    Take-home a month    $0
            ${t}=    Tool Result Should Be Clean
            ${amounts}=    Get Regexp Matches    ${t}    [$][\\d,]+
            FOR    ${a}    IN    @{amounts}
                Should Be Equal    ${a}    $0    ${slug} at ${income} shows ${a}: every tax must be $0
            END
            Should Not Contain    ${t}    -$
        END
    END
    Go To Tool    india-tax-regime-calculator
    Set Value By Script    [data-testid="in-gross"]    -5000
    Result Should Show    New regime tax    ₹0
    Result Should Show    Old regime tax    ₹0
    Tool Result Should Be Clean
    Evidence    India regime at a negative salary

TC-W-TAX-007 Thresholds: A$18,000 pays no tax; C$300,000 gets only the minimum basic personal amount 14,829
    [Tags]    regression    P2
    Open Tool    australia-income-tax-calculator
    Enter    in-g    18000
    Result Should Show    Income tax (after LITO)    $0
    Result Should Show    Medicare levy    $0
    Result Should Show    Take-home a month    $1,500
    Evidence    Tax-free threshold
    Go To Tool    canada-income-tax-calculator
    Enter    in-g    300000
    Enter    in-p    0
    Result Should Show    Federal tax    $69,668
    Result Should Show    CPP + CPP2    $4,646
    Result Should Show    EI    $1,123
    Evidence    Canada at C$300,000
    ${bpa}=    Call Engine    caBasicPersonalAmount    300000
    Should Be Equal As Numbers    ${bpa}    14829
    ${bpa_mid}=    Call Engine    caBasicPersonalAmount    100000
    Should Be Equal As Numbers    ${bpa_mid}    16452

TC-W-TAX-008 India regime: 80D self 40,000 and parents 60,000 (parent 60+) allows ₹75,000; old-regime tax ₹1,87,200
    [Tags]    sanity    regression    P1
    Open Tool    india-tax-regime-calculator
    Field Value Should Be    in-gross    1500000
    Field Value Should Be    in-c80    150000
    Enter    in-d80    40000
    Enter    in-d80p    60000
    Enter    in-psen    true
    Result Should Show    80D allowed    ₹75,000
    Result Should Show    Old regime tax    ₹1,87,200
    Result Should Show    New regime tax    ₹97,500
    Result Should Show    Lower tax    New regime
    Result Sub Should Contain    Lower tax    saves ₹89,700
    Test Id Should Contain    tool-source    FY 2025-26
    Element Should Contain    ${SOURCE}    Income Tax Department tax calculator
    Evidence    Separate 80D caps for self and parents

TC-W-TAX-009 India old regime: ₹7,00,000 with no deductions is ₹41,600 for age 60-79 and ₹44,200 below 60
    [Tags]    regression    P1
    Open Tool    india-tax-regime-calculator
    Enter    in-gross    700000
    Enter    in-c80    0
    Enter    in-d80    0
    Result Should Show    Old regime tax    ₹44,200
    Result Should Show    New regime tax    ₹0
    Evidence    Below 60
    Enter    in-age    60to79
    Result Should Show    Old regime tax    ₹41,600
    Evidence    Senior citizen ₹3 lakh exemption

TC-W-TAX-010 India 80D above the cap with no parents is held at ₹25,000 and the parent tick alone adds nothing
    [Tags]    regression    P2
    Open Tool    india-tax-regime-calculator
    Enter    in-d80    40000
    Result Should Show    80D allowed    ₹25,000
    Result Should Show    Old regime tax    ₹2,02,800
    Enter    in-psen    true
    Result Should Show    80D allowed    ₹25,000
    Evidence    Self/family capped at ₹25,000

TC-W-TAX-011 HRA: the exemption is the least of the three limits, metro and non-metro
    [Tags]    regression    P2
    Open Tool    hra-exemption-calculator
    Result Should Show    Tax-free HRA    ₹2,40,000
    Result Should Show    Taxable HRA    ₹0
    Tool Note Should Be    Least of: HRA received ₹2,40,000; rent − 10% of basic ₹2,40,000; 50% of basic ₹3,00,000.
    Evidence    Metro defaults
    Enter    in-rent    200000
    Enter    in-metro    false
    Result Should Show    Tax-free HRA    ₹1,40,000
    Result Should Show    Taxable HRA    ₹1,00,000
    Tool Note Should Be    Least of: HRA received ₹2,40,000; rent − 10% of basic ₹1,40,000; 40% of basic ₹2,40,000.
    Evidence    Non-metro, lower rent

TC-W-TAX-012 Gratuity: 10 y 7 m counts 11 years, 10 y 6 m counts 10, and ₹10,00,000 × 40 years is capped at ₹20 lakh
    [Tags]    regression    P2
    Open Tool    gratuity-calculator
    Result Should Show    Gratuity    ₹3,17,308
    Result Should Show    Years counted    11
    Evidence    10 years 7 months
    Enter    in-m    6
    Result Should Show    Years counted    10
    Result Should Show    Gratuity    ₹2,88,462
    Evidence    10 years 6 months
    Enter    in-wage    1000000
    Enter    in-y    40
    Enter    in-m    0
    Result Should Show    Gratuity    ₹20,00,000
    Tool Note Should Be    Capped at ₹20 lakh, the statutory ceiling.
    Evidence    Statutory ceiling

TC-W-TAX-013 Gratuity under 5 years still computes and warns that 5 years' service is usually needed
    [Tags]    regression    P3
    Open Tool    gratuity-calculator
    Enter    in-y    3
    Enter    in-m    0
    Result Should Show    Gratuity    ₹86,538
    Tool Note Should Be    Usually needs 5 years’ service (1 year for fixed-term staff under the Code on Social Security), except on death or disablement.
    Evidence    Under 5 years

TC-W-TAX-014 World VAT: Germany 119 tax-inclusive is VAT 19.00 on 100.00; India 11,800 inclusive is GST 1,800.00
    [Tags]    sanity    regression    P1
    Open Tool    world-vat-gst-calculator
    Result Should Show    VAT at 20%    200.00
    Enter    in-c    DE
    Enter    in-amt    119
    Enter    in-incl    true
    Result Should Show    VAT at 19%    19.00
    Result Should Show    Net    100.00
    Result Should Show    Gross    119.00
    Evidence    Germany tax-inclusive
    Enter    in-c    IN
    Enter    in-amt    11800
    Result Should Show    GST at 18%    1,800.00
    Result Should Show    Net    10,000.00
    Tool Note Should Be    Most goods and services; 5% merit rate and 40% demerit rate also apply
    Evidence    India GST tax-inclusive with the slab note

TC-W-TAX-015 World VAT country list: all 27 EU member states at the EU table's rates, as many countries as /tools/ promises, no Pakistan
    [Tags]    regression    P1
    Open Finealth    /tools/
    ${eyebrow}=    Get Text    css=main .eyebrow
    ${promised}=    Get Regexp Matches    ${eyebrow}    (\\d+) VAT RATES    1
    Go To Tool    world-vat-gst-calculator
    ${opts}=    Get WebElements    css=[data-testid="in-c"] option
    ${n}=    Get Length    ${opts}
    Should Be True    ${n} >= 60    The tool page promises 60+ countries, the list has ${n}
    Should Be Equal As Integers    ${n}    ${promised}[0]    The /tools/ page promises ${promised}[0] VAT rates but the country list has ${n}
    ${codes}=    Get List Items    css=[data-testid="in-c"]    values=True
    ${labels}=    Get List Items    css=[data-testid="in-c"]
    ${eu}=    Evaluate    {'AT':20,'BE':21,'BG':20,'HR':25,'CY':19,'CZ':21,'DK':25,'EE':24,'FI':25.5,'FR':20,'DE':19,'GR':24,'HU':27,'IE':23,'IT':22,'LV':21,'LT':21,'LU':17,'MT':18,'NL':21,'PL':23,'PT':23,'RO':21,'SK':23,'SI':22,'ES':21,'SE':25}
    ${eu_count}=    Get Length    ${eu}
    Should Be Equal As Integers    ${eu_count}    27
    FOR    ${code}    ${rate}    IN    &{eu}
        List Should Contain Value    ${codes}    ${code}    EU member ${code} missing from the VAT list
        ${i}=    Get Index From List    ${codes}    ${code}
        ${rate_txt}=    Evaluate    ('%g' % ${rate})
        Should Contain    ${labels}[${i}]    (${rate_txt}%    ${code} label ${labels}[${i}] should show ${rate_txt} %
    END
    ${all}=    Catenate    SEPARATOR=|    @{labels}
    Should Not Match Regexp    ${all}    (?i)pakistan
    List Should Not Contain Value    ${codes}    PK
    Evidence    66 countries incl. all EU members

TC-W-TAX-016 UK stamp duty: £300,000 home mover is £5,000; non-UK resident adds exactly £6,000; relief stops above £500,000
    [Tags]    regression    P2
    Open Tool    uk-stamp-duty-calculator
    Enter    in-price    300000
    Result Should Show    Stamp duty    £5,000
    Result Should Show    Effective rate    1.67%
    Enter    in-nonres    true
    Result Should Show    Stamp duty    £11,000
    Evidence    Non-resident surcharge +£6,000
    Enter    in-nonres    false
    Enter    in-buyer    first-time
    Result Should Show    Stamp duty    £0
    No Tool Note
    Enter    in-price    600000
    Result Should Show    Stamp duty    £20,000
    Tool Note Should Be    First-time buyer relief only applies up to £500,000, so standard rates are used.
    Element Should Contain    ${SOURCE}    Scotland (LBTT) and Wales (LTT) differ
    Evidence    First-time buyer above £500,000

TC-W-TAX-017 Canada sales tax: Ontario HST 13 % on $100 is $113.00; Quebec GST + QST is $114.98; Alberta GST only $105.00
    [Tags]    regression    P2
    Open Tool    canada-sales-tax-calculator
    Result Should Show    HST 13%    $13.00
    Result Should Show    Total    $113.00
    Result Should Not Show    GST 5%
    Enter    in-prov    QC
    Result Should Show    GST 5%    $5.00
    Result Should Show    QST 9.975%    $9.98
    Result Should Show    Total    $114.98
    Enter    in-prov    AB
    Result Should Show    No provincial tax    $0.00
    Result Should Show    Total    $105.00
    Evidence    Province by province

TC-W-TAX-018 Every statutory tool shows the rates-last-checked date; the official link opens safely in a new tab
    [Tags]    regression    P2
    Open Finealth    /tools/
    ${disclaimer}=    Get Text    css=[data-testid="tools-disclaimer"]
    ${date}=    Get Regexp Matches    ${disclaimer}    \\((\\d{1,2} [A-Z][a-z]+ \\d{4})\\)    1
    Should Not Be Empty    ${date}
    FOR    ${slug}    IN    ppf-calculator    uk-stamp-duty-calculator    india-tax-regime-calculator    hra-exemption-calculator
    ...    gratuity-calculator    us-federal-tax-calculator    australia-income-tax-calculator    canada-income-tax-calculator
    ...    singapore-income-tax-calculator    new-zealand-income-tax-calculator    world-vat-gst-calculator    canada-sales-tax-calculator
        Go To Tool    ${slug}
        Element Should Contain    ${SOURCE}    Rates last checked: ${date}[0]
        ${links}=    Get WebElements    css=[data-testid="tool-source"] a[target="_blank"]
        FOR    ${a}    IN    @{links}
            ${rel}=    Get Element Attribute    ${a}    rel
            Should Contain    ${rel}    noopener
            ${href}=    Get Element Attribute    ${a}    href
            Should Start With    ${href}    https://
        END
    END
    Go To Tool    salary-converter
    Element Should Not Contain    ${SOURCE}    Rates last checked
    Evidence    Statutory tools carry the date; the salary converter does not
