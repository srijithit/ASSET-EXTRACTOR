/**
 * Asset Extractors - Selected Area Interactive Screen Cropper
 */

(function () {
  if (document.getElementById('__asset_extractor_cropper_root')) {
    document.getElementById('__asset_extractor_cropper_root').remove();
  }

  let startX = 0, startY = 0, isDragging = false;
  const dpr = window.devicePixelRatio || 1;

  const root = document.createElement('div');
  root.id = '__asset_extractor_cropper_root';
  root.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    user-select: none;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(1.5px);
  `;

  // Guide prompt
  const guide = document.createElement('div');
  guide.style.cssText = `
    position: fixed;
    top: 20px; left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  guide.innerHTML = `<span>✂️ Click & drag to select area</span><span style="opacity: 0.6; font-size: 11px;">(Esc to cancel)</span>`;
  root.appendChild(guide);

  // Selection box
  const box = document.createElement('div');
  box.style.cssText = `
    position: absolute;
    border: 2px solid #ef4444;
    background: rgba(239, 68, 68, 0.08);
    display: none;
    pointer-events: none;
    box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.45);
  `;

  // Dimension tag
  const dimTag = document.createElement('div');
  dimTag.style.cssText = `
    position: absolute;
    bottom: -28px; right: 0;
    background: #ef4444;
    color: #ffffff;
    font-family: monospace;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  `;
  box.appendChild(dimTag);
  root.appendChild(box);

  function onMouseDown(e) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;

    dimTag.textContent = `${Math.round(width * dpr)} × ${Math.round(height * dpr)} px`;
  }

  async function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const rect = box.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      cleanup();
      return;
    }

    // Hide UI before taking screenshot
    root.style.display = 'none';

    // Small delay to let browser repaint
    await new Promise(r => setTimeout(r, 60));

    // Request background to capture visible tab and crop
    chrome.runtime.sendMessage({
      action: 'CAPTURE_CROP_AREA',
      bounds: {
        x: rect.left * dpr,
        y: rect.top * dpr,
        width: rect.width * dpr,
        height: rect.height * dpr,
        devicePixelRatio: dpr
      },
      pageTitle: document.title || 'Selected_Area'
    }, () => {
      cleanup();
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function cleanup() {
    window.removeEventListener('keydown', onKeyDown);
    root.remove();
  }

  root.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);

  document.body.appendChild(root);
})();
