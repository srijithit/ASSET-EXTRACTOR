/**
 * Asset Extractors - Font & Typography Inspector Content Engine
 */

(function () {
  if (window.__assetExtractorFontPickerLoaded) {
    return;
  }
  window.__assetExtractorFontPickerLoaded = true;

  let isInspectActive = false;
  let hoverTooltip = null;
  let activeElement = null;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TOGGLE_FONT_INSPECTOR') {
      if (msg.enabled) {
        enableFontInspector();
      } else {
        disableFontInspector();
      }
      sendResponse({ success: true, enabled: isInspectActive });
    } else if (msg.action === 'GET_PAGE_FONTS') {
      const fonts = scanPageFonts();
      sendResponse({ success: true, fonts: fonts });
    }
  });

  function enableFontInspector() {
    isInspectActive = true;
    createTooltip();
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
  }

  function disableFontInspector() {
    isInspectActive = false;
    removeTooltip();
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    if (activeElement) {
      activeElement.style.outline = '';
      activeElement = null;
    }
  }

  function createTooltip() {
    if (hoverTooltip) return;
    hoverTooltip = document.createElement('div');
    hoverTooltip.id = '__ae_font_tooltip__';
    hoverTooltip.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      pointer-events: none;
      border: 1px solid #38bdf8;
      display: none;
    `;
    document.body.appendChild(hoverTooltip);
  }

  function removeTooltip() {
    if (hoverTooltip) {
      hoverTooltip.remove();
      hoverTooltip = null;
    }
  }

  function handleMouseOver(e) {
    if (!isInspectActive) return;
    const target = e.target;
    if (target === hoverTooltip || target.id === '__ae_font_tooltip__') return;

    if (activeElement && activeElement !== target) {
      activeElement.style.outline = '';
    }

    activeElement = target;
    activeElement.style.outline = '2px solid #0ea5e9';

    const style = window.getComputedStyle(target);
    const fontInfo = {
      family: style.fontFamily.replace(/["']/g, ''),
      size: style.fontSize,
      weight: style.fontWeight,
      lineHeight: style.lineHeight,
      color: style.color,
      tag: target.tagName.toLowerCase()
    };

    hoverTooltip.innerHTML = `
      <div style="font-weight:800; color:#38bdf8; margin-bottom:2px;">🔤 ${fontInfo.family.split(',')[0]}</div>
      <div style="color:#cbd5e1; font-size:11px;">Size: <strong>${fontInfo.size}</strong> • Weight: <strong>${fontInfo.weight}</strong></div>
      <div style="color:#94a3b8; font-size:10px; margin-top:2px;">Click to copy font family name</div>
    `;
    hoverTooltip.style.display = 'block';

    const rect = target.getBoundingClientRect();
    hoverTooltip.style.top = Math.max(10, rect.top - 45) + 'px';
    hoverTooltip.style.left = Math.min(window.innerWidth - 220, Math.max(10, rect.left)) + 'px';
  }

  function handleClick(e) {
    if (!isInspectActive) return;
    e.preventDefault();
    e.stopPropagation();

    if (activeElement) {
      const style = window.getComputedStyle(activeElement);
      const primaryFont = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();

      navigator.clipboard.writeText(primaryFont);
      
      chrome.runtime.sendMessage({
        action: 'FONT_SELECTED',
        fontData: {
          family: primaryFont,
          fullFamily: style.fontFamily.replace(/["']/g, ''),
          size: style.fontSize,
          weight: style.fontWeight,
          lineHeight: style.lineHeight,
          color: style.color
        }
      });
    }

    disableFontInspector();
  }

  function scanPageFonts() {
    const fontFamilies = new Set();

    // 1. Scan @font-face rules
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.type === CSSRule.FONT_FACE_RULE && rule.style.fontFamily) {
              fontFamilies.add(rule.style.fontFamily.replace(/["']/g, '').trim());
            }
          });
        } catch (e) {}
      });
    } catch (e) {}

    // 2. Scan computed styles of major text tags
    const textEls = document.querySelectorAll('h1, h2, h3, h4, p, a, button, span, body');
    textEls.forEach(el => {
      const fam = window.getComputedStyle(el).fontFamily;
      if (fam) {
        fam.split(',').forEach(f => {
          const clean = f.replace(/["']/g, '').trim();
          if (clean && !['serif', 'sans-serif', 'monospace', 'cursive', 'system-ui'].includes(clean.toLowerCase())) {
            fontFamilies.add(clean);
          }
        });
      }
    });

    return Array.from(fontFamilies).slice(0, 15);
  }
})();
