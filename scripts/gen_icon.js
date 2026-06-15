#!/usr/bin/env node
// Génère icon.png et adaptive-icon.png à partir du Ghost Orb officiel haute résolution.
// Usage : node scripts/gen_icon.js <chemin-source>
// Source : https://docs.ghost.org/images/74e0ffae-ghost-logo-orb.png — 400×400, orb sombre sur fond transparent

const Jimp = require('../node_modules/jimp-compact');
const path = require('path');

const SRC = process.argv[2] || '/tmp/ghost-logo-orb.png';
const ASSETS = path.join(__dirname, '../assets');
const SIZE = 1024;
const BG_COLOR = 0x15171Aff;

async function main() {
  const src = await Jimp.read(SRC);
  console.log(`Source : ${src.bitmap.width}×${src.bitmap.height}, alpha : ${src.hasAlpha()}`);

  // L'orb officiel est en couleur sombre sur fond transparent.
  // On inverse les canaux RGB des pixels non-transparents → orb blanc sur transparent.
  const white = src.clone();
  white.scan(0, 0, white.bitmap.width, white.bitmap.height, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] > 0) {
      this.bitmap.data[idx]     = 255 - this.bitmap.data[idx];
      this.bitmap.data[idx + 1] = 255 - this.bitmap.data[idx + 1];
      this.bitmap.data[idx + 2] = 255 - this.bitmap.data[idx + 2];
    }
  });

  // --- icon.png --- (76 % du canvas = marges équilibrées)
  const ORB_ICON = Math.round(SIZE * 0.76); // 778px
  const orbIcon  = white.clone().resize(ORB_ICON, ORB_ICON, Jimp.RESIZE_BEZIER);
  const iconBg   = new Jimp(SIZE, SIZE, BG_COLOR);
  const offIcon  = Math.round((SIZE - ORB_ICON) / 2);
  iconBg.composite(orbIcon, offIcon, offIcon);
  await iconBg.writeAsync(`${ASSETS}/icon.png`);
  console.log(`✓ assets/icon.png (${SIZE}×${SIZE}, orb ${ORB_ICON}px)`);

  // --- adaptive-icon.png ---
  // Le fond (#15171A) est déclaré dans app.json → adaptiveIcon.backgroundColor.
  // L'orb est centré à 62 % du canvas = safe zone Android (72/108dp).
  const ORB_ADAPTIVE = Math.round(SIZE * 0.62); // 635px
  const orbAdaptive  = white.clone().resize(ORB_ADAPTIVE, ORB_ADAPTIVE, Jimp.RESIZE_BEZIER);
  const adaptiveBg   = new Jimp(SIZE, SIZE, BG_COLOR);
  const offAdaptive  = Math.round((SIZE - ORB_ADAPTIVE) / 2);
  adaptiveBg.composite(orbAdaptive, offAdaptive, offAdaptive);
  await adaptiveBg.writeAsync(`${ASSETS}/adaptive-icon.png`);
  console.log(`✓ assets/adaptive-icon.png (${SIZE}×${SIZE}, orb ${ORB_ADAPTIVE}px, safe zone 62 %)`);
}

main().catch((err) => {
  console.error('Erreur gen_icon:', err);
  process.exit(1);
});
