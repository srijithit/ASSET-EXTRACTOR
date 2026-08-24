/**
 * Asset Extractors - Mobile Responsive Simulator Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get('url') || 'https://wikipedia.org';

  // State
  let currentWidth = 393;
  let currentHeight = 852;
  let isLandscape = false;
  let hasFrame = true;
  let currentScale = 0.75;
  let activeDeviceName = 'iPhone 15 Pro';

  // DOM Elements
  const simUrlInput = document.getElementById('simUrlInput');
  const btnGo = document.getElementById('btnGo');
  const btnBack = document.getElementById('btnBack');
  const btnForward = document.getElementById('btnForward');
  const btnReload = document.getElementById('btnReload');
  const simIframe = document.getElementById('simIframe');

  const deviceChassis = document.getElementById('deviceChassis');
  const deviceSpecTag = document.getElementById('deviceSpecTag');
  const safariDomain = document.getElementById('safariDomain');
  const statusTime = document.getElementById('statusTime');

  const btnRotate = document.getElementById('btnRotate');
  const btnToggleFrame = document.getElementById('btnToggleFrame');
  const btnScreenshotMockup = document.getElementById('btnScreenshotMockup');
  const simZoomSelect = document.getElementById('simZoomSelect');
  const btnExtractSimAssets = document.getElementById('btnExtractSimAssets');

  const deviceBoxes = document.querySelectorAll('.device-box');
  const simToast = document.getElementById('simToast');

  init();

  function init() {
    setupListeners();
    updateClock();
    setInterval(updateClock, 30000);
    navigateToUrl(targetUrl);
    applyDeviceDimensions();
  }

  function setupListeners() {
    btnGo.addEventListener('click', () => {
      let url = simUrlInput.value.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      navigateToUrl(url);
    });

    simUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnGo.click();
    });

    btnReload.addEventListener('click', () => {
      if (simIframe.src) simIframe.src = simIframe.src;
    });

    btnBack.addEventListener('click', () => {
      try { simIframe.contentWindow.history.back(); } catch (e) {}
    });

    btnForward.addEventListener('click', () => {
      try { simIframe.contentWindow.history.forward(); } catch (e) {}
    });

    // Rotate
    btnRotate.addEventListener('click', () => {
      isLandscape = !isLandscape;
      btnRotate.classList.toggle('active', isLandscape);
      applyDeviceDimensions();
    });

    // Toggle Frame
    btnToggleFrame.addEventListener('click', () => {
      hasFrame = !hasFrame;
      btnToggleFrame.classList.toggle('active', hasFrame);
      deviceChassis.classList.toggle('no-frame', !hasFrame);
      applyDeviceDimensions();
    });

    // Zoom
    simZoomSelect.addEventListener('change', () => {
      currentScale = parseFloat(simZoomSelect.value);
      applyDeviceDimensions();
    });

    // Device selection
    deviceBoxes.forEach(box => {
      box.addEventListener('click', () => {
        deviceBoxes.forEach(b => b.classList.remove('active'));
        box.classList.add('active');

        currentWidth = parseInt(box.dataset.w, 10);
        currentHeight = parseInt(box.dataset.h, 10);
        activeDeviceName = box.dataset.name;

        // Apply chassis style
        const chassis = box.dataset.chassis;
        deviceChassis.className = `device-chassis ${chassis === 'android' ? 'android-phone' : 'iphone-15-pro'} ${!hasFrame ? 'no-frame' : ''}`;

        applyDeviceDimensions();
        toast(`Switched to ${activeDeviceName} (${currentWidth} × ${currentHeight})`);
      });
    });

    // Mockup Screenshot
    btnScreenshotMockup.addEventListener('click', () => {
      toast('Capturing device mockup screenshot...');
      chrome.tabs.getCurrent(tab => {
        if (tab?.windowId) {
          chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, dataUrl => {
            if (dataUrl) {
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `Mockup_${activeDeviceName.replace(/\s+/g, '_')}_${Date.now().toString(36)}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              toast('Mockup screenshot downloaded!');
            }
          });
        }
      });
    });

    // Extract Assets from current page
    btnExtractSimAssets.addEventListener('click', () => {
      toast('Extracting page assets...');
      try {
        const viewerUrl = chrome.runtime.getURL('viewer/viewer.html');
        chrome.tabs.create({ url: viewerUrl });
      } catch (e) {}
    });
  }

  function navigateToUrl(url) {
    if (!url) return;
    simUrlInput.value = url;
    simIframe.src = url;

    try {
      const parsed = new URL(url);
      safariDomain.textContent = parsed.hostname;
    } catch (e) {
      safariDomain.textContent = url;
    }
  }

  function applyDeviceDimensions() {
    let w = isLandscape ? Math.max(currentWidth, currentHeight) : Math.min(currentWidth, currentHeight);
    let h = isLandscape ? Math.min(currentWidth, currentHeight) : Math.max(currentWidth, currentHeight);

    deviceChassis.style.width = `${w}px`;
    deviceChassis.style.height = `${h}px`;
    deviceChassis.style.transform = `scale(${currentScale})`;

    deviceSpecTag.textContent = `${w} × ${h} px (${Math.round(currentScale * 100)}%)`;
  }

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    statusTime.textContent = `${hours}:${minutes} ${ampm}`;
  }

  function toast(msg) {
    simToast.textContent = msg;
    simToast.classList.remove('hidden');
    setTimeout(() => simToast.classList.add('hidden'), 2600);
  }
});
