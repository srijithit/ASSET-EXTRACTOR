/**
 * Asset Extractors - Desktop Full Page Scrolling Screenshot Engine
 */

(function () {
  async function captureFullPageDesktop() {
    // 1. Store original scroll position
    const originalScrollTop = window.scrollY || window.pageYOffset || 0;
    const originalScrollLeft = window.scrollX || window.pageXOffset || 0;

    // 2. Temporarily hide fixed/sticky elements after top slice to avoid duplicate floating bars
    const fixedElements = [];
    try {
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style && (style.position === 'fixed' || style.position === 'sticky')) {
          fixedElements.push({ el, originalPosition: el.style.position });
        }
      });
    } catch (e) {}

    // Calculate full document desktop dimensions
    const totalHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0,
      document.body.offsetHeight || 0,
      document.documentElement.offsetHeight || 0,
      document.body.clientHeight || 0,
      document.documentElement.clientHeight || 0
    );

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;

    const numSteps = Math.ceil(totalHeight / viewportHeight);
    const strips = [];

    // Scroll to top
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));

    for (let i = 0; i < numSteps; i++) {
      const targetY = i * viewportHeight;
      window.scrollTo(0, Math.min(targetY, totalHeight - viewportHeight));

      // Wait for layout/render and lazy loaded media
      await new Promise(r => setTimeout(r, 260));

      const actualScrollY = window.scrollY || window.pageYOffset || 0;

      const dataUrl = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB_RAW' }, res => {
          resolve(res?.dataUrl || null);
        });
      });

      if (dataUrl) {
        strips.push({
          y: Math.round(actualScrollY * dpr),
          dataUrl: dataUrl
        });
      }

      // Hide sticky elements after top slice to prevent floating headers on every frame
      if (i === 0 && fixedElements.length > 0) {
        fixedElements.forEach(item => {
          try {
            item.el.style.setProperty('position', 'absolute', 'important');
          } catch (err) {}
        });
      }

      if (actualScrollY + viewportHeight >= totalHeight) {
        break;
      }
    }

    // Restore fixed element original positions
    fixedElements.forEach(item => {
      try {
        item.el.style.position = item.originalPosition || '';
      } catch (err) {}
    });

    // Restore original scroll position
    window.scrollTo(originalScrollLeft, originalScrollTop);

    // Send strips to background for error-free desktop canvas stitching
    chrome.runtime.sendMessage({
      action: 'STITCH_FULL_PAGE',
      strips: strips,
      totalWidth: Math.round(viewportWidth * dpr),
      totalHeight: Math.round(totalHeight * dpr),
      pageTitle: document.title || 'Desktop_Full_Page'
    });
  }

  captureFullPageDesktop();
})();
