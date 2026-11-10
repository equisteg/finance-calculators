import type { Options } from "@wdio/types";

/**
 * WebdriverIO + Appium runner for the native-layer Finealth specs.
 * Playwright ignores tests/native/**; this config is the only thing that runs it.
 *
 *   FINEALTH_APK=/abs/path/app-debug.apk npm run test:native
 *
 * See tests/native/finealth-native.appium.spec.ts for the full prerequisites.
 */

const APK = process.env.FINEALTH_APK;
const DEVICE = process.env.ANDROID_DEVICE_NAME ?? "Android Emulator";
const PLATFORM_VERSION = process.env.ANDROID_PLATFORM_VERSION; // optional pin

export const config: Options.Testrunner = {
  runner: "local",
  specs: ["./tests/native/**/*.appium.spec.ts"],
  maxInstances: 1,

  capabilities: [
    {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": DEVICE,
      ...(PLATFORM_VERSION ? { "appium:platformVersion": PLATFORM_VERSION } : {}),
      ...(APK
        ? { "appium:app": APK }
        : {
            "appium:appPackage": "com.tezech.finealth",
            "appium:appActivity": ".MainActivity",
          }),
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 240,
      // Capacitor ships a debuggable WebView in debug builds; Appium needs a
      // matching chromedriver to enter the WEBVIEW_* context.
      "appium:chromedriverAutodownload": true,
      "appium:ensureWebviewsHavePages": true,
      "appium:nativeWebScreenshot": true,
    },
  ],

  hostname: process.env.APPIUM_HOST ?? "127.0.0.1",
  port: Number(process.env.APPIUM_PORT ?? 4723),
  path: "/",

  logLevel: "info",
  waitforTimeout: 20_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 2,

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 180_000,
  },

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: { transpileOnly: true, project: "./tsconfig.json" },
  },

  onPrepare() {
    if (!APK) {
      // eslint-disable-next-line no-console
      console.warn(
        "[wdio] FINEALTH_APK is not set - falling back to an already-installed " +
          "com.tezech.finealth. Build one with:\n" +
          "  cd apps/mobile && npm run build && npx cap sync android \\\n" +
          "    && cd android && ./gradlew assembleDebug"
      );
    }
  },
};
