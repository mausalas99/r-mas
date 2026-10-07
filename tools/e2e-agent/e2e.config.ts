import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { claudeSubscription } from './claude-executor.ts';

// Attaches to a running R+ Electron started with --remote-debugging-port=9333.
// Model runs on the Claude subscription via the Claude Agent SDK. Synthetic patients only.
export default {
  tests: 'tests/**/*.e2e.ts',
  timeout: 480000,
  targets: [
    {
      engine: web({ viewport: null, connect: { cdpEndpoint: () => 'http://127.0.0.1:9333', reconnectEndpoint: () => 'http://127.0.0.1:9333' } }),
      app: { url: 'http://127.0.0.1:9333' },
    },
  ],
  agents: {
    default: {
      executor: claudeSubscription,
      context: 'R+ is a Spanish-language medical workbench. Use synthetic patients only.',
    },
  },
} satisfies E2EConfig;
