/**
 * Asset Extractors - Full Page Scrolling Screenshot Engine (Desktop & Responsive)
 */

(function () {
  async function captureFullPage() {
    // Save original styles
    const originalScrollTop = window.scrollY || window.pageYOffset;
    const originalScrollLeft = window.scrollX || window.pageXOffset;

    // Calculate full document desktop dimensions
    const totalHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0,
      document.body.offsetHeight || 0,
      document.documentElement.offsetHeight || 0,
      document.body.clientHeight || 0,
      document.documentElement.clientHeight || 0
    );

    const totalWidth = Math.max(
      document.body.scrollWidth || 0,
      document.documentElement.scrollWidth || 0,
      document.body.offsetWidth || 0,
      document.documentElement.offsetWidth || 0,
      window.innerWidth || 0
    );

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;

    const strips = [];
    const numSteps = Math.ceil(totalHeight / viewportHeight);

    // Scroll to top first
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 150));

    for (let i = 0; i < numSteps; i++) {
      const targetY = i * viewportHeight;
      window.scrollTo(0, Math.min(targetY, totalHeight - viewportHeight));

      // Wait for lazy images and scroll render
      await new Promise(r => setTimeout(r, 220));

      const actualScrollY = window.scrollY || window.pageYOffset;
      const dataUrl = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB_RAW' }, res => {
          resolve(res?.dataUrl);
        });
      });

      if (dataUrl) {
        strips.push({
          y: Math.round(actualScrollY * dpr),
          dataUrl: dataUrl
        });
      }

      if (actualScrollY + viewportHeight >= totalHeight) {
        break;
      }
    }

    // Restore original scroll position
    window.scrollTo(originalScrollLeft, originalScrollTop);

    // Send strips to background to stitch canvas in full desktop resolution
    chrome.runtime.sendMessage({
      action: 'STITCH_FULL_PAGE',
      strips: strips,
      totalWidth: Math.round(viewportWidth * dpr),
      totalHeight: Math.round(totalHeight * dpr),
      pageTitle: document.title || 'Full_Page_Desktop_Screenshot'
    });
  }

  captureFullPage();
})();
