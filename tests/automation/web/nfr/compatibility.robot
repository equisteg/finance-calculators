*** Settings ***
Documentation     Non-functional: compatibility (NFR-011 layout at 360 px width: no horizontal scroll; also 320 px and the
...               Android app's screens). Test cases: tests/cases/test-cases.xlsx (fragment tests/cases/fragments/nonfunctional.json).
Resource          ../../resources/nonfunctional.resource
Test Teardown     Close Finealth
Test Tags         web    nfr    compatibility

*** Variables ***

*** Test Cases ***
TC-N-COMP-001 Twenty key pages at 360 px have no sideways scroll
    [Tags]    sanity    regression    P1
    Open Finealth    /
    No Sideways Scroll On Key Pages    360

TC-N-COMP-002 Twenty key pages at 320 px have no sideways scroll
    [Tags]    regression    P2
    Open Finealth    /
    No Sideways Scroll On Key Pages    320

TC-N-COMP-003 Planner figures fit their tiles at 360 px (no text spilling out of a result box)
    [Tags]    regression    P2
    Open Finealth    /
    Set Window Width    360    800
    FOR    ${path}    IN    @{PLANNERS}
        Open Key Page    ${path}
        Elements Should Fit Their Boxes    [data-testid="tool-kpis"] *
        Page Has No Horizontal Scroll
    END
    Evidence    Last planner at 360 px

