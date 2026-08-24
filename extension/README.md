# GrabAll - Web Media & Asset Extractor (Chrome Extension)

GrabAll is a powerful, modern Manifest V3 Chrome Extension built to detect, inspect, filter, and batch download images, videos, audio, SVGs, logos, and web assets from any webpage into organized `.zip` or `.rar` archives.

---

## ✨ Features

- **Multi-Media Extraction**:
  - **Images**: `<img>` (`src`, `srcset`, `data-src`, lazy-loaded), CSS `background-image` / stylesheets, `<picture>` tags, `<canvas>` captures.
  - **Videos & Audio**: `<video>`, `<audio>`, embedded YouTube / Vimeo streams & posters, linked media files.
  - **Logos & Icons**: Favicons, Apple Touch icons, OpenGraph/Twitter banners, brand logo detection.
  - **SVGs & Vector Graphics**: Inline `<svg>` serialization, external `.svg` files.
- **Batch Download as .RAR / .ZIP**:
  - Download all selected assets in a compressed `.rar` or `.zip` archive with organized subfolders (`/images`, `/videos`, `/logos`, `/svgs`).
  - Direct folder download option via Chrome Downloads API.
- **Sleek Popup UI (GrabAll design)**:
  - Real-time animated scanning progress bar.
  - Category tabs (`All`, `Images`, `Videos`, `Logos`, `SVGs`, `Backgrounds`).
  - Search & filter by dimensions (HD, Large, Medium, Small) and file format (JPG, PNG, WEBP, SVG, MP4, GIF).
  - Hover quick actions: Instant Download, Copy URL, Zoom Preview, Open in New Tab.
- **Deep Scan Mode**:
  - Automatically scrolls the page to trigger dynamic & lazy-loaded media assets.
- **Studio Full-Tab Viewer**:
  - Pop out to a dedicated widescreen studio tab for viewing hundreds of assets simultaneously.

---

## 🚀 How to Install in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the address bar.
3. Toggle on **Developer mode** in the top-right corner.
4. Click the **Load unpacked** button in the top-left.
5. Select this directory:
   ```
   C:\Users\SRIXX\.gemini\antigravity\scratch\graball-asset-extractor
   ```
6. The **GrabAll** extension icon will now appear in your browser toolbar! Pin it for quick access.

---

## 📁 Project Structure

```
graball-asset-extractor/
├── manifest.json              # Chrome Manifest V3 configuration
├── icons/                     # Extension icons (16, 32, 48, 128px)
├── lib/
│   └── jszip.min.js           # Client-side archive compression
├── scripts/
│   └── scanner.js             # Deep DOM asset extraction engine
├── background/
│   └── background.js          # Background service worker & downloads manager
├── popup/
│   ├── popup.html             # Popup UI
│   ├── popup.css              # Modern stylesheet matching GrabAll design
│   └── popup.js               # Popup interactions, filters, batch downloads
├── viewer/
│   ├── viewer.html            # Full-page studio gallery
│   ├── viewer.css             # Studio layout styles
│   └── viewer.js              # Studio gallery manager
└── README.md
```
