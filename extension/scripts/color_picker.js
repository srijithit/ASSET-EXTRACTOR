/**
 * Asset Extractors - Color Picker & Eyedropper Content Engine
 */

(function () {
  if (window.__assetExtractorColorPickerLoaded) {
    activateEyedropper();
    return;
  }
  window.__assetExtractorColorPickerLoaded = true;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'ACTIVATE_EYEDROPPER') {
      activateEyedropper().then(res => sendResponse(res));
      return true;
    } else if (msg.action === 'EXTRACT_PAGE_PALETTE') {
      const palette = extractPageColors();
      sendResponse({ success: true, palette: palette });
    }
  });

  async function activateEyedropper() {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const hex = result.sRGBHex;
        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        return {
          success: true,
          hex: hex,
          rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
        };
      } catch (e) {
        return { success: false, error: 'Color pick canceled' };
      }
    } else {
      // Fallback canvas/element sampler
      alert('Chrome EyeDropper API is available in Chrome 95+.');
      return { success: false, error: 'EyeDropper API not supported' };
    }
  }

  function extractPageColors() {
    const colors = new Set();
    const elements = document.querySelectorAll('body, header, nav, main, footer, h1, h2, h3, button, a, div, section');

    elements.forEach(el => {
      if (colors.size >= 16) return;
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const color = style.color;

      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const hex = rgbaToHex(bg);
        if (hex) colors.add(hex);
      }
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        const hex = rgbaToHex(color);
        if (hex) colors.add(hex);
      }
    });

    return Array.from(colors).slice(0, 12);
  }

  function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function rgbaToHex(rgbaStr) {
    const match = rgbaStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
})();
