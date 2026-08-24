const fs = require('fs');
const path = require('path');

// SVG string for the Light Blue & White Modern Asset Extractors Logo
function createSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" fill="none">
    <defs>
      <linearGradient id="gradBack" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0369a1" />
        <stop offset="100%" stop-color="#075985" />
      </linearGradient>
      <linearGradient id="gradMid" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="gradFront" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7dd3fc" />
        <stop offset="100%" stop-color="#0ea5e9" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0284c7" flood-opacity="0.35" />
      </filter>
    </defs>
    
    <!-- Background card -->
    <rect x="22" y="24" width="46" height="80" rx="10" transform="skewX(-14)" fill="url(#gradBack)" opacity="0.9" />
    
    <!-- Middle card -->
    <rect x="42" y="24" width="46" height="80" rx="10" transform="skewX(-14)" fill="url(#gradMid)" opacity="0.95" />
    
    <!-- Front card with glow -->
    <rect x="62" y="24" width="46" height="80" rx="10" transform="skewX(-14)" fill="url(#gradFront)" filter="url(#shadow)" />
    
    <!-- Inner diamond / asset spark -->
    <path d="M 80 50 L 92 64 L 80 78 L 68 64 Z" fill="#ffffff" opacity="0.95" />
  </svg>`;
}

const iconsDir = path.join(__dirname, 'extension', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), createSvg(128));
console.log('✅ Created light blue SVG icon');
