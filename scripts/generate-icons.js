const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, '../public/logo-moovx.png');
const outDir = path.join(__dirname, '../public');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

async function generate() {
  for (const { name, size } of sizes) {
    await sharp(input)
      .resize(size, size, { fit: 'contain', background: { r: 13, g: 11, b: 8, alpha: 1 } })
      .png()
      .toFile(path.join(outDir, name));
    console.log(`Done ${name} (${size}x${size})`);
  }
  // favicon.png copy
  await sharp(input)
    .resize(32, 32, { fit: 'contain', background: { r: 13, g: 11, b: 8, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, 'favicon.png'));
  console.log('Done favicon.png');
}

generate().catch(console.error);
