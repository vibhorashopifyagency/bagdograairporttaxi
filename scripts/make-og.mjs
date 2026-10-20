// Renders the favicons, app icons, logo files and the default share card.
// The brand master is scripts/brand/logo-master.png (the Jai Jawan Travels
// badge recoloured to the site's ink and lime); logo-master-dark.png carries
// a lime outer ring for dark backgrounds. Run with `npm run og` after
// changing the badge, the hero photo or the tagline.
import sharp from 'sharp';

const light = 'scripts/brand/logo-master.png';
const dark = 'scripts/brand/logo-master-dark.png';
const ink = { r: 17, g: 17, b: 17, alpha: 1 };

await sharp(light).resize(512, 512).png().toFile('public/logo.png');
await sharp(dark).resize(512, 512).png().toFile('public/logo-dark.png');
await sharp(light).resize(192, 192).png().toFile('public/logo-192.png');
await sharp(light).resize(32, 32).png().toFile('public/favicon-32.png');
// App icons: the badge on an ink square with a small margin, as launchers crop corners.
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const pad = Math.round(size * 0.06);
  const badge = await sharp(light).resize(size - pad * 2, size - pad * 2).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: ink } }).composite([{ input: badge, top: pad, left: pad }]).png().toFile(`public/${file}`);
}

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111111" stop-opacity=".25"/><stop offset=".5" stop-color="#111111" stop-opacity=".55"/><stop offset="1" stop-color="#111111" stop-opacity=".94"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="200" y="118" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#a1e005" letter-spacing="4">BAGDOGRA AIRPORT TAXI</text>
  <text x="200" y="150" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="500" fill="#ffffff" fill-opacity=".8">A unit of Jai Jawan Travels · 4.9 on Google</text>
  <text x="70" y="470" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="800" fill="#ffffff">Darjeeling · Gangtok · Sikkim</text>
  <text x="70" y="530" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">Fixed fares · Verified drivers · Free cancellation</text>
</svg>`;
const hero = await sharp('public/img/hero-1600.webp').resize(1200, 630, { fit: 'cover', position: 'attention' }).toBuffer();
const badge = await sharp(dark).resize(110, 110).png().toBuffer();
await sharp(hero).composite([{ input: Buffer.from(overlay) }, { input: badge, top: 70, left: 70 }]).png({ compressionLevel: 9 }).toFile('public/og/default.png');
console.log('icons, logos and og card written');
