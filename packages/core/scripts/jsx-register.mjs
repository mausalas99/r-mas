/** `--import` hook for test runs: Node cannot load `.jsx`, so compile it with esbuild (same JSX options as the renderer bundle). */
import { register } from 'node:module';

register('./jsx-loader.mjs', import.meta.url);
