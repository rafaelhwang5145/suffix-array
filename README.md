# suffix-array

A small, dependency-free TypeScript library that builds a suffix array for a string and uses it for substring search and longest-repeat detection.

## Usage

```js
import { buildSuffixArray, search, longestRepeatedSubstring } from 'suffix-array';

const text = 'mississippi';
const sa = buildSuffixArray(text);

// Find every occurrence of a substring.
search(text, sa, 'ss');     // [2, 5]

// Longest substring that appears more than once.
longestRepeatedSubstring(text);  // 'issi'
```

## Why this exists

Substring search over the same body of text many times is O(n·m) per query with a naive scan, and the standard alternatives (building a full inverted index, pulling in a search library) cost either disk space or a dependency tree that is out of proportion to the job. A suffix array answers `"where does this pattern occur?"` in O(m + log n) per query after an O(n log² n) build, with no external code at all.

The trade-off here is build time: the library uses prefix-doubling rather than the linear-time SA-IS construction. SA-IS is faster asymptotically but is several hundred lines of fiddly, allocation-heavy code that is hard to read and easy to get wrong on the BMP/surrogate edge cases that JavaScript strings hand you. Prefix-doubling is small, obviously correct, and fast enough for documents up to a few hundred thousand characters — which is the size this targets.

## Edge case to know about

The library treats strings as sequences of UTF-16 code units, which is how JavaScript represents them. Characters outside the Basic Multilingual Plane (e.g. most emoji and many musical symbols) are two code units, and are ordered by their surrogate pairs — consistent with `Array.prototype.sort` on strings, but not with a code-point ordering. If you need code-point ordering, normalize your input to a `String` of BMP characters first.

The empty pattern matches at every position from `0` to `text.length` inclusive, which is the conventional set-theoretic definition and what callers usually want for counting. If your use case expects `[]` for the empty pattern, filter it before calling.
