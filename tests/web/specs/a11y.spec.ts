import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * NFR-009: WCAG 2.2 AA on key pages, in both the light "Paper" and dark "Espresso" modes.
 * axe cannot measure text on gradients, so the glass gradients are flattened to their solid colours first;
 * otherwise every text node is reported "incomplete" and contrast is never checked.
 */
const AXE = path.join(path.dirname(require.resolve("axe-core/package.json")), "axe.min.js");
const PAGES = ["/", "/health-check/", "/debt-payoff/", "/goal-planner/", "/retirement-planner/", "/loan-prepayment/", "/tools/", "/pricing/", "/emi-calculator/", "/my-plan/", "/about/", "/privacy/", "/terms/", "/refund/", "/contact/", "/pro/", "/sip-calculator/", "/compound-interest/", "/tools/australia-income-tax-calculator/", "/no-such-page/"];
const FLATTEN = `body{background-image:none!important}.card,.glass,.glass-strong{background:var(--surface)!important}.btn-primary{background:var(--accent-hi)!important}*{animation:none!important;transition:none!important}`;

for (const scheme of ["light", "dark"] as const) {
  test.describe(`a11y :: ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    for (const route of PAGES) {
      test(`NFR-009 ${scheme} ${route} has no serious or critical WCAG AA issues`, async ({ page }) => {
        await page.goto(route);
        await page.addStyleTag({ content: FLATTEN });
        await page.addScriptTag({ path: AXE });
        const result = await page.evaluate(async () => {
          // @ts-expect-error axe is injected above
          const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          return r.violations
            .filter((v: { impact: string }) => v.impact === "serious" || v.impact === "critical")
            .map((v: { id: string; nodes: { target: string[] }[] }) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")} (${v.nodes.length})`);
        });
        expect(result, result.join("\n")).toEqual([]);
      });
    }
  });
}
