*** Settings ***
Documentation     Shared keywords of the site-wide suites (My Plan, pricing, Pro, ads, legal, SEO, navigation).
Resource          common.resource
Library           ../libraries/WebSiteLib.py

*** Variables ***
${BACKUPS}        ${DATA}${/}web${/}backups
${FILE_INPUT}     css=input[type="file"][aria-label="Backup file"]
${STATUS}         css=main p[role="status"]
${PROD}           https://finealth.teiqtools.com

*** Keywords ***
Open Pro Build Without Licence
    [Documentation]    Opens the test-key Pro build (it trusts a throwaway licence key and has no licence API behind
    ...    it) with an empty browser storage, i.e. a free visitor on a site where Restore Pro is switched on.
    [Arguments]    ${path}=/
    Skip If    '${PRO_TOKEN}' == ''    No Pro test token: run node tests/automation/tools/build-pro-site.mjs first
    Open Finealth    ${path}    base=${PRO_URL}

Restore Backup File
    [Documentation]    Chooses ${file} in the Restore from file input on My Plan (the same input the button opens).
    [Arguments]    ${file}
    Choose File    ${FILE_INPUT}    ${file}

Restore Message Should Be
    [Arguments]    ${text}
    Wait Until Element Is Visible    ${STATUS}
    Wait Until Keyword Succeeds    5s    0.3s    Element Text Should Be    ${STATUS}    ${text}

Fetch OK
    [Documentation]    GETs ${path} from the website and returns the body (fails unless HTTP 200).
    [Arguments]    ${path}    ${base}=${BASE_URL}
    ${r}=    Fetch Text    ${base}${path}
    Should Be Equal As Integers    ${r}[status]    200    GET ${path} answered ${r}[status]
    RETURN    ${r}[text]

Pro Badge Should Show
    Wait Until Page Contains Element    css=[data-testid="pro-badge"]    15s
    Page Should Not Contain Element    css=[data-testid="go-pro"]

Free Plan Should Show
    Wait Until Page Contains Element    css=[data-testid="go-pro"]    15s
    Page Should Not Contain Element    css=[data-testid="pro-badge"]

Ad Script Count Should Be
    [Arguments]    ${n}
    ${c}=    Get Element Count    css=script[src*="googlesyndication"]
    Should Be Equal As Integers    ${c}    ${n}    Expected ${n} AdSense script(s), found ${c}
