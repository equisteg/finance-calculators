"""Extra keywords for the site-wide suites (My Plan, pricing, Pro, ads, legal, SEO, navigation): print media,
blocked browser storage, running animations, structured data and generated files. Test tools only; never shipped."""
import json
import re
from pathlib import Path

from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn


@library(scope='GLOBAL')
class WebSiteLib:
    @property
    def _d(self):
        return BuiltIn().get_library_instance('SeleniumLibrary').driver

    @keyword('Emulate Media')
    def emulate_media(self, media='print'):
        """Renders the page as for ``media`` (print or screen) — what Print / save PDF uses — via Chrome DevTools."""
        self._d.execute_cdp_cmd('Emulation.setEmulatedMedia', {'media': '' if media == 'screen' else media})

    @keyword('Block Browser Storage On Next Load')
    def block_storage(self):
        """From the next page load on, reading localStorage throws, as in a private window with site data blocked."""
        self._d.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {'source': (
            "Object.defineProperty(window, 'localStorage', {configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); }});")})

    @keyword('Is Element Displayed')
    def displayed(self, css):
        """True when the first element matching ``css`` takes part in the layout (display is not none, has a box)."""
        return self._d.execute_script(
            'const e = document.querySelector(arguments[0]); if (!e) return false;'
            'const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && e.getClientRects().length > 0;', css)

    @keyword('Get Running Animations')
    def animations(self):
        """CSS animations and transitions still running or scheduled on the page (names of the animated elements)."""
        return self._d.execute_script(
            'return document.getAnimations().filter(a => a.playState === "running")'
            '.map(a => (a.animationName || a.transitionProperty || "anim") + " on " + (a.effect && a.effect.target ? a.effect.target.tagName + "." + a.effect.target.className : ""))')

    @keyword('Get JSON-LD Blocks')
    def json_ld(self):
        """Every application/ld+json block in the page, parsed."""
        raw = self._d.execute_script('return [...document.querySelectorAll(\'script[type="application/ld+json"]\')].map(s => s.textContent)')
        return [json.loads(r) for r in raw]

    @keyword('Parse Head Tags')
    def head_tags(self, html):
        """From raw HTML: <title>, canonical href, meta robots values, meta description and the JSON-LD blocks."""
        title = re.search(r'<title>(.*?)</title>', html, re.S)
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
        desc = re.search(r'<meta name="description" content="([^"]*)"', html)
        robots = re.findall(r'<meta name="robots" content="([^"]*)"', html)
        ld = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
        unesc = lambda s: s.replace('&amp;', '&').replace('&#x27;', "'").replace('&quot;', '"') if s else s
        return {'title': unesc(title.group(1)) if title else '', 'canonical': canon.group(1) if canon else '',
                'description': unesc(desc.group(1)) if desc else '', 'robots': robots, 'jsonld': ld}

    @keyword('Sitemap Locations')
    def sitemap_locs(self, xml):
        return re.findall(r'<loc>(.*?)</loc>', xml)

    @keyword('Write Big File')
    def big_file(self, path, megabytes=2.1):
        """Writes a JSON-looking file of ``megabytes`` MB (for the backup size limit)."""
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        n = int(float(megabytes) * 1_000_000)
        body = '{"app":"finealth","version":1,"data":{},"pad":"' + 'x' * (n - 60) + '"}'
        p.write_text(body, encoding='utf-8')
        return str(p)
