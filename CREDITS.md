# Credits

## Inspiration

- **Wes Bos**, who showed that a $50 Android photo frame can become a family dashboard:
  the video [Taking over Android photo frames](https://youtu.be/ZLycoUMltNI) and the repository
  [wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard). Its device
  guides, kiosk app and notes on what the frame's WebView can't do made this project possible.
  Wes gave permission to reuse code from that repository in this project; anything taken from it
  is marked in the file where it's used. Glance follows its approach: a fullscreen kiosk WebView
  showing a static, mock-data-first web page.
- **[huntsyea/kitchen-frame](https://github.com/huntsyea/kitchen-frame)**: a frontend plus a single
  origin that keeps tokens off the frame, and the rule that every pixel has to be cheap for a weak
  GPU.
- **[abradburne/mado](https://github.com/abradburne/mado)**: a hub on a home server that the frame
  connects out to, holding no secrets; waiting for a real clock after a power cut.
- **[pangoleen/ormarch-picture-frame](https://github.com/pangoleen/ormarch-picture-frame)**: keep a
  recovery path, and record every change to the frame with its undo.

## Images

`dashboard/public/demo/tidal-basin.jpg`, shown only in demo mode and in the README screenshots, is
*Thomas Jefferson Memorial at National Mall & Memorial Parks* by the National Park Service, a work
of the US federal government in the public domain
([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Thomas_Jefferson_Memorial_at_National_Mall_%26_Memorial_Parks_(8379c484-3e98-4b64-b994-b2addf6c8c22).jpg)),
resized.

## Code adapted from other projects

`kiosk/` is adapted from `dashboard/kiosk` in wesbos/photo-frame-dashboard (commit `48b4ab0`),
with Wes Bos's permission: the app source, manifest, build script, accessibility config and icon.
Glance changed the package name, labels and default URL.

`dashboard/src/diag.js` is adapted from `dashboard/src/diag.js` in huntsyea/kitchen-frame:

> MIT License
>
> Copyright (c) 2026 Hunter Yeagley
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software
> and associated documentation files (the "Software"), to deal in the Software without
> restriction, including without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
> Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
> BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Fonts

Bundled through [Fontsource](https://fontsource.org), each under the SIL Open Font License 1.1:

- [Instrument Serif](https://github.com/Instrument/instrument-serif) by Instrument
- [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) by Tokotype

## Open-source software

[Vite](https://vite.dev) (MIT).
