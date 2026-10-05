/**
 * Public surface of the suffix-array library.
 *
 * Re-exports the construction, search, and repetition routines from
 * `./core.js`. Keeping the entry point thin lets callers import either
 * the whole library (`import * as sa from './index.js'`) or drill into
 * the core module directly if they only need construction.
 */

export { buildSuffixArray, search, longestRepeatedSubstring } from './core.js';
