import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
const testEnv = parse(readFileSync('.env.test'));
export default defineConfig({
  test: {
    env: testEnv,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/modules/**/*.ts'],
      exclude: ['**/*.routes.ts', '**/*.schema.ts', '**/*.repository.ts', '**/__tests__/**'],
    },
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], env: testEnv } },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
          setupFiles: ['tests/setup.ts'],
          testTimeout: 30000,
          hookTimeout: 120000,
          env: testEnv,
        },
      },
    ],
  },
});
