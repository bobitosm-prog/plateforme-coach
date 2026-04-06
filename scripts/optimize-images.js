const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const images = [
  { input: 'public/images/hero-nutrition.png', output: 'public/images/hero-nutrition.webp', width: 800 },
  { input: 'public/images/hero-gym.png', output: 'public/images/hero-gym.webp', width: 800 },
  { input: 'public/images/hero-coaching.png', output: 'public/images/hero-coaching.webp', width: 800 },
  { input: 'public/images/hero-athlete.png', output: 'public/images/hero-athlete.webp', width: 800 },
];

async function optimize() {
  for (const { input, output, width } of images) {
    const fullInput = path.join(__dirname, '..', input);
    const fullOutput = path.join(__dirname, '..', output);
    if (!fs.existsSync(fullInput)) { console.log('Skip ' + input); continue; }
    const info = await sharp(fullInput)
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(fullOutput);
    const origSize = fs.statSync(fullInput).size;
    console.log(`${path.basename(input)} -> ${path.basename(output)} : ${(origSize/1024/1024).toFixed(1)} MB -> ${(info.size/1024).toFixed(0)} KB`);
  }
}

optimize().catch(console.error);
