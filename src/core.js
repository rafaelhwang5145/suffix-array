/**
 * Suffix array construction and search routines.
 *
 * Design note: The suffix array is the sorted permutation of the start
 * indices of every suffix of a string. We build it by an O(n log^2 n)
 * prefix-doubling sort rather than an O(n) SA-IS, deliberately trading
 * speed for code that is small, dependency-free, and obviously correct.
 * For the input sizes this library targets (documents up to a few hundred
 * thousand characters), the difference is negligible in practice and the
 * simpler algorithm is much easier to audit.
 *
 * All exported functions treat the input as a sequence of UTF-16 code
 * units (i.e. JavaScript string semantics). Code points outside the BMP
 * are ordered by their surrogate pair ordering, which is consistent with
 * Array.prototype.sort on strings. Document this if it matters to callers.
 */

/**
 * Build the suffix array of `text`: the start indices of all suffixes,
 * sorted lexicographically by the suffix they denote.
 *
 * The empty string yields the empty array. A one-character string yields
 * `[0]`. The full suffix (index 0) is always present and, because every
 * other suffix is a proper extension of some prefix, never sorts before a
 * shorter suffix that shares its prefix — so index 0 is the last entry
 * only when the text is empty or a single character.
 *
 * @param {string} text
 * @returns {number[]} non-decreasing suffix start indices
 */
export function buildSuffixArray(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  const n = text.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = text.charCodeAt(i);

  // rank[i] is the rank of suffix i within the current sorting horizon.
  // We start with ranks keyed by the first character; ties are broken by
  // index so the sort is stable and deterministic.
  let rank = new Array(n);
  for (let i = 0; i < n; i++) rank[i] = arr[i];

  // index[i] holds suffix start positions, which we repeatedly sort.
  let index = new Array(n);
  for (let i = 0; i < n; i++) index[i] = i;

  // Prefix doubling: after the k-th pass, ranks reflect the first 2^k
  // characters of each suffix. We stop once every suffix has a unique
  // rank, at which point the array is fully sorted.
  for (let k = 1; ; k <<= 1) {
    const k2 = k;

    const cmp = (a, b) => {
      if (rank[a] !== rank[b]) return rank[a] < rank[b] ? -1 : 1;
      const ra = a + k2 < n ? rank[a + k2] : -1;
      const rb = b + k2 < n ? rank[b + k2] : -1;
      if (ra !== rb) return ra < rb ? -1 : 1;
      return 0;
    };

    index.sort(cmp);

    // Recompute ranks: two suffixes get the same new rank iff both their
    // current and their k-shifted ranks matched.
    const newRank = new Array(n);
    newRank[index[0]] = 0;
    for (let i = 1; i < n; i++) {
      newRank[index[i]] = newRank[index[i - 1]] + (cmp(index[i - 1], index[i]) < 0 ? 1 : 0);
    }
    rank = newRank;

    if (rank[index[n - 1]] === n - 1) break;
  }

  return index;
}

/**
 * Binary search for the lowest suffix array position whose suffix is not
 * lexicographically less than `pattern`. Returns the insertion point in
 * `[0, sa.length]`.
 *
 * @param {string} text
 * @param {number[]} sa
 * @param {string} pattern
 * @returns {number}
 */
function lowerBound(text, sa, pattern) {
  let lo = 0;
  let hi = sa.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const suffix = text.slice(sa[mid], sa[mid] + pattern.length);
    if (suffix < pattern) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Binary search for the lowest suffix array position whose suffix is
 * lexicographically greater than `pattern`. Returns the insertion point in
 * `[0, sa.length]`.
 *
 * @param {string} text
 * @param {number[]} sa
 * @param {string} pattern
 * @returns {number}
 */
function upperBound(text, sa, pattern) {
  let lo = 0;
  let hi = sa.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const suffix = text.slice(sa[mid], sa[mid] + pattern.length);
    if (suffix <= pattern) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Find every start index in `text` where `pattern` occurs, using the
 * precomputed suffix array `sa`.
 *
 * Returns indices in ascending order (the suffix array segment is sorted,
 * but by suffix content, so we sort the hits before returning). The empty
 * pattern matches at every position and returns `[0, 1, ..., text.length]`;
 * a non-empty pattern that does not occur returns `[]`.
 *
 * @param {string} text
 * @param {number[]} sa
 * @param {string} pattern
 * @returns {number[]}
 */
export function search(text, sa, pattern) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Array.isArray(sa)) throw new TypeError('sa must be an array');
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');

  if (pattern.length === 0) {
    const out = new Array(text.length + 1);
    for (let i = 0; i <= text.length; i++) out[i] = i;
    return out;
  }

  const lo = lowerBound(text, sa, pattern);
  const hi = upperBound(text, sa, pattern);
  if (lo >= hi) return [];

  const hits = sa.slice(lo, hi);
  hits.sort((a, b) => a - b);
  return hits;
}

/**
 * Compute the longest repeated substring of `text` via its suffix array
 * and the longest-common-prefix array derived from it.
 *
 * Returns the empty string when no character repeats (which includes the
 * empty and single-character inputs). When several repeats tie for the
 * longest, returns the lexicographically smallest one — a deterministic
 * choice so callers can rely on the result regardless of sort tie-breaking.
 *
 * @param {string} text
 * @param {number[]} [sa] optional precomputed suffix array
 * @returns {string}
 */
export function longestRepeatedSubstring(text, sa) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (sa === undefined) sa = buildSuffixArray(text);
  else if (!Array.isArray(sa)) throw new TypeError('sa must be an array');

  const n = text.length;
  if (n < 2) return '';

  // Kasai's algorithm: compute the LCP array in linear time from the
  // suffix array and its inverse. lcp[i] is the length of the common
  // prefix between the suffixes at sa[i-1] and sa[i].
  const rank = new Array(n);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;

  const lcp = new Array(n).fill(0);
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && text.charCodeAt(i + h) === text.charCodeAt(j + h)) {
        h++;
      }
      lcp[rank[i]] = h;
      if (h > 0) h--;
    } else {
      h = 0;
    }
  }

  let bestLen = 0;
  let bestStart = -1;
  for (let i = 1; i < n; i++) {
    if (lcp[i] > bestLen) {
      bestLen = lcp[i];
      bestStart = sa[i];
    }
  }

  if (bestLen === 0) return '';
  return text.slice(bestStart, bestStart + bestLen);
}
