/**
 * GrabAll Studio - Full Tab Gallery Viewer Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tabId = parseInt(urlParams.get('tabId'), 10);

  let assets = [];
  let filtered = [];
  let selected = new Set();
  let currentCat = 'all';
  let currentRes = 'all';
  let currentExt = 'all';
  let pageTitle = 'Page Assets';
  let pageHost = 'website';
  let activePreview = null;

  // DOM Elements
  const sourceUrl = document.getElementById('sourceUrl');
  const totalStats = document.getElementById('totalStats');
  const btnDeepScan = document.getElementById('btnDeepScan');

  const cAll = document.getElementById('cAll');
  const cMobile = document.getElementById('cMobile');
  const cImg = document.getElementById('cImg');
  const cVid = document.getElementById('cVid');
  const cLogo = document.getElementById('cLogo');
  const cSvg = document.getElementById('cSvg');
  const cBg = document.getElementById('cBg');

  const filterListItems = document.querySelectorAll('.filter-list li');
  const resRadios = document.querySelectorAll('input[name="res"]');
  const extTags = document.querySelectorAll('.ext-tag');

  const vSearch = document.getElementById('vSearch');
  const vSelectAll = document.getElementById('vSelectAll');
  const vSelectionSummary = document.getElementById('vSelectionSummary');
  const vInvert = document.getElementById('vInvert');
  const vArchiveType = document.getElementById('vArchiveType');
  const vBtnExport = document.getElementById('vBtnExport');
  const vExportText = document.getElementById('vExportText');
  const vGallery = document.getElementById('vGallery');

  const vPreviewModal = document.getElementById('vPreviewModal');
  const vClosePreview = document.getElementById('vClosePreview');
  const vPreviewStage = document.getElementById('vPreviewStage');
  const vPreviewMeta = document.getElementById('vPreviewMeta');
  const vBtnCopyLink = document.getElementById('vBtnCopyLink');
  const vBtnDownloadItem = document.getElementById('vBtnDownloadItem');
  const vToast = document.getElementById('vToast');

  await init();

  async function init() {
    setupListeners();
    await loadAssets();
  }

  function setupListeners() {
    filterListItems.forEach(li => {
      li.addEventListener('click', () => {
        filterListItems.forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        currentCat = li.dataset.cat;
        applyFilters();
      });
    });

    resRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        currentRes = radio.value;
        applyFilters();
      });
    });

    extTags.forEach(tag => {
      tag.addEventListener('click', () => {
        extTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentExt = tag.dataset.ext;
        applyFilters();
      });
    });

    vSearch.addEventListener('input', applyFilters);

    vSelectAll.addEventListener('change', () => {
      if (vSelectAll.checked) {
        filtered.forEach(a => selected.add(a.id));
      } else {
        filtered.forEach(a => selected.delete(a.id));
      }
      updateUI();
      renderGallery();
    });

    vInvert.addEventListener('click', () => {
      filtered.forEach(a => {
        if (selected.has(a.id)) selected.delete(a.id);
        else selected.add(a.id);
      });
      updateUI();
      renderGallery();
    });

    vBtnExport.addEventListener('click', handleExportArchive);
    btnDeepScan.addEventListener('click', rescan);

    const btnOpenSimStudio = document.getElementById('btnOpenSimStudio');
    if (btnOpenSimStudio) {
      btnOpenSimStudio.addEventListener('click', () => {
        const url = sourceUrl.textContent || 'https://wikipedia.org';
        const simUrl = chrome.runtime.getURL(`simulator/simulator.html?url=${encodeURIComponent(url)}`);
        chrome.tabs.create({ url: simUrl });
      });
    }

    vClosePreview.addEventListener('click', () => vPreviewModal.classList.add('hidden'));
    vPreviewModal.addEventListener('click', (e) => {
      if (e.target === vPreviewModal) vPreviewModal.classList.add('hidden');
    });

    vBtnCopyLink.addEventListener('click', () => {
      if (activePreview?.url) {
        navigator.clipboard.writeText(activePreview.url);
        toast('Link copied to clipboard!');
      }
    });

    vBtnDownloadItem.addEventListener('click', async () => {
      if (activePreview && activePreview.url) {
        const filename = activePreview.filename || `asset_${Date.now().toString(36)}.${activePreview.ext || 'png'}`;
        toast(`Downloading ${filename}...`);

        try {
          if (activePreview.url.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = activePreview.url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast(`Saved ${filename}!`);
            return;
          }

          const resp = await fetch(activePreview.url, { mode: 'cors' }).catch(() => null);
          if (resp && resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            toast(`Saved ${filename}!`);
            return;
          }

          chrome.runtime.sendMessage({
            action: 'DOWNLOAD_SINGLE',
            asset: activePreview,
            folder: ''
          });
        } catch (e) {
          const link = document.createElement('a');
          link.href = activePreview.url;
          link.download = filename;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    });
  }

  async function loadAssets() {
    if (tabId) {
      // Check cache first
      chrome.storage.local.get([`graball_tab_${tabId}`], async (result) => {
        const cached = result[`graball_tab_${tabId}`];
        if (cached && cached.assets) {
          processScannedData(cached);
        } else {
          await rescan();
        }
      });
    }
  }

  async function rescan() {
    toast('Scanning active tab assets...');
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['scripts/scanner.js']
      });

      if (results && results[0] && results[0].result) {
        processScannedData(results[0].result);
      }
    } catch (e) {
      toast('Failed to scan tab: ' + e.message);
    }
  }

  function processScannedData(data) {
    assets = data.assets || [];
    pageTitle = data.pageTitle || 'Assets';
    pageHost = data.pageHost || 'website';
    sourceUrl.textContent = data.pageUrl || pageHost;
    totalStats.textContent = `${assets.length} Assets Extracted`;

    // Counts
    cAll.textContent = assets.length;
    if (cMobile) cMobile.textContent = assets.filter(a => a.isMobile || a.device === 'mobile').length;
    cImg.textContent = assets.filter(a => a.type === 'image' && a.category !== 'logo' && a.category !== 'background').length;
    cVid.textContent = assets.filter(a => a.type === 'video' || a.type === 'audio').length;
    cLogo.textContent = assets.filter(a => a.category === 'logo').length;
    cSvg.textContent = assets.filter(a => a.type === 'svg').length;
    cBg.textContent = assets.filter(a => a.category === 'background').length;

    assets.forEach(a => selected.add(a.id));
    applyFilters();
  }

  function applyFilters() {
    const q = vSearch.value.toLowerCase().trim();

    filtered = assets.filter(a => {
      // Category
      if (currentCat !== 'all') {
        if (currentCat === 'mobile' && !a.isMobile && a.device !== 'mobile') return false;
        if (currentCat === 'image' && (a.category === 'logo' || a.category === 'background' || a.type === 'svg')) return false;
        if (currentCat === 'video' && a.type !== 'video' && a.type !== 'audio') return false;
        if (currentCat === 'logo' && a.category !== 'logo') return false;
        if (currentCat === 'svg' && a.type !== 'svg') return false;
        if (currentCat === 'background' && a.category !== 'background') return false;
      }

      // Resolution
      if (currentRes !== 'all') {
        const maxD = Math.max(a.width || 0, a.height || 0);
        if (currentRes === 'hd' && maxD < 1920) return false;
        if (currentRes === 'large' && (maxD < 800 || maxD >= 1920)) return false;
        if (currentRes === 'medium' && (maxD < 200 || maxD >= 800)) return false;
        if (currentRes === 'small' && maxD >= 200 && maxD > 0) return false;
      }

      // Extension
      if (currentExt !== 'all') {
        const ext = (a.ext || '').toLowerCase();
        if (currentExt === 'jpg' && !['jpg', 'jpeg'].includes(ext)) return false;
        if (currentExt !== 'jpg' && ext !== currentExt) return false;
      }

      // Search query
      if (q) {
        const matchName = (a.filename || '').toLowerCase().includes(q);
        const matchUrl = (a.url || '').toLowerCase().includes(q);
        const matchAlt = (a.alt || '').toLowerCase().includes(q);
        if (!matchName && !matchUrl && !matchAlt) return false;
      }

      return true;
    });

    updateUI();
    renderGallery();
  }

  function updateUI() {
    const selectedCount = filtered.filter(a => selected.has(a.id)).length;
    vSelectionSummary.textContent = `${selectedCount} / ${filtered.length} Selected`;
    vSelectAll.checked = filtered.length > 0 && selectedCount === filtered.length;
    vBtnExport.disabled = selectedCount === 0;
  }

  function renderGallery() {
    vGallery.innerHTML = '';

    filtered.forEach(asset => {
      const isSel = selected.has(asset.id);
      const card = document.createElement('div');
      card.className = `studio-card ${isSel ? 'selected' : ''}`;
      card.dataset.id = asset.id;

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'sc-check';
      chk.checked = isSel;
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
        if (chk.checked) selected.add(asset.id);
        else selected.delete(asset.id);
        card.classList.toggle('selected', chk.checked);
        updateUI();
      });

      const badge = document.createElement('div');
      badge.className = `sc-badge ${asset.isMobile ? 'sc-mobile' : ''}`;
      const extStr = (asset.ext || asset.type).toUpperCase();
      badge.textContent = asset.isMobile ? `📱 ${extStr}` : extStr;

      const thumb = document.createElement('div');
      thumb.className = 'sc-thumb';

      if (asset.type === 'video') {
        const vid = document.createElement('video');
        vid.src = asset.url;
        vid.muted = true;
        thumb.appendChild(vid);
      } else {
        const img = document.createElement('img');
        img.src = asset.url;
        img.loading = 'lazy';
        thumb.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'sc-info';
      const dimText = asset.width > 0 ? `${asset.width} × ${asset.height}` : 'Vector';
      info.innerHTML = `
        <div class="sc-name" title="${asset.filename}">${asset.filename}</div>
        <div class="sc-meta"><span>${dimText}</span><span>${asset.category.toUpperCase()}</span></div>
      `;

      card.appendChild(chk);
      card.appendChild(badge);
      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener('click', () => {
        activePreview = asset;
        vPreviewStage.innerHTML = '';
        if (asset.type === 'video') {
          const v = document.createElement('video');
          v.src = asset.url;
          v.controls = true;
          v.autoplay = true;
          vPreviewStage.appendChild(v);
        } else {
          const im = document.createElement('img');
          im.src = asset.url;
          vPreviewStage.appendChild(im);
        }
        vPreviewMeta.innerHTML = `<strong>${asset.filename}</strong> &nbsp;•&nbsp; ${dimText} &nbsp;•&nbsp; ${asset.url.substring(0, 50)}...`;
        vPreviewModal.classList.remove('hidden');
      });

      vGallery.appendChild(card);
    });
  }

  async function convertImageToWebp(imageUrl, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(null);
          }, 'image/webp', quality);
        } catch (e) {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }

  async function handleExportArchive() {
    const selAssets = filtered.filter(a => selected.has(a.id));
    if (selAssets.length === 0) return;

    const format = vArchiveType.value; // 'zip' or 'rar'
    const vChkWebp = document.getElementById('vChkWebp');
    const shouldConvertToWebp = vChkWebp && vChkWebp.checked;

    vBtnExport.disabled = true;
    vExportText.textContent = `Packaging ${selAssets.length} items...`;

    try {
      const zip = new JSZip();
      const folderImages = zip.folder("images");
      const folderVideos = zip.folder("videos");
      const folderLogos = zip.folder("logos");
      const folderSvgs = zip.folder("svgs");

      for (let i = 0; i < selAssets.length; i++) {
        const a = selAssets[i];
        try {
          let fileData;
          let fname = a.filename || `file_${i + 1}.${a.ext || 'bin'}`;

          if (shouldConvertToWebp && (a.type === 'image' || a.type === 'svg' || a.category === 'logo')) {
            const webpBlob = await convertImageToWebp(a.url, 0.85);
            if (webpBlob) {
              fileData = await webpBlob.arrayBuffer();
              fname = fname.replace(/\.[^/.]+$/, "") + ".webp";
            }
          }

          if (!fileData) {
            if (a.url.startsWith('data:')) {
              const b64 = a.url.split(',')[1];
              fileData = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            } else {
              const r = await fetch(a.url).catch(() => null);
              if (r && r.ok) fileData = await r.arrayBuffer();
            }
          }

          if (fileData) {
            if (a.category === 'logo') folderLogos.file(fname, fileData);
            else if (a.type === 'video' || a.type === 'audio') folderVideos.file(fname, fileData);
            else if (a.type === 'svg' && !shouldConvertToWebp) folderSvgs.file(fname, fileData);
            else folderImages.file(fname, fileData);
          }
        } catch (e) {}
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const dl = document.createElement('a');
      dl.href = blobUrl;
      dl.download = `AssetExtractors_${pageHost}_archive.${format}`;
      document.body.appendChild(dl);
      dl.click();
      document.body.removeChild(dl);
      toast(`Exported AssetExtractors_${pageHost}_archive.${format}!`);
    } catch (err) {
      toast('Export failed: ' + err.message);
    } finally {
      vBtnExport.disabled = false;
      vExportText.textContent = 'Download Batch Archive';
    }
  }

  function toast(msg) {
    vToast.textContent = msg;
    vToast.classList.remove('hidden');
    setTimeout(() => vToast.classList.add('hidden'), 2500);
  }
});
