import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/*
 * apps/web and apps/mobile are independent packages with no shared workspace,
 * so the calculation engines are copied into each. This test fails the moment
 * the copies drift, so a tax fix can never land in one app and not the other.
 * The web copy is the source of truth; sync with:
 *
 *   cp apps/web/src/lib/{finance,format}.ts apps/mobile/src/lib/
 */

const SHARED_FILES = ["finance.ts", "format.ts"];
const webLib = path.resolve(__dirname, "../../web/src/lib");
const mobileLib = path.resolve(__dirname, "../../mobile/src/lib");
const bothAppsPresent = existsSync(webLib) && existsSync(mobileLib);

describe.skipIf(!bothAppsPresent)("shared calculation library", () => {
  for (const file of SHARED_FILES) {
    it(`${file} is identical in apps/web and apps/mobile`, () => {
      const normalise = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
      expect(normalise(path.join(mobileLib, file))).toBe(normalise(path.join(webLib, file)));
    });
  }
});
