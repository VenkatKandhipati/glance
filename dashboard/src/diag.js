// On-screen performance readout for tuning on the frame.
// Adapted from huntsyea/kitchen-frame (MIT, © 2026 Hunter Yeagley); see CREDITS.md.
// ?diag turns it on (remembered on the device), ?diag=0 turns it off.
const KEY = 'glance-diag';
const LONG_FRAME_MS = 50;

export function startDiag() {
  const flag = new URLSearchParams(location.search).get('diag');
  try {
    if (flag !== null) localStorage.setItem(KEY, flag === '0' ? 'off' : 'on');
    if (localStorage.getItem(KEY) !== 'on') return;
  } catch (e) {
    if (flag === null || flag === '0') return;
  }

  const stamps = [];
  let longFrames = 0;
  const onFrame = (now) => {
    const prev = stamps[stamps.length - 1];
    if (prev !== undefined && now - prev > LONG_FRAME_MS) longFrames++;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  const box = document.body.appendChild(document.createElement('div'));
  box.className = 'diag';
  const engine = /Chrome\/(\d+)/.exec(navigator.userAgent);
  const report = () => {
    const imgs = Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0);
    const px = imgs.reduce((sum, img) => sum + img.naturalWidth * img.naturalHeight, 0);
    const heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : '?';
    box.textContent = [
      'Chrome ' + (engine ? engine[1] : '?') + '  ' + innerWidth + 'x' + innerHeight + '  dpr ' + devicePixelRatio,
      stamps.length + ' fps  ' + longFrames + ' long frames (>' + LONG_FRAME_MS + ' ms)',
      document.getElementsByTagName('*').length + ' nodes  ' + imgs.length + ' img ' + (px / 1e6).toFixed(1) + ' MP  heap ' + heap,
    ].join('\n');
  };
  report();
  setInterval(report, 2000);
}
