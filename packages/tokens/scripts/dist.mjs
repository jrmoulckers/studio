import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { assembleDist } from './dist-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

try {
  assembleDist({
    buildDir: join(root, 'build'),
    distDir: join(root, 'dist'),
  });
} catch (error) {
  console.error(`✗ @jrm/tokens dist: ${error.message}`);
  process.exitCode = 1;
}
