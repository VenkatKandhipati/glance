// The Telugu letters for the Telugu screen: 16 vowels and 36 consonants, in chart order, each with
// the romanization kathalu uses so the two read the same. Rows are how the screen lays them out.

// Vowels in their families: the plain short/long pairs; ఋ ౠ and the e sounds; the o sounds and
// the two with a sign (అం, అః).
export const VOWEL_ROWS = [
  [['అ', 'a'], ['ఆ', 'ā'], ['ఇ', 'i'], ['ఈ', 'ī'], ['ఉ', 'u'], ['ఊ', 'ū']],
  [['ఋ', 'ru'], ['ౠ', 'rū'], ['ఎ', 'e'], ['ఏ', 'ē'], ['ఐ', 'ai']],
  [['ఒ', 'o'], ['ఓ', 'ō'], ['ఔ', 'au'], ['అం', 'aṁ'], ['అః', 'aḥ']],
];

// The five vargas, one per row, by where in the mouth they're made. Across each row: plain,
// aspirated, voiced, voiced aspirated, nasal.
export const VARGAS = [
  [['క', 'ka'], ['ఖ', 'kha'], ['గ', 'ga'], ['ఘ', 'gha'], ['ఙ', 'ṅa']],
  [['చ', 'cha'], ['ఛ', 'chha'], ['జ', 'ja'], ['ఝ', 'jha'], ['ఞ', 'ña']],
  [['ట', 'ṭa'], ['ఠ', 'ṭha'], ['డ', 'ḍa'], ['ఢ', 'ḍha'], ['ణ', 'ṇa']],
  [['త', 'ta'], ['థ', 'tha'], ['ద', 'da'], ['ధ', 'dha'], ['న', 'na']],
  [['ప', 'pa'], ['ఫ', 'pha'], ['బ', 'ba'], ['భ', 'bha'], ['మ', 'ma']],
];

// The other eleven: the semivowels, the sibilants and h, then the last three.
export const OTHER_ROWS = [
  [['య', 'ya'], ['ర', 'ra'], ['ల', 'la'], ['వ', 'va']],
  [['శ', 'śa'], ['ష', 'ṣa'], ['స', 'sa'], ['హ', 'ha']],
  [['ళ', 'ḷa'], ['క్ష', 'kṣa'], ['ఱ', 'ṟa']],
];

// The consonants over two pages of four rows: the first four vargas; then the fifth and the rest.
export const CONSONANT_PAGES = [VARGAS.slice(0, 4), VARGAS.slice(4).concat(OTHER_ROWS)];
