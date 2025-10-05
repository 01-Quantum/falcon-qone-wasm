/**
 * Jest setup file
 * Checks if WASM module exists before running tests
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = resolve(__dirname, '../dist/falcon.wasm');
const jsPath = resolve(__dirname, '../dist/falcon.js');

if (!existsSync(wasmPath) || !existsSync(jsPath)) {
  console.error('\n❌ ERROR: WASM module not found!\n');
  console.error('Please build the WASM module first:\n');
  console.error('  Option 1 (Docker - recommended):');
  console.error('    docker-compose up falcon-wasm-builder\n');
  console.error('  Option 2 (Local - requires Emscripten):');
  console.error('    npm run build:wasm\n');
  console.error('  Option 3 (Make):');
  console.error('    make build-docker\n');
  process.exit(1);
}

console.log('✓ WASM module found, proceeding with tests...\n');
