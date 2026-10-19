// Pictures from public sources that the photo tile shows between your own photos: the Art
// Institute of Chicago's public-domain paintings, South Asian paintings from the Cleveland Museum
// of Art, the Met and the Art Institute, NASA's Astronomy Picture of the Day and its Space Station
// photos of Earth, and Wikimedia Commons' featured nature photos, of South Asia among others. Each answer
// becomes { url, caption, fit } items: `fit` is 'contain' for pictures that mustn't be cropped
// (paintings, astronomy) and 'cover' for photos. Kept free of the DOM and fetch so it can be
// unit tested.

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

// ---- Art Institute of Chicago: one public-domain painting a day. Its IIIF server serves any
// width up to 843 px without a key.
export const AIC_SEARCH = 'https://api.artic.edu/api/v1/artworks/search?' + [
  'query[bool][must][][term][is_public_domain]=true',
  'query[bool][must][][term][artwork_type_id]=1', // Painting
  'query[bool][must][][exists][field]=image_id',
  'fields=id,title,artist_title,artist_display,date_display,image_id',
].map((p) => p.replace(/\[/g, '%5B').replace(/\]/g, '%5D')).join('&');

// The `n`th painting with an image on a page of results (wrapping round).
export function paintingItem(json, n) {
  const arts = aicItems(json, 'Painting of the day · ', '');
  return arts.length ? arts[(n || 0) % arts.length] : null;
}

// Every work with an image on a page of Art Institute results, captioned "<prefix>title, artist,
// date<suffix>".
export function aicItems(json, prefix, suffix) {
  const iiif = (json && json.config && json.config.iiif_url) || 'https://www.artic.edu/iiif/2';
  return ((json && json.data) || []).filter((a) => a.image_id).map((art) => {
    const artist = art.artist_title || String(art.artist_display || '').split('\n')[0].replace(/\s*\(.*$/, '');
    return {
      url: iiif + '/' + art.image_id + '/full/843,/0/default.jpg',
      caption: prefix + art.title + (artist ? ', ' + artist : '') + (art.date_display ? ', ' + art.date_display : '') + suffix,
      fit: 'contain',
    };
  });
}

// ---- South Asian paintings, from three museums with open-access collections and no key.
const SOUTH_ASIA = /India|Pakistan|Nepal|Bangladesh|Sri Lanka|Bhutan|Deccan|Mughal|Rajasthan|Rajput|Pahari|Himal|Kashmir|Tibet|Bengal|Gujarat|Punjab/;

// Art Institute of Chicago: its 53 public-domain paintings from India.
export const AIC_INDIA_SEARCH = AIC_SEARCH + '&' + 'query[bool][must][][match][place_of_origin]=India'.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

// Cleveland Museum of Art: over 1,000 paintings from its Indian and Southeast Asian department
// (Mughal, Pahari, Rajput, Kalighat, Nepal, Tibet), each with a 900 px web image. CC0.
export function clevelandUrl(skip) {
  return 'https://openaccess-api.clevelandart.org/api/artworks/?department=Indian%20and%20Southeast%20Asian%20Art' +
    '&type=Painting&has_image=1&cc0=1&limit=25&fields=title,culture,creation_date,images&skip=' + skip;
}

export function clevelandItems(json) {
  return ((json && json.data) || []).map((a) => {
    const culture = (a.culture || [])[0] || '';
    const web = a.images && a.images.web;
    if (!web || !web.url || !SOUTH_ASIA.test(culture)) return null; // leave out Southeast Asia
    return {
      url: web.url,
      caption: a.title + ', ' + culture.replace(/\s*\(.*\)$/, '') + (a.creation_date ? ', ' + a.creation_date : '') + ' · Cleveland Museum of Art',
      fit: 'contain',
    };
  }).filter(Boolean);
}

// The Met: about 750 Indian paintings in its Asian Art department. The search gives object IDs
// (v1.1, paginated; v1 was retired in October 2026), and each object its own request.
export function metSearchUrl(offset) {
  return 'https://collectionapi.metmuseum.org/public/collection/v1.1/search?departmentId=6&hasImages=true&medium=Paintings&q=India&limit=12&offset=' + offset;
}

export function metObjectUrl(id) {
  return 'https://collectionapi.metmuseum.org/public/collection/v1/objects/' + id;
}

export function metItem(o) {
  if (!o || !o.isPublicDomain || !/^https:/.test(o.primaryImageSmall || '')) return null;
  const where = o.culture || o.period || '';
  return {
    url: o.primaryImageSmall,
    caption: o.title + (o.artistDisplayName ? ', ' + o.artistDisplayName : '') + (where ? ', ' + where : '') +
      (o.objectDate ? ', ' + o.objectDate : '') + ' · The Met',
    fit: 'contain',
  };
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

// ---- Wikimedia Commons: featured photos of landscapes, mountains, waterfalls and forests,
// scaled by Commons to 1280 px wide. Landscape-shaped ones only, so they fill the tile.
export const COMMONS_CATEGORIES = ['Featured pictures of landscapes', 'Featured pictures of mountains',
  'Featured pictures of waterfalls', 'Featured pictures of forests'];
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
