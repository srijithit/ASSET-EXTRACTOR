/**
 * Asset Extractors - Web App Client Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  let allAssets = [];
  let filteredAssets = [];
  let selectedIds = new Set();
  let currentCategory = 'all';
  let activePreview = null;

  // DOM
  const extractForm = document.getElementById('extractForm');
  const targetUrlInput = document.getElementById('targetUrlInput');
  const deviceSelector = document.getElementById('deviceSelector');
  const btnExtract = document.getElementById('btnExtract');
  const btnExtractText = document.getElementById('btnExtractText');

  const resultsSection = document.getElementById('resultsSection');
  const loadingState = document.getElementById('loadingState');
  const resPageTitle = document.getElementById('resPageTitle');
  const resPageLink = document.getElementById('resPageLink');

  const chkWebpWeb = document.getElementById('chkWebpWeb');
  const archiveTypeSelect = document.getElementById('archiveTypeSelect');
  const btnDownloadBatch = document.getElementById('btnDownloadBatch');
  const btnBatchText = document.getElementById('btnBatchText');

  const catChips = document.querySelectorAll('.cat-chip');
  const liveSearchInput = document.getElementById('liveSearchInput');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const assetsGrid = document.getElementById('assetsGrid');

  // Preview Modal
  const webPreviewModal = document.getElementById('webPreviewModal');
  const btnClosePreview = document.getElementById('btnClosePreview');
  const previewMediaStage = document.getElementById('previewMediaStage');
  const previewTitle = document.getElementById('previewTitle');
  const previewDetails = document.getElementById('previewDetails');
  const btnCopyPreview = document.getElementById('btnCopyPreview');
  const btnDownloadPreview = document.getElementById('btnDownloadPreview');

  const webToast = document.getElementById('webToast');

  setupListeners();

  function setupListeners() {
    extractForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = targetUrlInput.value.trim();
      const device = deviceSelector.value;
      if (!url) return;
      await fetchPageAssets(url, device);
    });

    catChips.forEach(chip => {
      chip.addEventListener('click', () => {
        catChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.dataset.cat;
        applyFilters();
      });
    });

    liveSearchInput.addEventListener('input', applyFilters);

    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        filteredAssets.forEach(a => selectedIds.add(a.id));
      } else {
        filteredAssets.forEach(a => selectedIds.delete(a.id));
      }
      updateUI();
      renderGrid();
    });

    btnDownloadBatch.addEventListener('click', handleBatchDownload);

    btnClosePreview.addEventListener('click', () => webPreviewModal.classList.add('hidden'));
    webPreviewModal.addEventListener('click', (e) => {
      if (e.target === webPreviewModal) webPreviewModal.classList.add('hidden');
    });

    btnCopyPreview.addEventListener('click', () => {
      if (activePreview?.url) {
        navigator.clipboard.writeText(activePreview.url);
        toast('Link copied to clipboard!');
      }
    });

    btnDownloadPreview.addEventListener('click', () => {
      if (activePreview) downloadSingle(activePreview);
    });
  }

  async function fetchPageAssets(url, device) {
    loadingState.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    btnExtract.disabled = true;
    btnExtractText.textContent = 'Scanning...';

    try {
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, device })
      });

      const data = await resp.json();
      if (!data.success) {
        toast('Error: ' + (data.error || 'Failed to extract assets'));
        return;
      }

      allAssets = data.assets || [];
      resPageTitle.textContent = data.pageTitle || data.pageHost;
      resPageLink.textContent = data.pageUrl;
      resPageLink.href = data.pageUrl;

      // Select all by default
      selectedIds = new Set(allAssets.map(a => a.id));

      updateCounts();
      applyFilters();

      resultsSection.classList.remove('hidden');
      toast(`Extracted ${allAssets.length} assets successfully!`);
    } catch (err) {
      toast('Network error: ' + err.message);
    } finally {
      loadingState.classList.add('hidden');
      btnExtract.disabled = false;
      btnExtractText.textContent = 'Extract Assets';
    }
  }

  function updateCounts() {
    document.getElementById('cAll').textContent = allAssets.length;
    document.getElementById('cMobile').textContent = allAssets.filter(a => a.isMobile || a.device === 'mobile').length;
    document.getElementById('cImg').textContent = allAssets.filter(a => a.type === 'image' && a.category !== 'logo' && a.category !== 'background').length;
    document.getElementById('cVid').textContent = allAssets.filter(a => a.type === 'video' || a.type === 'audio').length;
    document.getElementById('cLogo').textContent = allAssets.filter(a => a.category === 'logo').length;
    document.getElementById('cSvg').textContent = allAssets.filter(a => a.type === 'svg' || a.ext === 'svg').length;
    document.getElementById('cBg').textContent = allAssets.filter(a => a.category === 'background').length;
  }

  function applyFilters() {
    const q = liveSearchInput.value.trim().toLowerCase();

    filteredAssets = allAssets.filter(a => {
      // Category
      if (currentCategory === 'mobile' && !a.isMobile && a.device !== 'mobile') return false;
      if (currentCategory === 'image' && (a.type !== 'image' || a.category === 'logo' || a.category === 'background')) return false;
      if (currentCategory === 'video' && a.type !== 'video' && a.type !== 'audio') return false;
      if (currentCategory === 'logo' && a.category !== 'logo') return false;
      if (currentCategory === 'svg' && a.type !== 'svg' && a.ext !== 'svg') return false;
      if (currentCategory === 'background' && a.category !== 'background') return false;

      // Search query
      if (q) {
        const text = `${a.filename} ${a.ext} ${a.alt} ${a.url}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });

    updateUI();
    renderGrid();
  }

  function updateUI() {
    const selCount = filteredAssets.filter(a => selectedIds.has(a.id)).length;
    btnBatchText.textContent = `Download Selected (${selCount})`;
    btnDownloadBatch.disabled = selCount === 0;
    selectAllCheckbox.checked = selCount > 0 && selCount === filteredAssets.length;
  }

  function renderGrid() {
    assetsGrid.innerHTML = '';

    filteredAssets.forEach(asset => {
      const isSelected = selectedIds.has(asset.id);

      const card = document.createElement('div');
      card.className = `web-asset-card ${isSelected ? 'selected' : ''}`;

      const thumb = document.createElement('div');
      thumb.className = 'web-card-thumb';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'web-card-check';
      chk.checked = isSelected;
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
        if (chk.checked) selectedIds.add(asset.id);
        else selectedIds.delete(asset.id);
        updateUI();
      });

      const badge = document.createElement('span');
      badge.className = `web-card-badge ${asset.isMobile ? 'mobile' : ''}`;
      badge.textContent = asset.isMobile ? `📱 ${asset.ext.toUpperCase()}` : asset.ext.toUpperCase();

      let media;
      if (asset.type === 'video') {
        media = document.createElement('video');
        media.src = asset.url;
        media.muted = true;
      } else {
        media = document.createElement('img');
        media.src = `/api/proxy?url=${encodeURIComponent(asset.url)}`;
        media.loading = 'lazy';
        media.onerror = () => { media.src = asset.url; };
      }

      thumb.appendChild(chk);
      thumb.appendChild(badge);
      thumb.appendChild(media);

      const info = document.createElement('div');
      info.className = 'web-card-info';
      info.innerHTML = `
        <div class="web-card-name" title="${asset.filename}">${asset.filename}</div>
        <div class="web-card-meta">
          <span>${asset.category.toUpperCase()}</span>
          <span>${asset.ext.toUpperCase()}</span>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'web-card-actions';

      const btnDl = document.createElement('button');
      btnDl.className = 'btn-card-dl';
      btnDl.textContent = '⬇ Download';
      btnDl.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSingle(asset);
      });

      actions.appendChild(btnDl);
      info.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener('click', () => {
        activePreview = asset;
        previewMediaStage.innerHTML = '';
        if (asset.type === 'video') {
          const v = document.createElement('video');
          v.src = asset.url;
          v.controls = true;
          v.autoplay = true;
          previewMediaStage.appendChild(v);
        } else {
          const im = document.createElement('img');
          im.src = `/api/proxy?url=${encodeURIComponent(asset.url)}`;
          previewMediaStage.appendChild(im);
        }

        previewTitle.textContent = asset.filename;
        previewDetails.textContent = `${asset.category.toUpperCase()} • ${asset.ext.toUpperCase()} • ${asset.url.substring(0, 60)}...`;
        webPreviewModal.classList.remove('hidden');
      });

      assetsGrid.appendChild(card);
    });
  }

  async function convertToWebp(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => resolve(blob), 'image/webp', 0.85);
      };
      img.onerror = () => resolve(null);
      img.src = `/api/proxy?url=${encodeURIComponent(imgUrl)}`;
    });
  }

  async function downloadSingle(asset) {
    const shouldWebp = chkWebpWeb.checked && (asset.type === 'image' || asset.category === 'logo');
    let filename = asset.filename;

    if (shouldWebp) {
      filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
      toast(`Converting & downloading ${filename}...`);
      const blob = await convertToWebp(asset.url);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        toast(`Saved ${filename}!`);
        return;
      }
    }

    toast(`Downloading ${filename}...`);
    const a = document.createElement('a');
    a.href = `/api/proxy?url=${encodeURIComponent(asset.url)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleBatchDownload() {
    const selected = filteredAssets.filter(a => selectedIds.has(a.id));
    if (!selected.length) return;

    const format = archiveTypeSelect.value;
    btnBatchText.textContent = `Packaging ${selected.length} assets...`;
    btnDownloadBatch.disabled = true;

    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: selected,
          format: format,
          domain: resPageTitle.textContent || 'WebAssets'
        })
      });

      if (!response.ok) throw new Error('Server archive packaging failed');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `AssetExtractors_Archive.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Archive downloaded successfully!');
    } catch (err) {
      toast('Batch download failed: ' + err.message);
    } finally {
      btnBatchText.textContent = `Download Selected (${selected.length})`;
      btnDownloadBatch.disabled = false;
    }
  }

  function toast(msg) {
    webToast.textContent = msg;
    webToast.classList.remove('hidden');
    setTimeout(() => webToast.classList.add('hidden'), 2800);
  }
});
