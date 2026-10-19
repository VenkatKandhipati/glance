import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, pickSome, paintingItem, apodItem, earthItems, commonsTitles, natureItems } from '../src/featured-data.js';

test('the day number turns over at local midnight', () => {
  assert.equal(dayNumber(new Date(2026, 9, 19, 23, 59)) + 1, dayNumber(new Date(2026, 9, 20, 0, 1)));
});

test('pickSome: distinct, repeatable for a seed', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = pickSome(list, 4, 20384);
  assert.equal(new Set(a).size, 4);
  assert.deepEqual(a, pickSome(list, 4, 20384));
  assert.equal(pickSome(list, 20, 1).length, 8);
});

test('a painting with its artist and date, shown whole', () => {
  const item = paintingItem({ config: { iiif_url: 'https://www.artic.edu/iiif/2' }, data: [
    { title: 'No image', image_id: null },
    { title: 'The Herring Net', artist_title: 'Winslow Homer', date_display: '1885', image_id: 'abc' },
  ] });
  assert.deepEqual(item, { url: 'https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg',
    caption: 'Painting of the day · The Herring Net, Winslow Homer, 1885', fit: 'contain' });
  assert.equal(paintingItem({ data: [{ title: 'A', image_id: 'a' }, { title: 'B', image_id: 'b' }] }, 3).url,
    'https://www.artic.edu/iiif/2/b/full/843,/0/default.jpg');
  assert.equal(paintingItem({ data: [] }), null);
});

test('APOD: the image with its copyright; videos skipped', () => {
  assert.equal(apodItem({ title: 'NASA Science', media_type: 'image', url: 'https://science.nasa.gov/x/nasa-logo@2x.png' }), null);
  assert.equal(apodItem({ title: 'M31', media_type: 'image', url: 'https://apod.nasa.gov/apod/image/2610/m31.jpg', copyright: '\nJane Doe\n' }).caption,
    'NASA Astronomy Picture of the Day · M31 · © Jane Doe');
  assert.equal(apodItem({ title: 'Clip', media_type: 'video', thumbnail_url: 'https://img.youtube.com/t.jpg' }), null);
});

test('Earth photos: Space Station ones only, at medium size', () => {
  const items = earthItems({ collection: { items: [
    { data: [{ nasa_id: 'iss045e013851', date_created: '2015-09-17T00:00:00Z', title: 'Earth Observation taken by the Expedition 45 crew' }],
      links: [{ href: 'https://images-assets.nasa.gov/image/iss045e013851/iss045e013851~thumb.jpg' }] },
    { data: [{ nasa_id: 'iss036e000001', keywords: ['ISS', 'Solar Array'] }],
      links: [{ href: 'https://images-assets.nasa.gov/image/iss045e013851/iss045e013851~thumb.jpg' }] },
    { data: [{ nasa_id: 'sts098-713a-019', date_created: '2001-02-01T00:00:00Z' }],
      links: [{ href: 'https://images-assets.nasa.gov/image/sts098/sts098~thumb.jpg' }] },
  ] } });
  assert.deepEqual(items, [{ url: 'https://images-assets.nasa.gov/image/iss045e013851/iss045e013851~medium.jpg',
    caption: 'Earth from the International Space Station · Expedition 45, 2015', fit: 'cover' }]);
});

test('Commons: JPEGs, landscape-shaped, a short name and the licence', () => {
  assert.deepEqual(commonsTitles({ query: { categorymembers: [{ title: 'File:A.jpg' }, { title: 'File:B.png' }] } }), ['File:A.jpg']);
  const page = (title, w, h, meta) => ({ title, imageinfo: [{ thumburl: 'https://t/' + w, width: w, height: h, extmetadata: meta }] });
  const items = natureItems({ query: { pages: {
    1: page('File:Laguna Cañapa, Bolivia, 2016-02-03, DD 63.JPG', 4000, 2600,
      { Artist: { value: '<a href="x">Diego Delso</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } }),
    2: page('File:Tall waterfall.jpg', 2000, 3000, {}),
    3: page('File:Beskid Sądecki in winter 2016 05.jpg', 3000, 2000, {}),
    4: page('File:20090719 Kotor Bay Montenegro.jpg', 3000, 2000, { Artist: { value: 'User:Ggia' } }),
  } } });
  assert.deepEqual(items.map((i) => i.caption), ['Laguna Cañapa · Diego Delso, CC BY-SA 4.0 · Wikimedia Commons',
    'Beskid Sądecki in winter · Wikimedia Commons', 'Kotor Bay Montenegro · Ggia · Wikimedia Commons']);
});
