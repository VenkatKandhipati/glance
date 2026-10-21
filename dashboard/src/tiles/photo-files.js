// Photos served by the Mac: filled at build time from dashboard/.photos-resized/ (gitignored).
// The frame build swaps this module for photo-files-frame.js (see vite.config.js).
export default import.meta.glob('../../.photos-resized/*.jpg', { eager: true, query: '?url', import: 'default' });
