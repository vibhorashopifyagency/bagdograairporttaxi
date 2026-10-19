// Renders the favicons, logo and default share card from SVG with sharp.
// Run with `npm run og` after changing the brand colours or the tagline.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const icon = await readFile('public/favicon.svg');
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['logo.png', 512]]) {
  await sharp(icon, { density: 600 }).resize(size, size).png().toFile(`public/${file}`);
}

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10201c" stop-opacity=".15"/><stop offset=".55" stop-color="#10201c" stop-opacity=".55"/><stop offset="1" stop-color="#10201c" stop-opacity=".92"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="70" y="400" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#a1e005" letter-spacing="4">BAGDOGRA AIRPORT TAXI</text>
  <text x="70" y="470" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="800" fill="#ffffff">Darjeeling · Gangtok · Sikkim</text>
  <text x="70" y="530" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">Fixed fares · Verified drivers · Free cancellation</text>
</svg>`;
const hero = await sharp('public/img/hero-1600.webp').resize(1200, 630, { fit: 'cover', position: 'attention' }).toBuffer();
await sharp(hero).composite([{ input: Buffer.from(overlay) }]).png({ compressionLevel: 9 }).toFile('public/og/default.png');
console.log('icons and og card written');
