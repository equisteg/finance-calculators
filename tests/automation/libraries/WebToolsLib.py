"""Keywords for the calculators, tools library and country tax suites (worker web-tools): read the tool catalogue from
the /tools/ index, fill every field of a tool page with zero or junk the way a careless user would, and check that a
result never shows NaN, Infinity or undefined. Test tools only; never shipped."""
import re

from robot.api import logger
from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# Sets a value the way React sees a typed or pasted change (native setter, then an input/change event).
_SET = ('const el = arguments[0]; const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype :'
        ' el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;'
        'Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(arguments[1]));'
        'el.dispatchEvent(new Event("input", {bubbles: true})); el.dispatchEvent(new Event("change", {bubbles: true}));')

BAD = re.compile(r'NaN|Infinity|undefined')


@library(scope='GLOBAL')
class WebToolsLib:
    @property
    def _d(self):
        return BuiltIn().get_library_instance('SeleniumLibrary').driver

    @keyword('Get Tool Slugs From Index')
    def tool_slugs(self):
        """Slugs of every tool card on the /tools/ page currently open (data-testid tool-card-<slug>)."""
        ids = self._d.execute_script(
            'return [...document.querySelectorAll("[data-testid^=\\"tool-card-\\"]")].map(e => e.dataset.testid.slice(10))')
        return ids

    @keyword('Scroll Field To Centre')
    def scroll_centre(self, name, index=0):
        """Scrolls the field labelled ``name`` to the middle of the window at once (the site scrolls smoothly, and a
        click during the animation lands on the floating header)."""
        from FinealthLib import _FIND_FIELD
        el = self._d.execute_script(_FIND_FIELD, str(name), int(index))
        if el is not None:
            self._d.execute_script('arguments[0].scrollIntoView({block: "center", behavior: "instant"})', el)

    @keyword('Set Value By Script')
    def set_value(self, css, value):
        """Puts ``value`` into the field matching ``css`` as a paste would (needed for a minus sign in a number field
        and for an option the list does not offer)."""
        el = self._d.find_element(By.CSS_SELECTOR, css)
        self._d.execute_script(_SET, el, value)

    @keyword('Tool Result Should Be Clean')
    def result_clean(self):
        """The Result panel has at least one figure, a non-empty first figure, and no NaN, Infinity or undefined
        anywhere in the result, the heading figures or the note. Returns the result text."""
        txt = self._d.execute_script(
            'const q = (s) => [...document.querySelectorAll(s)].map(e => e.innerText).join(" | ");'
            'return [q("[data-testid=tool-result]"), q("[data-testid=tool-kpis]"), q("[data-testid=tool-primary]"),'
            ' document.querySelectorAll("[data-testid=tool-result] .stat").length]')
        result, kpis, primary, stats = txt
        if stats < 1:
            raise AssertionError(f'No result figure on {self._d.current_url}')
        if not primary.strip():
            raise AssertionError(f'The first result figure is empty on {self._d.current_url}')
        for part in (result, kpis):
            if BAD.search(part):
                raise AssertionError(f'Broken number on {self._d.current_url}: {part!r}')
        logger.info(f'{self._d.current_url}: {result}')
        return result

    @keyword('Fill Tool Fields With Junk')
    def fill_junk(self, mode='zero'):
        """mode=zero: every number field 0, every text area "abc", every list an unknown option "zz", every tick box
        cleared. mode=letters: types "abc" into every number field (the browser keeps letters out). Returns the number of
        fields changed."""
        els = self._d.find_elements(By.CSS_SELECTOR, 'main input, main textarea, main select')
        n = 0
        for el in els:
            typ = (el.get_attribute('type') or '').lower()
            tag = el.tag_name.lower()
            if mode == 'letters':
                if typ == 'number':
                    self._d.execute_script('arguments[0].scrollIntoView({block: "center"})', el)
                    el.click()
                    el.send_keys(Keys.CONTROL, 'a')
                    el.send_keys('abc')
                    el.send_keys(Keys.TAB)
                    n += 1
                continue
            if tag == 'textarea':
                self._d.execute_script(_SET, el, 'abc')
            elif tag == 'select':
                self._d.execute_script(_SET, el, 'zz')
            elif typ == 'checkbox':
                if el.is_selected():
                    self._d.execute_script('arguments[0].click()', el)
            elif typ == 'number':
                self._d.execute_script(_SET, el, '0')
            else:
                continue
            n += 1
        return n
