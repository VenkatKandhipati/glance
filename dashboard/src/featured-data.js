// Pictures from public sources that the photo tile shows between your own photos: paintings from
// the Art Institute of Chicago and the Cleveland Museum of Art (South Asian ones among them), NASA's
// Astronomy Picture of the Day and its Space Station photos of Earth, and Wikimedia Commons'
// featured nature photos, of South Asia among others. Each answer becomes { url, caption, fit }
// candidates: `fit` is 'contain' for pictures that mustn't be cropped (paintings, astronomy) and
// 'cover' for photos. The frame measures every candidate before showing it (picture-check.js).
// Kept free of the DOM and fetch so it can be unit tested.

// The same pick all day, a different one each day: a whole-day count from 1970 in local time.
export function dayNumber(now) {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 864e5);
}

// Picks `n` different items from `list`, the same ones for the same `seed`.
export function pickSome(list, n, seed) {
  const out = [], pool = list.slice();
  let s = seed >>> 0 || 1;
  while (out.length < n && pool.length) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// ---- Art Institute of Chicago: public-domain paintings. Its IIIF server serves any width up to
// 843 px without a key. Its search reaches only the first 1,000 results.
const q = (parts) => parts.map((p) => p.replace(/\[/g, '%5B').replace(/\]/g, '%5D')).join('&');
export const AIC_SEARCH = 'https://api.artic.edu/api/v1/artworks/search?' + q([
  'query[bool][must][][term][is_public_domain]=true',
  'query[bool][must][][term][artwork_type_id]=1', // Painting
  'query[bool][must][][exists][field]=image_id',
  'fields=id,title,artist_title,artist_display,date_display,image_id',
]);
// Paintings whose main colour is dark (the museum records each one's dominant colour): about 550,
// so most of what the frame measures passes its own darkness check.
export const AIC_DARK_SEARCH = AIC_SEARCH + '&' + q(['query[bool][must][][range][color.l][lt]=45']);
export const AIC_DARK_PAGES = 45; // of 12
// Its 53 public-domain paintings from India.
export const AIC_INDIA_SEARCH = AIC_SEARCH + '&' + q(['query[bool][must][][match][place_of_origin]=India']);

// Every work with an image on a page of results, captioned "title, artist, date · Art Institute of
// Chicago".
export function aicItems(json) {
  const iiif = (json && json.config && json.config.iiif_url) || 'https://www.artic.edu/iiif/2';
  return ((json && json.data) || []).filter((a) => a.image_id).map((art) => {
    const artist = art.artist_title || String(art.artist_display || '').split('\n')[0].replace(/\s*\(.*$/, '');
    return {
      url: iiif + '/' + art.image_id + '/full/843,/0/default.jpg',
      caption: art.title + (artist ? ', ' + artist : '') + (art.date_display ? ', ' + art.date_display : '') + ' · Art Institute of Chicago',
      fit: 'contain',
    };
  });
}

// ---- Cleveland Museum of Art: about 3,900 CC0 paintings with a web image of 900–1,260 px, from
// every department (European, American, Chinese, Japanese, and over 1,000 from India and the
// Himalaya). `department` narrows it; the API returns up to 1,000 per query.
const SOUTH_ASIA = /India|Pakistan|Nepal|Bangladesh|Sri Lanka|Bhutan|Deccan|Mughal|Rajasthan|Rajput|Pahari|Himal|Kashmir|Tibet|Bengal|Gujarat|Punjab/;
export const CLEVELAND_PAINTINGS = 3900;
export const CLEVELAND_SOUTH_ASIA = 'Indian and Southeast Asian Art';

export function clevelandUrl(skip, limit, department) {
  return 'https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&has_image=1&cc0=1' +
    (department ? '&department=' + encodeURIComponent(department) : '') +
    '&fields=title,culture,creation_date,creators,images&limit=' + limit + '&skip=' + skip;
}

// southAsia: only works whose culture names a South Asian place (the department includes
// Southeast Asia too).
export function clevelandItems(json, southAsia) {
  return ((json && json.data) || []).map((a) => {
    const culture = (a.culture || [])[0] || '';
    const web = a.images && a.images.web;
    if (!web || !web.url || (southAsia && !SOUTH_ASIA.test(culture))) return null;
    const artist = String(((a.creators || [])[0] || {}).description || '').replace(/\s*\(.*$/, '');
    return {
      url: web.url,
      caption: a.title + ', ' + (artist || culture.replace(/\s*\(.*\)$/, '')) + (a.creation_date ? ', ' + a.creation_date : '') +
        ' · Cleveland Museum of Art',
      fit: 'contain',
    };
  }).filter(Boolean);
}

// ---- NASA Astronomy Picture of the Day (api.nasa.gov). Days with a video are skipped: their
// thumbnails are small and often just a logo. So are answers whose picture isn't in APOD's own
// image folder: in October 2026 the API was answering "NASA Science" with NASA's logo.
export function apodItem(json) {
  if (!json || !json.title || json.media_type !== 'image') return null;
  const url = json.url;
  if (!/^https:\/\/apod\.nasa\.gov\/apod\/image\//.test(url || '')) return null;
  return {
    url,
    caption: 'NASA Astronomy Picture of the Day · ' + json.title + (json.copyright ? ' · © ' + stripTags(json.copyright) : ''),
    fit: 'contain',
  };
}

// ---- NASA Image Library: Earth photographed from the Space Station. `~medium` is 1280 px wide.
// About 40 pages of 100 hold such photos; South Asia has about 18, found by these searches.
export const NASA_EARTH_SOUTH_ASIA = ['india', 'himalaya', 'pakistan'].map((place) =>
  'https://images-api.nasa.gov/search?media_type=image&page_size=100&q=earth%20observation%20' + place);
export const NASA_EARTH_SEARCH = 'https://images-api.nasa.gov/search?media_type=image&page_size=100&q=earth%20observation';
export const NASA_EARTH_PAGES = 40;

export function earthItems(json) {
  const items = (json && json.collection && json.collection.items) || [];
  return items.map((it) => {
    const d = (it.data && it.data[0]) || {};
    // Space Station photos that say they look at Earth; others show the station itself, and
    // Space Shuttle photos turn up in the same search.
    if (!/^iss/i.test(d.nasa_id || '') || !/earth observation/i.test((d.title || '') + ' ' + (d.description || ''))) return null;
    const link = (it.links || []).find((l) => /~(thumb|medium|small)\.jpg$/.test(l.href || ''));
    if (!link) return null;
    const crew = (/Expedition \d+/.exec([d.title].concat(d.keywords || []).join(' ')) || [])[0];
    const year = String(d.date_created || '').slice(0, 4);
    return {
      url: link.href.replace(/~(thumb|small)\.jpg$/, '~medium.jpg'),
      caption: 'Earth from the International Space Station' + (crew ? ' · ' + crew : '') + (year ? ', ' + year : ''),
      fit: 'cover',
    };
  }).filter(Boolean);
}

// ---- Wikimedia Commons: featured nature photos, scaled by Commons to 1280 px wide.
// Landscape-shaped ones only, so they fill the tile. The categories lean towards the dark and
// the calm (fog, lakes, night skies, caves); sunsets are left out, being mostly bright orange.
export const COMMONS_CATEGORIES = ['Featured pictures of landscapes', 'Featured pictures of mountains',
  'Featured pictures of waterfalls', 'Featured pictures of forests', 'Featured pictures of lakes',
  'Featured pictures of fog', 'Featured pictures of clouds', 'Featured pictures of coasts',
  'Featured pictures of astronomy', 'Featured pictures of the Milky Way', 'Featured pictures of caves'];
// Featured and quality photos of South Asia's landscapes and nature (about 430 in all).
export const COMMONS_SOUTH_ASIA = ['Featured pictures of the Himalayas', 'Featured pictures of the Himalayas of India',
  'Featured pictures of landscapes in India', 'Quality images of nature in India', 'Featured pictures of Nepal',
  'Featured pictures of Kerala', 'Featured pictures of Sri Lanka'];
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query';

export function commonsListUrl(category) {
  return COMMONS_API + '&list=categorymembers&cmtype=file&cmlimit=500&cmtitle=' + encodeURIComponent('Category:' + category);
}

export function commonsInfoUrl(titles) {
  return COMMONS_API + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280' +
    '&iiextmetadatafilter=Artist|LicenseShortName|ObjectName&titles=' + encodeURIComponent(titles.join('|'));
}

export function commonsTitles(json) {
  return ((json && json.query && json.query.categorymembers) || []).map((m) => m.title).filter((t) => /\.jpe?g$/i.test(t));
}

export function natureItems(json) {
  const pages = (json && json.query && json.query.pages) || {};
  return Object.keys(pages).map((k) => {
    const info = pages[k].imageinfo && pages[k].imageinfo[0];
    if (!info || !info.thumburl || info.width < info.height * 1.2) return null;
    const meta = info.extmetadata || {};
    const val = (name) => stripTags(meta[name] && meta[name].value);
    // File names carry dates and camera codes ("Laguna Cañapa, Bolivia, 2016-02-03, DD 63"): keep the name.
    const name = (val('ObjectName') || pages[k].title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''))
      .split(', ')[0].replace(/^\d[\d\s_-]*\s/, '').replace(/[\s_-]+\d[\d\s_-]*$/, '');
    const by = [val('Artist').replace(/^User:/, ''), val('LicenseShortName')].filter(Boolean).join(', ');
    return { url: info.thumburl, caption: name + (by ? ' · ' + by : '') + ' · Wikimedia Commons', fit: 'cover' };
  }).filter(Boolean);
}
