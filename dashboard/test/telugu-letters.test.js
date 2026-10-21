import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOWEL_ROWS, VARGAS, OTHER_ROWS } from '../src/telugu-letters.js';

const vowels = VOWEL_ROWS.flat(), consonants = VARGAS.flat().concat(OTHER_ROWS.flat());

test('the 16 vowels and 36 consonants, each once', () => {
  assert.equal(vowels.length, 16);
  assert.equal(consonants.length, 36);
  const all = vowels.concat(consonants).map((l) => l[0]);
  assert.equal(new Set(all).size, all.length);
});

test('every letter is Telugu script, with a romanization under it', () => {
  for (const [letter, roman] of vowels.concat(consonants)) {
    assert.match(letter, /^[ఀ-౿]+$/, letter);
    assert.match(roman, /^[a-zāīūēōṁḥṅñṭḍṇśṣḷṟ]+$/, letter + ' ' + roman);
  }
});

test('five vargas of five, ending in their nasals', () => {
  assert.equal(VARGAS.length, 5);
  for (const row of VARGAS) assert.equal(row.length, 5);
  assert.deepEqual(VARGAS.map((r) => r[4][0]), ['ఙ', 'ఞ', 'ణ', 'న', 'మ']);
});
