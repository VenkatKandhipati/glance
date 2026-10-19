// Pictures from public sources that the photo tile shows between your own photos: the Art
// Institute of Chicago's public-domain paintings, NASA's Astronomy Picture of the Day and its
// Space Station photos of Earth, and Wikimedia Commons' featured nature photos. Each answer
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
  const iiif = (json && json.config && json.config.iiif_url) || 'https://www.artic.edu/iiif/2';
  const arts = ((json && json.data) || []).filter((a) => a.image_id);
  if (!arts.length) return null;
  const art = arts[(n || 0) % arts.length];
  const artist = art.artist_title || String(art.artist_display || '').split('\n')[0].replace(/\s*\(.*$/, '');
  return {
    url: iiif + '/' + art.image_id + '/full/843,/0/default.jpg',
    caption: 'Painting of the day · ' + art.title + (artist ? ', ' + artist : '') + (art.date_display ? ', ' + art.date_display : ''),
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
// About 40 pages of 100 hold such photos.
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
