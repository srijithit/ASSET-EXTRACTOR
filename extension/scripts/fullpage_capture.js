/**
 * Asset Extractors - Full Page Scrolling Screenshot Engine
 */

(function () {
  async function captureFullPage() {
    const totalHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;

    const originalScrollTop = window.scrollY;
    const strips = [];

    // Hide fixed elements or scrollbars if needed
    const numSteps = Math.ceil(totalHeight / viewportHeight);

    for (let i = 0; i < numSteps; i++) {
      const targetY = i * viewportHeight;
      window.scrollTo(0, targetY);

      // Wait for layout/render
      await new Promise(r => setTimeout(r, 220));

      const actualScrollY = window.scrollY;
      const dataUrl = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB_RAW' }, res => {
          resolve(res?.dataUrl);
        });
      });

      if (dataUrl) {
        strips.push({
          y: actualScrollY * dpr,
          dataUrl: dataUrl
        });
      }

      if (actualScrollY + viewportHeight >= totalHeight) {
        break;
      }
    }

    // Restore scroll position
    window.scrollTo(0, originalScrollTop);

    // Send strips to background to stitch canvas
    chrome.runtime.sendMessage({
      action: 'STITCH_FULL_PAGE',
      strips: strips,
      totalWidth: viewportWidth * dpr,
      totalHeight: totalHeight * dpr,
      pageTitle: document.title || 'Full_Page_Screenshot'
    });
  }

  captureFullPage();
})();
