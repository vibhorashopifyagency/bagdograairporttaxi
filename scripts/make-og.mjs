// Renders the favicons, logo and default share card from SVG with sharp.
// Run with `npm run og` after changing the brand colours or the tagline.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const icon = await readFile('public/favicon.svg');
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['logo.png', 512]]) {
  await sharp(icon, { density: 600 }).resize(size, size).png().toFile(`public/${file}`);
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd59a"/><stop offset=".55" stop-color="#f7b267"/><stop offset="1" stop-color="#e98a5b"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#sky)"/>
  <circle cx="930" cy="250" r="70" fill="#fff4dc"/>
  <path d="M0 420 160 300l90 50 170-170 120 110 90-70 200 180 140-110 120 70 110-90 0 380H0Z" fill="#7aa39a"/>
  <path d="m420 180 30 30-22-8-22 14Zm470 0" fill="#fff"/>
  <path d="M0 500 180 390l150 70 170-120 190 140 160-90 170 110 180-80v210H0Z" fill="#2f6f61"/>
  <path d="M0 560 220 470l200 60 210-80 220 90 180-60 170 50v100H0Z" fill="#0b5d4b"/>
  <text x="70" y="120" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#07443a" letter-spacing="3">BAGDOGRA AIRPORT TAXI</text>
  <text x="70" y="200" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="800" fill="#10201c">Darjeeling · Gangtok · Sikkim</text>
  <text x="70" y="262" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="600" fill="#10201c">Fixed fares · Verified drivers · Free cancellation</text>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og/default.png');
console.log('icons and og card written');
