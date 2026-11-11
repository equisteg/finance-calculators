*** Settings ***
Documentation     SEO (feature: SEO, REQ-017): sitemap.xml, robots.txt, unique titles and descriptions, canonical URLs on
...               the production host with a trailing slash, noindex on private pages, and the JSON-LD that names
...               Equisteg as publisher. Reads the pre-rendered HTML the static build serves (what a crawler gets).
...               Test cases: tests/cases/test-cases.xlsx, sheet "Test Cases" (fragment tests/cases/fragments/web-site.json).
Resource          ../../resources/web-site.resource
Test Teardown     Close Finealth
Test Tags         web    seo

*** Variables ***
${NOINDEX}        %{FH_NOINDEX_BUILD=}

*** Keywords ***
Sitemap Pages
    ${xml}=    Fetch OK    /sitemap.xml
    ${locs}=    Sitemap Locations    ${xml}
    RETURN    ${locs}

Local Path
    [Arguments]    ${loc}
    ${p}=    Evaluate    $loc.replace($PROD, '') or '/'
    RETURN    ${p}

*** Test Cases ***
TC-W-SEO-001 sitemap.xml lists the planners, every tool, pricing and the legal pages, and leaves out private pages
    [Tags]    sanity    regression    P1
    ${xml}=    Fetch OK    /sitemap.xml
    Should Start With    ${xml}    <?xml version="1.0" encoding="UTF-8"?>
    ${locs}=    Sitemap Locations    ${xml}
    FOR    ${p}    IN    /    /health-check/    /debt-payoff/    /goal-planner/    /retirement-planner/    /loan-prepayment/    /pricing/
    ...    /tools/    /privacy/    /terms/    /refund/    /contact/    /about/    /tools/australia-income-tax-calculator/
        List Should Contain Value    ${locs}    ${PROD}${p}
    END
    List Should Not Contain Value    ${locs}    ${PROD}/pro/
    List Should Not Contain Value    ${locs}    ${PROD}/my-plan/
    ${bad}=    Evaluate    [l for l in $locs if not l.startswith($PROD + '/') or not l.endswith('/')]
    Should Be Empty    ${bad}    Not on the production host with a trailing slash: ${bad}
    List Should Not Contain Duplicates    ${locs}
    ${tools}=    Evaluate    len([l for l in $locs if l.startswith($PROD + '/tools/') and l != $PROD + '/tools/'])
    Open Finealth    /tools/
    ${cards}=    Get Element Count    css=[data-testid^="tool-card-"]
    Should Be Equal As Integers    ${tools}    ${cards}    The sitemap lists ${tools} tools, All tools shows ${cards}
    Should Contain    ${xml}    <loc>${PROD}/health-check/</loc>\n<changefreq>monthly</changefreq>\n<priority>1</priority>

TC-W-SEO-002 robots.txt allows crawling, keeps /pro/ and /my-plan/ out and points to the sitemap
    [Tags]    regression    P2
    ${txt}=    Fetch OK    /robots.txt
    Should Contain    ${txt}    User-Agent: *
    Should Contain    ${txt}    Allow: /
    Should Contain    ${txt}    Disallow: /pro/
    Should Contain    ${txt}    Disallow: /my-plan/
    Should Contain    ${txt}    Sitemap: ${PROD}/sitemap.xml
    Should Not Match Regexp    ${txt}    (?m)^Disallow: /$

TC-W-SEO-003 A staging build (NEXT_PUBLIC_NOINDEX=1) blocks all crawling and marks pages noindex
    [Tags]    regression    P2
    Skip If    '${NOINDEX}' == ''    Needs a separate build with NEXT_PUBLIC_NOINDEX=1 (the staging build); the local build is the production variant. Run with FH_NOINDEX_BUILD=1 and --base-url pointing at staging
    ${txt}=    Fetch OK    /robots.txt
    Should Match Regexp    ${txt}    (?m)^Disallow: /$
    Should Not Contain    ${txt}    Sitemap:
    ${html}=    Fetch OK    /health-check/
    ${t}=    Parse Head Tags    ${html}
    List Should Contain Value    ${t}[robots]    noindex, nofollow

TC-W-SEO-004 Every page in the sitemap has a unique "… · Finealth" title, a description and a canonical to itself
    [Tags]    regression    P2
    ${locs}=    Sitemap Pages
    ${titles}=    Create List
    ${descs}=    Create List
    ${problems}=    Create List
    FOR    ${loc}    IN    @{locs}
        IF    '${loc}' == '${PROD}/'    CONTINUE
        ${path}=    Local Path    ${loc}
        ${html}=    Fetch OK    ${path}
        ${t}=    Parse Head Tags    ${html}
        IF    not $t['title'].endswith(' · Finealth')    Append To List    ${problems}    ${path}: title "${t}[title]"
        IF    $t['canonical'] != $loc    Append To List    ${problems}    ${path}: canonical "${t}[canonical]"
        IF    not $t['description']    Append To List    ${problems}    ${path}: no description
        IF    $t['robots']    Append To List    ${problems}    ${path}: meta robots ${t}[robots]
        Append To List    ${titles}    ${t}[title]
        Append To List    ${descs}    ${t}[description]
    END
    ${dup_t}=    Evaluate    sorted({x for x in $titles if $titles.count(x) > 1})
    ${dup_d}=    Evaluate    sorted({x[:60] for x in $descs if $descs.count(x) > 1})
    ${n}=    Get Length    ${titles}
    Log    ${n} pages checked
    Should Be Empty    ${problems}    SEO problems: ${problems}
    Should Be Empty    ${dup_t}    Duplicate titles: ${dup_t}
    Should Be Empty    ${dup_d}    Duplicate descriptions: ${dup_d}

