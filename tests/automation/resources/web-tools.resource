*** Settings ***
Documentation     Keywords shared by the calculators (CALC), tools library (TOOL) and country tax (TAX) suites.
...               A tool page (/tools/<slug>/) has inputs in-<key>, the Result panel tool-result with one Stat per row
...               (the first is tool-primary), heading figures tool-kpis, an optional note tool-note and the
...               "How it is worked out" block tool-source. Stat labels are upper-cased by CSS, so they are matched on
...               the DOM text, not on what Selenium's Get Text returns.
Resource          common.resource
Library           WebToolsLib

*** Variables ***
${RESULT}         css=[data-testid="tool-result"]
${SOURCE}         css=[data-testid="tool-source"]
${NOTE}           css=[data-testid="tool-note"]
${CURRENCY}       css=header select[aria-label="Currency"]

*** Keywords ***
Open Tool
    [Documentation]    Opens /tools/${slug}/ with clean storage (site currency INR) and waits for the result.
    [Arguments]    ${slug}    ${phone}=False    ${width}=1366
    Open Finealth    /tools/${slug}/    phone=${phone}    width=${width}
    Wait Until Element Is Visible    css=[data-testid="tool-primary"]

Go To Tool
    [Arguments]    ${slug}
    Go To Page    /tools/${slug}/
    Wait Until Element Is Visible    css=[data-testid="tool-primary"]

Result Should Show
    [Documentation]    The Result panel shows the figure ${value} under the label ${label} (exact text).
    [Arguments]    ${label}    ${value}
    ${loc}=    Set Variable    xpath=//*[@data-testid="tool-result"]//div[contains(concat(" ", @class, " "), " stat ")][span[1][normalize-space(.)="${label}"]]/span[2]
    Wait Until Page Contains Element    ${loc}    10s    No result row labelled "${label}"
    Wait Until Keyword Succeeds    10s    0.3s    Element Text Should Be    ${loc}    ${value}

Result Value Of
    [Arguments]    ${label}
    ${loc}=    Set Variable    xpath=//*[@data-testid="tool-result"]//div[contains(concat(" ", @class, " "), " stat ")][span[1][normalize-space(.)="${label}"]]/span[2]
    Wait Until Page Contains Element    ${loc}    10s
    ${t}=    Get Text    ${loc}
    RETURN    ${t}

Result Sub Should Contain
    [Documentation]    The small line under the figure labelled ${label} contains ${text}.
    [Arguments]    ${label}    ${text}
    Wait Until Element Contains
    ...    xpath=//*[@data-testid="tool-result"]//div[contains(concat(" ", @class, " "), " stat ")][span[1][normalize-space(.)="${label}"]]/span[3]    ${text}

Result Should Not Show
    [Arguments]    ${label}
    Page Should Not Contain Element
    ...    xpath=//*[@data-testid="tool-result"]//div[contains(concat(" ", @class, " "), " stat ")][span[1][normalize-space(.)="${label}"]]

Number Of Result Rows Should Be
    [Arguments]    ${n}
    Wait Until Keyword Succeeds    5s    0.3s    Page Should Contain Element    css=[data-testid="tool-result"] .stat    limit=${n}

Tool Note Should Be
    [Arguments]    ${text}
    Wait Until Element Is Visible    ${NOTE}
    Wait Until Keyword Succeeds    10s    0.3s    Element Text Should Be    ${NOTE}    ${text}

No Tool Note
    Page Should Not Contain Element    ${NOTE}

Choose Site Currency
    [Documentation]    Picks ${code} in the header Currency list (the only region control).
    [Arguments]    ${code}
    Select From List By Value    ${CURRENCY}    ${code}
    Sleep    0.3s    reason=the page re-renders with the new currency's defaults

Calc Headline Should Be
    [Documentation]    The large figure of a stand-alone calculator (SIP, EMI, compound interest).
    [Arguments]    ${value}
    Wait Until Keyword Succeeds    10s    0.3s    Element Text Should Be    css=.calc-result .gradient-text    ${value}

Calc Row Should Be
    [Documentation]    A labelled line or tile in a stand-alone calculator's result card (labels as written in the DOM).
    [Arguments]    ${label}    ${value}
    ${loc}=    Set Variable    xpath=//div[contains(@class, "calc-result")]//*[span[1][normalize-space(.)="${label}"]]/span[2]
    Wait Until Page Contains Element    ${loc}    10s    No line labelled "${label}"
    Wait Until Keyword Succeeds    10s    0.3s    Element Text Should Be    ${loc}    ${value}

Slider Display Should Be
    [Documentation]    The value shown above the slider labelled ${label}.
    [Arguments]    ${label}    ${value}
    Wait Until Keyword Succeeds    10s    0.3s    Element Text Should Be
    ...    xpath=//input[@type="range" and @aria-label="${label}"]/preceding-sibling::div/span[2]    ${value}

Donut Should Read
    [Arguments]    ${aria}
    Wait Until Keyword Succeeds    10s    0.3s    Element Attribute Value Should Be
    ...    css=.calc-result figure svg[role="img"]    aria-label    ${aria}

Main Should Have No Broken Numbers
    ${t}=    Get Text    ${MAIN}
    Should Not Match Regexp    ${t}    NaN|Infinity|undefined    The page shows a broken number

Enter
    [Documentation]    Set Field with a retry: the page scrolls smoothly, so the floating header can still cover the
    ...    field for a moment when Selenium clicks it.
    [Arguments]    ${name}    ${value}    ${index}=0
    Scroll Field To Centre    ${name}    ${index}
    Wait Until Keyword Succeeds    3x    0.6s    Set Field    ${name}    ${value}    ${index}
