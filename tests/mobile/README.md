# Android app tests (apps/mobile, Expo)

| Layer | Where | Runs |
|---|---|---|
| Unit (licence check, Pro activation and refresh, storage, backup, calculator list, golden EMI/SIP) | `apps/mobile/__tests__/*.test.ts` (Vitest) | `npm test -w @finealth/mobile`, and in CI with every workspace (fast, no Android) |
| Shared engine golden tests | `packages/finance-core/src/*.test.ts` | CI |
| End-to-end on a phone or emulator | `tests/mobile/flows/*.yaml` (Maestro) | **Locally or on EAS only, never in GitHub Actions** (founder decision 11 Nov 2026: Android builds and device runs cost Actions minutes) |

Each flow names its test cases (`# TC-M-…`) at the top and before the steps that prove them; the case rows are in
`tests/cases/fragments/android.json`.

Run the flows (Maestro CLI, free):

```bash
# a staging APK from EAS (eas build -p android --profile staging) installed on an emulator or USB phone
maestro test tests/mobile/flows/            # everything
maestro test tests/mobile/flows/health.yaml # one flow
```

Flows start with `clearState`, so they do not depend on each other. `offline-data.yaml` switches airplane mode on and
off (emulator or a test phone only). Pro purchase on Google Play needs a licence-tester account and a real Play build,
so it is a manual case (TC-M-PRO-012).
