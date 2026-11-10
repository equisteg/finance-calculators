// Runs one function of the shared finance engine (packages/finance-core) for Robot Framework:
//   echo '{"fn":"debtPlan","args":[...]}' | node tests/automation/libraries/engine-bridge.mjs
// Prints {"result": ...}. The engine is the same code the website and the Android app run.
import { load, readStdin } from './bundle.mjs';

const { fn, args = [] } = await readStdin();
const core = await load('packages/finance-core/src/index.ts', 'finance-core', ['packages/finance-core/src']);
if (typeof core[fn] !== 'function') {
  console.error(`finance-core has no function "${fn}". Exported: ${Object.keys(core).filter((k) => typeof core[k] === 'function').join(', ')}`);
  process.exit(2);
}
const result = await core[fn](...args);
process.stdout.write(JSON.stringify({ result }, (_k, v) => (v === Infinity ? 'Infinity' : Number.isNaN(v) ? 'NaN' : v)));
