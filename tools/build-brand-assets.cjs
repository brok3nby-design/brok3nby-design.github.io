// Resize and encode the original artwork without changing its content.
const sharp = require(process.env.B3D_SHARP || 'sharp');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
(async () => {
  for (const [name, width] of [['b3d-header.webp', 560], ['b3d-web.webp', 1040]]) {
    const target = path.join(root, 'images/studio', name);
    await sharp(path.join(root, 'images/studio/b3d.png'))
      .resize({ width, withoutEnlargement:true }).webp({ quality:85 }).toFile(target);
    console.log(name + ': ' + fs.statSync(target).size + ' bytes');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
