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
export const OTHERS = [['య', 'ya'], ['ర', 'ra'], ['ల', 'la'], ['వ', 'va'], ['శ', 'śa'], ['ష', 'ṣa'],
  ['స', 'sa'], ['హ', 'ha'], ['ళ', 'ḷa'], ['క్ష', 'kṣa'], ['ఱ', 'ṟa']];

// A common word for the consonants hardest to say from the letter alone: the last eight, and on
// the first page the two rare nasals and the retroflex/dental pairs (ట/త, డ/ద, ణ/న). Each is the
// word, its romanization with the letter's sound between *s, and what it means. Most start with
// the letter; ఙ ఞ ణ ష ళ క్ష ఱ hardly ever do, so theirs have it inside.
export const WORDS = {
  'ఙ': ['గఙ్గ', 'ga*ṅ*ga', 'the Ganga'],
  'ఞ': ['పఞ్చదార', 'pa*ñ*chadāra', 'sugar'],
  'ట': ['టమాటా', '*ṭ*amāṭā', 'tomato'],
  'డ': ['డబ్బు', '*ḍ*abbu', 'money'],
  'ణ': ['బాణం', 'bā*ṇ*aṁ', 'arrow'],
  'త': ['తాత', '*t*āta', 'grandfather'],
  'ద': ['దీపం', '*d*īpaṁ', 'lamp'],
  'న': ['నక్క', '*n*akka', 'fox'],
  'వ': ['వాన', '*v*āna', 'rain'],
  'శ': ['శాంతి', '*ś*ānti', 'peace'],
  'ష': ['భాష', 'bhā*ṣ*a', 'language'],
  'స': ['సబ్బు', '*s*abbu', 'soap'],
  'హ': ['హంస', '*h*aṁsa', 'swan'],
  'ళ': ['కళ్ళు', 'ka*ḷḷ*u', 'eyes'],
  'క్ష': ['పక్షి', 'pa*kṣ*i', 'bird'],
  'ఱ': ['గుఱ్ఱం', 'gu*ṟṟ*aṁ', 'horse'],
};

// The consonants over two pages of four rows: the first four vargas; then the fifth varga and the
// rest, four to a row so the last eight have room for their words.
const rest = VARGAS[4].concat(OTHERS);
export const CONSONANT_PAGES = [VARGAS.slice(0, 4), [0, 4, 8, 12].map((i) => rest.slice(i, i + 4))];
