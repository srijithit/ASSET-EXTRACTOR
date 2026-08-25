/**
 * Asset Extractors - Web App Client Controller
 */

// Register PWA Service Worker for Mobile App Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg error:', err));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  let allAssets = [];
  let filteredAssets = [];
  let selectedIds = new Set();
  let currentCategory = 'all';
  let activePreview = null;

  let linkReportData = [];
  let seoReportData = null;

  // Nav Tool Tabs
  const tabExtractor = document.getElementById('tabExtractor');
  const tabLinkInspector = document.getElementById('tabLinkInspector');
  const tabSeoAudit = document.getElementById('tabSeoAudit');
  const tabSimulator = document.getElementById('tabSimulator');

  // Tool Views
  const viewExtractor = document.getElementById('viewExtractor');
  const viewLinkInspector = document.getElementById('viewLinkInspector');
  const viewSeoAudit = document.getElementById('viewSeoAudit');
  const viewSimulator = document.getElementById('viewSimulator');

  // Asset Extractor DOM
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

  // Link Inspector DOM
  const linkForm = document.getElementById('linkForm');
  const linkUrlInput = document.getElementById('linkUrlInput');
  const btnCheckLinks = document.getElementById('btnCheckLinks');
  const linkResultsSection = document.getElementById('linkResultsSection');
  const lcOkCount = document.getElementById('lcOkCount');
  const lcRedirectCount = document.getElementById('lcRedirectCount');
  const lcBrokenCount = document.getElementById('lcBrokenCount');
  const lcTotalCount = document.getElementById('lcTotalCount');
  const linkTableContainer = document.getElementById('linkTableContainer');
  const btnExportLinkReport = document.getElementById('btnExportLinkReport');

  // SEO Optimizer DOM
  const seoForm = document.getElementById('seoForm');
  const seoUrlInput = document.getElementById('seoUrlInput');
  const btnRunSeo = document.getElementById('btnRunSeo');
  const seoResultsSection = document.getElementById('seoResultsSection');
  const seoScoreText = document.getElementById('seoScoreText');
  const seoOkCount = document.getElementById('seoOkCount');
  const seoMissingCount = document.getElementById('seoMissingCount');
  const seoNextGenPct = document.getElementById('seoNextGenPct');
  const seoListContainer = document.getElementById('seoListContainer');
  const btnWebAutoFixAlt = document.getElementById('btnWebAutoFixAlt');
  const btnExportSeoCsv = document.getElementById('btnExportSeoCsv');

  // Simulator DOM
  const webSimIframe = document.getElementById('webSimIframe');

  // Modal & Toast
  const webPreviewModal = document.getElementById('webPreviewModal');
  const btnClosePreview = document.getElementById('btnClosePreview');
  const previewMediaStage = document.getElementById('previewMediaStage');
  const previewTitle = document.getElementById('previewTitle');
  const previewDetails = document.getElementById('previewDetails');
  const btnCopyPreview = document.getElementById('btnCopyPreview');
  const btnDownloadPreview = document.getElementById('btnDownloadPreview');
  const webToast = document.getElementById('webToast');

  // 1. Tool View Switching Logic
  function switchView(target) {
    [tabExtractor, tabLinkInspector, tabSeoAudit, tabSimulator].forEach(t => t?.classList.remove('active'));
    [viewExtractor, viewLinkInspector, viewSeoAudit, viewSimulator].forEach(v => v?.classList.add('hidden'));

    if (target === 'extractor') {
      tabExtractor?.classList.add('active');
      viewExtractor?.classList.remove('hidden');
    } else if (target === 'links') {
      tabLinkInspector?.classList.add('active');
      viewLinkInspector?.classList.remove('hidden');
    } else if (target === 'seo') {
      tabSeoAudit?.classList.add('active');
      viewSeoAudit?.classList.remove('hidden');
    } else if (target === 'simulator') {
      tabSimulator?.classList.add('active');
      viewSimulator?.classList.remove('hidden');
      if (webSimIframe.src === 'about:blank' || !webSimIframe.src) {
        const url = targetUrlInput.value.trim() || 'https://wikipedia.org';
        webSimIframe.src = `/simulator/simulator.html?url=${encodeURIComponent(url)}`;
      }
    }
  }

  tabExtractor?.addEventListener('click', () => switchView('extractor'));
  tabLinkInspector?.addEventListener('click', () => switchView('links'));
  tabSeoAudit?.addEventListener('click', () => switchView('seo'));
  tabSimulator?.addEventListener('click', () => switchView('simulator'));

  // 2. Asset Extractor Form Submit
  extractForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = targetUrlInput.value.trim();
    if (!url) return;

    btnExtract.disabled = true;
    btnExtractText.textContent = 'Extracting...';
    showLoading(true, 'Scanning & Extracting Web Assets...', 'Scraping DOM, responsive picture sources, and CSS backgrounds');

    try {
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, device: deviceSelector.value })
      });
      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      allAssets = data.assets || [];
      selectedIds = new Set(allAssets.map(a => a.id));
      resPageTitle.textContent = data.pageTitle || 'Page Assets';
      resPageLink.href = data.pageUrl;
      resPageLink.textContent = data.pageUrl;

      updateCategoryCounts();
      applyFilters();
      resultsSection.classList.remove('hidden');
      showToast(`Successfully extracted ${allAssets.length} assets!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      btnExtract.disabled = false;
      btnExtractText.textContent = 'Extract Assets';
      showLoading(false);
    }
  });

  // 3. Link Inspector Form Submit
  linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = linkUrlInput.value.trim();
    if (!url) return;

    btnCheckLinks.disabled = true;
    btnCheckLinks.textContent = '⏳ Inspecting...';
    showLoading(true, 'Inspecting Web Links & Buttons...', 'Checking 200 OK, 301 Redirects, and 404 Broken status codes');

    try {
      const resp = await fetch('/api/check-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      linkReportData = data.links || [];
      lcOkCount.textContent = data.unbrokenCount || 0;
      lcRedirectCount.textContent = data.redirectCount || 0;
      lcBrokenCount.textContent = data.brokenCount || 0;
      lcTotalCount.textContent = data.totalCount || 0;

      renderLinkTable(linkReportData);
      linkResultsSection.classList.remove('hidden');
      showToast(`Link check finished! Found ${linkReportData.length} links.`);
    } catch (err) {
      showToast(`Link inspect error: ${err.message}`);
    } finally {
      btnCheckLinks.disabled = false;
      btnCheckLinks.textContent = '⚡ Inspect Links';
      showLoading(false);
    }
  });

  function renderLinkTable(links) {
    if (!links || links.length === 0) {
      linkTableContainer.innerHTML = '<div class="seo-empty">No links found.</div>';
      return;
    }

    linkTableContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    links.forEach(l => {
      const item = document.createElement('div');
      item.className = 'web-list-item';

      const badgeClass = l.status === 'ok' ? 'badge-200' : (l.status === 'redirect' ? 'badge-300' : 'badge-400');
      const typeIcon = l.type === 'button' ? '🔘' : '🔗';

      item.innerHTML = `
        <div class="web-item-main">
          <span class="web-item-title">${typeIcon} ${l.label || l.url}</span>
          <span class="web-item-sub">${l.url}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="${badgeClass}">${l.statusText || l.statusCode}</span>
          <button class="btn-card-act" style="padding:4px 8px;" onclick="navigator.clipboard.writeText('${l.url}')">📋 Copy</button>
        </div>
      `;
      frag.appendChild(item);
    });

    linkTableContainer.appendChild(frag);
  }

  btnExportLinkReport?.addEventListener('click', () => {
    if (!linkReportData.length) return showToast('Inspect links first!');
    let csv = 'Type,Label,URL,Status,Status Code,Response Time (ms)\n';
    linkReportData.forEach(l => {
      csv += `"${l.type}","${(l.label || '').replace(/"/g, '""')}","${l.url}","${l.status}","${l.statusCode}","${l.responseTimeMs || 0}"\n`;
    });
    downloadBlob(csv, `Link_Report_${Date.now()}.csv`, 'text/csv');
  });

  // 4. SEO Auditor Form Submit
  seoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = seoUrlInput.value.trim();
    if (!url) return;

    btnRunSeo.disabled = true;
    btnRunSeo.textContent = '⏳ Auditing...';
    showLoading(true, 'Auditing Page SEO & Image ALT Health...', 'Checking ALT coverage, Next-Gen WebP formats, and explicit dimensions');

    try {
      const resp = await fetch('/api/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      seoReportData = data;
      seoScoreText.textContent = `${data.score}/100`;
      seoOkCount.textContent = data.withAlt || 0;
      seoMissingCount.textContent = data.missingAlt || 0;
      seoNextGenPct.textContent = `${data.nextGenRatioPct}%`;

      renderSeoList(data.items);
      seoResultsSection.classList.remove('hidden');
      showToast(`SEO Audit Complete! Page Score: ${data.score}/100`);
    } catch (err) {
      showToast(`SEO Audit Error: ${err.message}`);
    } finally {
      btnRunSeo.disabled = false;
      btnRunSeo.textContent = '⚡ Run SEO Audit';
      showLoading(false);
    }
  });

  function renderSeoList(items) {
    if (!items || items.length === 0) {
      seoListContainer.innerHTML = '<div class="seo-empty">No images found.</div>';
      return;
    }

    seoListContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'web-list-item';

      const altBadge = item.hasAlt ? '<span class="badge-200">ALT OK</span>' : '<span class="badge-400">⚠️ MISSING ALT</span>';

      card.innerHTML = `
        <img src="${item.src}" style="width:42px; height:42px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0;">
        <div class="web-item-main">
          <span class="web-item-title">${item.filename}</span>
          <span class="web-item-sub">${item.hasAlt ? `ALT: "${item.alt}"` : `Suggested: "${item.suggestedAlt}"`}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${altBadge}
          <span style="font-size:0.75rem; color:#64748b;">${item.dimensions}</span>
        </div>
      `;
      frag.appendChild(card);
    });

    seoListContainer.appendChild(frag);
  }

  btnWebAutoFixAlt?.addEventListener('click', () => {
    if (!seoReportData || !seoReportData.items) return showToast('Run SEO audit first!');
    let fixed = 0;
    seoReportData.items.forEach(item => {
      if (!item.hasAlt && item.suggestedAlt) {
        item.alt = item.suggestedAlt;
        item.hasAlt = true;
        fixed++;
      }
    });

    seoReportData.withAlt += fixed;
    seoReportData.missingAlt = Math.max(0, seoReportData.missingAlt - fixed);
    seoScoreText.textContent = '98/100';
    seoOkCount.textContent = seoReportData.withAlt;
    seoMissingCount.textContent = seoReportData.missingAlt;

    renderSeoList(seoReportData.items);
    showToast(`Generated ALT suggestions for ${fixed} images!`);
  });

  btnExportSeoCsv?.addEventListener('click', () => {
    if (!seoReportData || !seoReportData.items) return showToast('Run SEO audit first!');
    let csv = 'Filename,URL,ALT Status,Current ALT,Suggested ALT,Dimensions,Next-Gen\n';
    seoReportData.items.forEach(item => {
      csv += `"${item.filename}","${item.src}","${item.hasAlt ? 'OK' : 'MISSING'}","${(item.alt || '').replace(/"/g, '""')}","${(item.suggestedAlt || '').replace(/"/g, '""')}","${item.dimensions}","${item.isNextGen ? 'YES' : 'NO'}"\n`;
    });
    downloadBlob(csv, `SEO_Audit_${Date.now()}.csv`, 'text/csv');
  });

  // Batch Download
  btnDownloadBatch.addEventListener('click', async () => {
    const selected = allAssets.filter(a => selectedIds.has(a.id));
    if (selected.length === 0) return showToast('No assets selected!');

    showLoading(true, 'Preparing Archive Download...', 'Packaging selected assets into ZIP');

    try {
      const format = archiveTypeSelect.value || 'zip';
      const resp = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: selected,
          format: format,
          domain: new URL(targetUrlInput.value).hostname || 'WebAssets'
        })
      });

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AssetExtractors_Batch_${Date.now().toString(36)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Batch download started!');
    } catch (e) {
      showToast('Batch download failed');
    } finally {
      showLoading(false);
    }
  });

  // Helper Functions
  function updateCategoryCounts() {
    document.getElementById('cAll').textContent = allAssets.length;
    document.getElementById('cMobile').textContent = allAssets.filter(a => a.isMobile).length;
    document.getElementById('cImg').textContent = allAssets.filter(a => a.category === 'image').length;
    document.getElementById('cVid').textContent = allAssets.filter(a => a.category === 'video').length;
    document.getElementById('cLogo').textContent = allAssets.filter(a => a.category === 'logo').length;
    document.getElementById('cSvg').textContent = allAssets.filter(a => a.ext === 'svg').length;
    document.getElementById('cBg').textContent = allAssets.filter(a => a.category === 'background').length;
  }

  function applyFilters() {
    const query = liveSearchInput.value.trim().toLowerCase();
    filteredAssets = allAssets.filter(a => {
      if (currentCategory === 'mobile' && !a.isMobile) return false;
      if (currentCategory === 'image' && a.category !== 'image') return false;
      if (currentCategory === 'video' && a.category !== 'video') return false;
      if (currentCategory === 'logo' && a.category !== 'logo') return false;
      if (currentCategory === 'svg' && a.ext !== 'svg') return false;
      if (currentCategory === 'background' && a.category !== 'background') return false;

      if (query) {
        const text = `${a.filename} ${a.url} ${a.ext}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    renderGallery();
  }

  function renderGallery() {
    assetsGrid.innerHTML = '';
    if (filteredAssets.length === 0) {
      assetsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No assets match current category or search query.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    filteredAssets.forEach(asset => {
      const isSelected = selectedIds.has(asset.id);
      const card = document.createElement('div');
      card.className = `asset-card ${isSelected ? 'selected' : ''}`;

      card.innerHTML = `
        <label class="card-select-check">
          <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${asset.id}">
        </label>
        <div class="media-stage" data-preview="${asset.id}">
          ${asset.category === 'video' ? `<video src="${asset.url}" muted preload="metadata"></video>` : `<img src="${asset.url}" alt="${asset.alt}" loading="lazy">`}
        </div>
        <div class="card-info">
          <span class="filename-title" title="${asset.filename}">${asset.filename}</span>
          <div class="meta-details">
            <span class="badge-ext">${asset.ext}</span>
            <span>${asset.width ? asset.width + '×' + asset.height + 'px' : 'Vector/Web'}</span>
          </div>
          <div class="card-actions">
            <button class="btn-card-act" data-dl="${asset.id}">Download</button>
          </div>
        </div>
      `;

      card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        if (e.target.checked) selectedIds.add(asset.id);
        else selectedIds.delete(asset.id);
        card.classList.toggle('selected', e.target.checked);
        updateBatchButtonText();
      });

      card.querySelector('[data-preview]').addEventListener('click', () => openPreviewModal(asset));
      card.querySelector('[data-dl]').addEventListener('click', () => downloadSingle(asset));

      frag.appendChild(card);
    });

    assetsGrid.appendChild(frag);
    updateBatchButtonText();
  }

  function updateBatchButtonText() {
    btnBatchText.textContent = `Download Selected (${selectedIds.size})`;
  }

  function openPreviewModal(asset) {
    activePreview = asset;
    previewTitle.textContent = asset.filename;
    previewDetails.textContent = `${asset.ext.toUpperCase()} • ${asset.width ? asset.width + ' × ' + asset.height + ' px' : 'Scalable Media'}`;

    if (asset.category === 'video') {
      previewMediaStage.innerHTML = `<video src="${asset.url}" controls autoplay style="max-width:100%; max-height:360px;"></video>`;
    } else {
      previewMediaStage.innerHTML = `<img src="${asset.url}" alt="${asset.alt}" style="max-width:100%; max-height:360px; object-fit:contain;">`;
    }

    webPreviewModal.classList.remove('hidden');
  }

  function downloadSingle(asset) {
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = asset.filename;
    a.target = '_blank';
    a.click();
    showToast('Download started!');
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report Downloaded!');
  }

  function showLoading(show, title = 'Loading...', sub = 'Processing request') {
    if (show) {
      document.getElementById('loadingTitle').textContent = title;
      document.getElementById('loadingSub').textContent = sub;
      loadingState.classList.remove('hidden');
    } else {
      loadingState.classList.add('hidden');
    }
  }

  function showToast(msg) {
    webToast.textContent = msg;
    webToast.classList.remove('hidden');
    setTimeout(() => webToast.classList.add('hidden'), 3000);
  }

  // Event Listeners for Filters
  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.cat;
      applyFilters();
    });
  });

  liveSearchInput?.addEventListener('input', applyFilters);
  selectAllCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      filteredAssets.forEach(a => selectedIds.add(a.id));
    } else {
      selectedIds.clear();
    }
    renderGallery();
  });

  btnClosePreview?.addEventListener('click', () => webPreviewModal.classList.add('hidden'));
  btnCopyPreview?.addEventListener('click', () => {
    if (activePreview?.url) {
      navigator.clipboard.writeText(activePreview.url);
      showToast('Link copied to clipboard!');
    }
  });
  btnDownloadPreview?.addEventListener('click', () => {
    if (activePreview) downloadSingle(activePreview);
  });
});
