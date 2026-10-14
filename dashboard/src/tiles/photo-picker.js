// Decides which photo the photo tile shows next. Kept free of the DOM and Vite so it can be unit tested.

// While the server is unreachable (the Mac is asleep), new photos can't load, but ones already
// shown are in the browser cache. So when a load fails, rotate through those, and every few
// turns try a new photo to find out whether the server is back.
const PROBE_EVERY = 4;

export function createPicker(urls) {
  const seen = [];
  let next = 0, reuse = 0, turns = 0, offline = false;
  return {
    pick(current) {
      turns++;
      if (offline && seen.length > 1 && turns % PROBE_EVERY !== 0) {
        for (let k = 0; k < seen.length; k++) {
          const url = seen[reuse++ % seen.length];
          if (url !== current) return url;
        }
      }
      return urls[next++ % urls.length];
    },
    loaded(url) {
      // Only a photo that wasn't cached yet proves the server is reachable again.
      if (seen.indexOf(url) === -1) {
        seen.push(url);
        offline = false;
      }
    },
    failed() {
      offline = true;
    },
    get offline() { return offline; },
  };
}
