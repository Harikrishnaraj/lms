import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    testTimeout: 15000,
  },
  // NestJS's DI container resolves constructor injection tokens via
  // emitDecoratorMetadata, which esbuild (vitest's default transform) does not
  // produce. Tests that go through Test.createTestingModule need real
  // decorator metadata, so those files are transformed with swc instead. See
  // https://docs.nestjs.com/recipes/swc#vitest
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