TC-W-SEO-005 The home page has its own title, description and a canonical to the production home
    [Tags]    regression    P3
    ${html}=    Fetch OK    /
    ${t}=    Parse Head Tags    ${html}
    Should Be Equal    ${t}[title]    Finealth: free financial health check, debt and goal planner
    Should Start With    ${t}[description]    Check your financial health in two minutes
    Should Be Empty    ${t}[robots]
    Should Be Equal    ${t}[canonical]    ${PROD}/    The home page has no canonical link

TC-W-SEO-006 Private and error pages are noindex, carry no canonical and stay out of the sitemap
    [Tags]    regression    P2
    ${locs}=    Sitemap Pages
    FOR    ${path}    IN    /pro/    /my-plan/
        ${html}=    Fetch OK    ${path}
        ${t}=    Parse Head Tags    ${html}
        List Should Contain Value    ${t}[robots]    noindex
        Should Be Empty    ${t}[canonical]
        List Should Not Contain Value    ${locs}    ${PROD}${path}
    END
    ${r}=    Fetch Text    ${BASE_URL}/no-such-page/
    Should Be Equal As Integers    ${r}[status]    404
    ${t}=    Parse Head Tags    ${r}[text]
    Should Be Equal    ${t}[title]    Page not found · Finealth
    Should Contain    ${t}[robots]    noindex, follow
    Should Be Empty    ${t}[canonical]

TC-W-SEO-007 Every page's structured data names Finealth with Equisteg as the publishing Organization
    [Tags]    sanity    regression    P1
    Open Finealth    /
    FOR    ${path}    IN    /    /health-check/    /tools/australia-income-tax-calculator/    /pricing/    /about/    /no-such-page/
        Go To Page    ${path}
        ${blocks}=    Get JSON-LD Blocks
        ${apps}=    Evaluate    [b for b in $blocks if b.get('@type') == 'WebApplication']
        Length Should Be    ${apps}    1    ${path} should have one WebApplication block
        Should Be Equal    ${apps}[0][name]    Finealth
        Should Be Equal    ${apps}[0][applicationCategory]    FinanceApplication
        Should Be Equal    ${apps}[0][publisher][@type]    Organization
        Should Be Equal    ${apps}[0][publisher][name]    Equisteg
        Should Be Equal    ${apps}[0][publisher][url]    https://equisteg.com
        Page Should Contain Element    css=head meta[name="publisher"][content="Equisteg"]
    END
    Evidence    JSON-LD checked on 6 pages

TC-W-SEO-008 Each indexable planner page has exactly one h1 and the html lang is English
    [Tags]    regression    P3
    Open Finealth    /
    FOR    ${path}    IN    /    /health-check/    /debt-payoff/    /goal-planner/    /retirement-planner/    /loan-prepayment/    /pricing/    /tools/
        Go To Page    ${path}
        ${n}=    Get Element Count    css=h1
        Should Be Equal As Integers    ${n}    1    ${path} has ${n} h1
        Element Attribute Value Should Be    css=html    lang    en
    END

TC-W-SEO-009 The browser tab shows the Finealth icon, not the Next.js default
    [Documentation]    The favicon, the SVG icon and the Apple touch icon are linked from every page and are the Finealth
    ...    mark (terracotta square with a white spark). c30c7d42… is the md5 of the favicon create-next-app ships.
    [Tags]    regression    P3
    Open Finealth    /
    FOR    ${path}    IN    /    /health-check/    /tools/
        Go To Page    ${path}
        Page Should Contain Element    css=head link[rel="icon"][href^="/favicon.ico"]
        Page Should Contain Element    css=head link[rel="icon"][href^="/icon.svg"]
        Page Should Contain Element    css=head link[rel="apple-touch-icon"][href^="/apple-icon.png"]
    END
    ${svg}=    Fetch OK    /icon.svg
    Should Contain    ${svg}    \#d4683f    icon.svg is not the Finealth mark
    ${ico}=    Evaluate    requests.get($BASE_URL + '/favicon.ico', timeout=30)    modules=requests
    Should Be Equal As Integers    ${ico.status_code}    200    /favicon.ico answered ${ico.status_code}
    Should Be True    $ico.content[:4] == b'\\x00\\x00\\x01\\x00'    /favicon.ico is not an ICO file
    ${md5}=    Evaluate    hashlib.md5($ico.content).hexdigest()    modules=hashlib
    Should Not Be Equal    ${md5}    c30c7d42707a47a3f4591831641e50dc    favicon.ico is still the Next.js default
    ${apple}=    Fetch Text    ${BASE_URL}/apple-icon.png
    Should Be Equal As Integers    ${apple}[status]    200
    Evidence    Finealth icon linked on 3 pages; favicon md5 ${md5}
