# 🚀 Asset Extractors

**DEV by [srijith](https://srijith.vercel.app/)**

A full-suite Web Media Asset Extractor available both as a **Render-Ready Web App** and a **Chrome Extension (Manifest V3)**.

---

## 🌟 Key Features

- **🌐 Online Web Extractor**: Extract images, videos, audio, SVGs, and brand logos from any public URL.
- **⚡ On-The-Fly WebP Converter**: Automatically converts images to modern `.webp` before single download or batch archive download.
- **📱 Mobile Responsive Device Simulator**: Real device frame emulation (iPhone 16 Pro, Samsung Galaxy S24, Pixel 8, iPad Pro) with orientation rotation, zoom, dynamic island, and mockup screenshot exports.
- **📸 Screen & Page Capture Suite**:
  - `Ctrl+Shift+S`: Selected Area Drag-and-Drop Cropper
  - `Ctrl+Shift+E`: Full Page Scrolling Stitch Screenshot
  - `Ctrl+Shift+1`: Visible Part Snapshot
  - Whole Screen & Application Window Capture
- **📦 Batch Archive Packaging**: Export selected assets as `.ZIP` or `.RAR` archives organized into `/images`, `/videos`, `/logos`, `/svgs`.

---

## ☁️ 1. Deploying the Web App to Render (100% Free)

This repository is pre-configured with `render.yaml` for instant 1-click deployment on [Render](https://render.com).

1. Log into your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** → **Web Service**.
3. Connect this GitHub repository: `https://github.com/srijithit/ASSET-EXTRACTOR.git`.
4. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. Click **Deploy Web Service**. Render will generate a live URL (e.g. `https://asset-extractors.onrender.com`).

---

## 💻 2. Installing the Chrome Extension Locally

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the [`extension/`](extension/) directory from this repository.
5. Click the **Asset Extractors** icon in your toolbar on any website!

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local web server
npm start
# Server running at http://localhost:3000
```

---

## 👤 Author

Developed with ❤️ by **[srijith](https://srijith.vercel.app/)**
