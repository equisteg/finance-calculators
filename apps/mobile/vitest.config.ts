import { defineConfig } from 'vitest/config';

// Unit tests for the app's pure logic (src/lib). Screens are covered by the Maestro flows in tests/mobile/flows.
export default defineConfig({ test: { include: ['__tests__/**/*.test.ts'], environment: 'node' } });
