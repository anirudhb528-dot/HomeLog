'use strict';

/**
 * Generates the app icon / adaptive icon / splash / favicon PNGs from a simple
 * inline "house" logo, using sharp (a dev-only dependency). Run once and commit
 * the PNGs:  `node assets/generate-assets.js`
 *
 * Replace these with real brand artwork before a public store launch.
 */
const path = require('path');
const sharp = require('sharp');

const OUT = __dirname;
const TEAL = '#0F766E';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// A white house mark with a teal doorway, scalable via the `size` viewport.
function houseSvg(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
       <polygon points="50,14 92,53 8,53" fill="#ffffff"/>
       <rect x="22" y="50" width="56" height="36" rx="3" fill="#ffffff"/>
       <rect x="43" y="64" width="14" height="22" rx="2" fill="${TEAL}"/>
     </svg>`
  );
}

async function compose({ size, bg, glyphScale, file }) {
  const glyph = Math.round(size * glyphScale);
  const offset = Math.round((size - glyph) / 2);
  const glyphPng = await sharp(houseSvg(glyph)).png().toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: glyphPng, top: offset, left: offset }])
    .png()
    .toFile(path.join(OUT, file));
  console.log('wrote', file);
}

(async () => {
  await compose({ size: 1024, bg: TEAL, glyphScale: 0.62, file: 'icon.png' });
  // Adaptive icon foreground is transparent; the teal background is set in config.
  await compose({ size: 1024, bg: TRANSPARENT, glyphScale: 0.5, file: 'adaptive-icon.png' });
  await compose({ size: 1284, bg: TEAL, glyphScale: 0.4, file: 'splash.png' });
  await compose({ size: 48, bg: TEAL, glyphScale: 0.72, file: 'favicon.png' });
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
