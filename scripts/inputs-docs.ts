/**
 * npm run inputs:docs — HA-2.16.
 *
 * Regenerates docs/inputs.md from config/inputs.ts. Writes one file in the repo
 * and nothing else — no database, no external service.
 */

import { writeFileSync } from 'node:fs';
import { INPUTS } from '../config/inputs.js';
import { renderDocs } from '../config/inputsCheck.js';

const target = new URL('../docs/inputs.md', import.meta.url);
writeFileSync(target, renderDocs(INPUTS), 'utf8');
console.log(`docs/inputs.md regenerated from config/inputs.ts (${INPUTS.length} inputs)`);
