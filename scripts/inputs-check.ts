/**
 * npm run inputs:check — HA-2.16.
 *
 * Prints the input registry as a table and fails in live mode while any input
 * is still a placeholder. Read-only: touches no database, no external service,
 * and reads no environment variable except SHOP_MODE.
 *
 *   npm run inputs:check                    dev mode    — table, exit 0
 *   SHOP_MODE=verification npm run inputs:check          — table, exit 0
 *   SHOP_MODE=live npm run inputs:check                  — exit 1 if placeholders remain
 */

import { INPUTS } from '../config/inputs.js';
import { checkInputs } from '../config/inputsCheck.js';

const result = checkInputs(INPUTS, process.env.SHOP_MODE);

for (const line of result.stdout) console.log(line);
for (const line of result.stderr) console.error(line);

process.exit(result.exitCode);
