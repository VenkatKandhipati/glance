import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOWEL_ROWS, VARGAS, OTHERS, CONSONANT_PAGES, WORDS } from '../src/telugu-letters.js';

const vowels = VOWEL_ROWS.flat(), consonants = VARGAS.flat().concat(OTHERS);

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

test('the consonant pages hold every consonant once, four rows of at most five each', () => {
  const paged = CONSONANT_PAGES.flat(2).map((l) => l[0]);
  assert.deepEqual(paged, consonants.map((l) => l[0]));
  for (const page of CONSONANT_PAGES) {
    assert.equal(page.length, 4);
    for (const row of page) assert.ok(row.length <= 5);
  }
});

test('every letter on the second consonant page has a word that contains it', () => {
  const second = CONSONANT_PAGES[1].flat().map((l) => l[0]);
  assert.deepEqual(Object.keys(WORDS).sort(), second.slice().sort());
  for (const letter of second) {
    const [word, roman, meaning] = WORDS[letter];
    assert.ok(word.includes(letter), letter + ' in ' + word);
    assert.match(roman, /^[^*]*\*[^*]+\*[^*]*$/, 'one marked sound in ' + roman);
    assert.ok(meaning.length > 0);
  }
});
