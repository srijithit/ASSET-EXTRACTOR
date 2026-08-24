/**
 * Asset Extractors - Background Service Worker
 * Handles media downloads, screenshots (Selected Area, Full Page, Visible Part), and shortcut commands.
 */

// Shortcut commands listener
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'capture_selected_area') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/cropper.js']
    });
  } else if (command === 'capture_full_page') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/fullpage_capture.js']
    });
  } else if (command === 'capture_visible_part') {
    handleVisiblePartCapture(tab);
  }
});

// Runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DOWNLOAD_SINGLE') {
    handleSingleDownload(message.asset, message.folder)
      .then(downloadId => sendResponse({ success: true, downloadId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'DOWNLOAD_BATCH_DIRECT') {
    handleBatchDirectDownload(message.assets, message.folder)
      .then(result => sendResponse({ success: true, count: result.length }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'STORE_ASSETS_CACHE') {
    chrome.storage.local.set({ [message.key]: message.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'OPEN_FULL_VIEWER') {
    const viewerUrl = chrome.runtime.getURL('viewer/viewer.html?tabId=' + message.tabId);
    chrome.tabs.create({ url: viewerUrl });
    sendResponse({ success: true });
    return true;
  }

  // Screenshot captures
  if (message.action === 'CAPTURE_VISIBLE_TAB_RAW') {
    const winId = sender?.tab?.windowId || null;
    chrome.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true;
  }

  if (message.action === 'TRIGGER_SELECTED_AREA') {
    if (message.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        files: ['scripts/cropper.js']
      });
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.action === 'TRIGGER_FULL_PAGE') {
    if (message.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        files: ['scripts/fullpage_capture.js']
      });
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.action === 'TRIGGER_VISIBLE_PART') {
    chrome.tabs.get(message.tabId, (tab) => {
      if (tab) handleVisiblePartCapture(tab);
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'CAPTURE_CROP_AREA') {
    handleCropAreaCapture(sender.tab, message.bounds, message.pageTitle);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'STITCH_FULL_PAGE') {
    handleStitchFullPage(message.strips, message.totalWidth, message.totalHeight, message.pageTitle);
    sendResponse({ success: true });
    return true;
  }
});

async function handleVisiblePartCapture(tab) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
    if (!dataUrl) return;
    const cleanTitle = (tab.title || 'Visible_Part').replace(/[^\w.-]/g, '_').substring(0, 30);
    const filename = `AssetExtractors_Visible_${cleanTitle}_${Date.now().toString(36)}.png`;

    chrome.downloads.download({
      url: dataUrl,
      filename: `AssetExtractors_Screenshots/${filename}`,
      saveAs: false
    });
  });
}

async function handleCropAreaCapture(tab, bounds, pageTitle) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, async (fullDataUrl) => {
    if (!fullDataUrl) return;

    try {
      const resp = await fetch(fullDataUrl);
      const blob = await resp.blob();
      const imageBitmap = await createImageBitmap(blob);

      const offscreen = new OffscreenCanvas(Math.max(1, Math.round(bounds.width)), Math.max(1, Math.round(bounds.height)));
      const ctx = offscreen.getContext('2d');

      ctx.drawImage(
        imageBitmap,
        Math.round(bounds.x), Math.round(bounds.y), Math.round(bounds.width), Math.round(bounds.height),
        0, 0, Math.round(bounds.width), Math.round(bounds.height)
      );

      const croppedBlob = await offscreen.convertToBlob({ type: 'image/png' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const croppedDataUrl = reader.result;
        const cleanTitle = (pageTitle || 'Area').replace(/[^\w.-]/g, '_').substring(0, 30);
        const filename = `AssetExtractors_Area_${cleanTitle}_${Date.now().toString(36)}.png`;

        chrome.downloads.download({
          url: croppedDataUrl,
          filename: `AssetExtractors_Screenshots/${filename}`,
          saveAs: false
        });
      };
      reader.readAsDataURL(croppedBlob);
    } catch (e) {
      console.error('Crop error:', e);
    }
  });
}

async function handleStitchFullPage(strips, width, height, pageTitle) {
  if (!strips || strips.length === 0) return;

  try {
    const offscreen = new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    const ctx = offscreen.getContext('2d');

    for (const strip of strips) {
      const resp = await fetch(strip.dataUrl);
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      ctx.drawImage(bitmap, 0, Math.round(strip.y));
    }

    const fullBlob = await offscreen.convertToBlob({ type: 'image/png' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const fullDataUrl = reader.result;
      const cleanTitle = (pageTitle || 'Full_Page').replace(/[^\w.-]/g, '_').substring(0, 30);
      const filename = `AssetExtractors_FullPage_${cleanTitle}_${Date.now().toString(36)}.png`;

      chrome.downloads.download({
        url: fullDataUrl,
        filename: `AssetExtractors_Screenshots/${filename}`,
        saveAs: false
      });
    };
    reader.readAsDataURL(fullBlob);
  } catch (e) {
    console.error('Full page stitch error:', e);
  }
}

async function handleSingleDownload(asset, subfolder = '') {
  let filename = (asset.filename || 'asset.png').replace(/[<>:"/\\|?*]/g, '_');
  if (subfolder && !asset.url.startsWith('data:')) {
    const cleanFolder = subfolder.replace(/[<>:"/\\|?*]/g, '_');
    filename = `${cleanFolder}/${filename}`;
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: asset.url,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        // Fallback with clean flat filename
        chrome.downloads.download({
          url: asset.url,
          filename: (asset.filename || 'asset.png').replace(/[<>:"/\\|?*]/g, '_'),
          saveAs: false,
          conflictAction: 'uniquify'
        }, (retryId) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(retryId);
        });
      } else {
        resolve(downloadId);
      }
    });
  });
}

async function handleBatchDirectDownload(assets, folderName = 'AssetExtractors_Downloads') {
  const cleanFolder = (folderName || 'AssetExtractors').replace(/[<>:"/\\|?*]/g, '_');
  const results = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const categoryFolder = asset.category ? `${cleanFolder}/${asset.category}s` : cleanFolder;
    const targetPath = `${categoryFolder}/${asset.filename}`;

    try {
      await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: asset.url,
          filename: targetPath,
          saveAs: false,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(downloadId);
        });
      });
      results.push(targetPath);
    } catch (e) {
      console.warn(`Failed to download ${asset.url}:`, e);
    }

    await new Promise(r => setTimeout(r, 120));
  }

  return results;
}
