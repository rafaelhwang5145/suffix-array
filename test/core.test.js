import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSuffixArray, search, longestRepeatedSubstring } from '../src/core.js';

/**
 * Sanity check: every (sa[i]) suffix must be <= the next one, and the
 * array must be a permutation of [0..n-1].
 */
function assertValidSuffixArray(text, sa) {
  assert.equal(sa.length, text.length, 'length matches text');
  const seen = new Set();
  for (let i = 0; i < sa.length; i++) {
    assert.ok(!seen.has(sa[i]), `index ${sa[i]} appears twice`);
    seen.add(sa[i]);
    if (i > 0) {
      const prev = text.slice(sa[i - 1]);
      const cur = text.slice(sa[i]);
      assert.ok(prev <= cur, `suffixes out of order at ${i}`);
    }
  }
}

describe('buildSuffixArray', () => {
  it('returns [] for the empty string', () => {
    assert.deepEqual(buildSuffixArray(''), []);
  });

  it('returns [0] for a single character', () => {
    assert.deepEqual(buildSuffixArray('a'), [0]);
  });

  it('builds a valid array for a small word', () => {
    // 'banana' is the canonical teaching example.
    const sa = buildSuffixArray('banana');
    assertValidSuffixArray('banana', sa);
    // Known answer: a, ana, anana, banana, na, nana
    assert.deepEqual(sa, [5, 3, 1, 0, 4, 2]);
  });

  it('handles repeated characters', () => {
    const sa = buildSuffixArray('aaaa');
    assertValidSuffixArray('aaaa', sa);
    // All suffixes share a prefix; sorted by length descending:
    // aaaa < aaa < aa < a is FALSE lexicographically — shorter sorts
    // first when it is a prefix of the longer. So order is a, aa, aaa, aaaa
    // i.e. indices 3, 2, 1, 0.
    assert.deepEqual(sa, [3, 2, 1, 0]);
  });

  it('handles characters outside the BMP consistently', () => {
    // '𝄞' (U+1D11E) is a surrogate pair in JS strings. Two such chars
    // followed by an ASCII letter. We do not assert on surrogate-aware
    // ordering, only that the array is a valid suffix array under JS
    // string comparison — which is what the implementation promises.
    const text = '𝄞b𝄞';
    const sa = buildSuffixArray(text);
    assertValidSuffixArray(text, sa);
  });

  it('rejects non-string input', () => {
    assert.throws(() => buildSuffixArray(42), TypeError);
  });
});

describe('search', () => {
  it('finds all occurrences of a pattern', () => {
    const text = 'abababab';
    const sa = buildSuffixArray(text);
    assert.deepEqual(search(text, sa, 'abab'), [0, 2, 4]);
  });

  it('returns [] when the pattern is absent', () => {
    const text = 'banana';
    const sa = buildSuffixArray(text);
    assert.deepEqual(search(text, sa, 'xyz'), []);
  });

  it('treats the empty pattern as matching every position', () => {
    const text = 'abc';
    const sa = buildSuffixArray(text);
    assert.deepEqual(search(text, sa, ''), [0, 1, 2, 3]);
  });

  it('finds overlapping occurrences', () => {
    const text = 'aaaa';
    const sa = buildSuffixArray(text);
    assert.deepEqual(search(text, sa, 'aa'), [0, 1, 2]);
  });

  it('returns the full text position when pattern equals the text', () => {
    const text = 'hello';
    const sa = buildSuffixArray(text);
    assert.deepEqual(search(text, sa, 'hello'), [0]);
  });

  it('returns hits in ascending order regardless of sa layout', () => {
    const text = 'mississippi';
    const sa = buildSuffixArray(text);
    const hits = search(text, sa, 'ss');
    assert.deepEqual(hits, [2, 5]);
    for (let i = 1; i < hits.length; i++) {
      assert.ok(hits[i - 1] < hits[i]);
    }
  });

  it('rejects a non-array suffix array argument', () => {
    assert.throws(() => search('abc', 'not-an-array', 'a'), TypeError);
  });
});

describe('longestRepeatedSubstring', () => {
  it('returns "" for the empty string', () => {
    assert.equal(longestRepeatedSubstring(''), '');
  });

  it('returns "" for a single character', () => {
    assert.equal(longestRepeatedSubstring('a'), '');
  });

  it('returns "" when nothing repeats', () => {
    assert.equal(longestRepeatedSubstring('abcdef'), '');
  });

  it('finds the longest repeat in a teaching example', () => {
    // 'banana': 'ana' repeats at positions 1 and 3.
    assert.equal(longestRepeatedSubstring('banana'), 'ana');
  });

  it('breaks ties deterministically (lexicographically smallest)', () => {
    // 'ab' repeats, and so does 'ba'. Both length 2. We pick the
    // lexicographically smaller one, 'ab'.
    assert.equal(longestRepeatedSubstring('abbaab'), 'ab');
  });

  it('accepts a precomputed suffix array', () => {
    const text = 'mississippi';
    const sa = buildSuffixArray(text);
    assert.equal(longestRepeatedSubstring(text, sa), 'issi');
  });

  it('rejects non-string text', () => {
    assert.throws(() => longestRepeatedSubstring(123), TypeError);
  });
});
