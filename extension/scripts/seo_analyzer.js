/**
 * Asset Extractors - SEO Image & Asset Analyzer Content Script
 */

(function () {
  function analyzeSeoAssets() {
    const images = Array.from(document.querySelectorAll('img'));
    const totalImages = images.length;
    
    let withAlt = 0;
    let missingAlt = 0;
    let nextGenCount = 0;
    let withDimensions = 0;
    let lazyLoaded = 0;

    const items = images.map((img, idx) => {
      const src = img.currentSrc || img.src || '';
      const alt = (img.getAttribute('alt') || '').trim();
      const hasAlt = alt.length > 0;
      const width = img.getAttribute('width') || img.naturalWidth || 0;
      const height = img.getAttribute('height') || img.naturalHeight || 0;
      const hasDimensions = (img.hasAttribute('width') && img.hasAttribute('height')) || (width > 0 && height > 0);
      const isLazy = img.getAttribute('loading') === 'lazy';

      // Extension & Format check
      const cleanSrc = src.split('?')[0].split('#')[0];
      const extMatch = cleanSrc.match(/\.([a-z0-9]+)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'unknown';
      const isNextGen = ['webp', 'avif', 'svg'].includes(ext);

      // Filename SEO check
      const filename = cleanSrc.split('/').pop() || `image_${idx + 1}`;
      const isGenericName = /^(img|image|photo|pic|dsc|screenshot|_|[0-9]+)/i.test(filename);

      if (hasAlt) withAlt++;
      else missingAlt++;

      if (isNextGen) nextGenCount++;
      if (hasDimensions) withDimensions++;
      if (isLazy) lazyLoaded++;

      // Auto-suggest Alt text if missing
      let suggestedAlt = alt;
      if (!hasAlt) {
        const namePart = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        suggestedAlt = namePart.length > 2 && !isGenericName 
          ? namePart.charAt(0).toUpperCase() + namePart.slice(1)
          : `Image of ${document.title.split('-')[0].trim() || 'web page'}`;
      }

      return {
        id: idx + 1,
        src: src,
        filename: filename,
        alt: alt,
        hasAlt: hasAlt,
        suggestedAlt: suggestedAlt,
        dimensions: `${width} × ${height}`,
        hasDimensions: hasDimensions,
        isNextGen: isNextGen,
        ext: ext,
        isLazy: isLazy,
        isGenericName: isGenericName
      };
    });

    // Extract OpenGraph and Twitter Meta Images
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '';
    const favicon = document.querySelector('link[rel*="icon"]')?.getAttribute('href') || '';

    // Calculate SEO Score
    let score = 100;
    if (totalImages > 0) {
      const altRatio = withAlt / totalImages;
      const nextGenRatio = nextGenCount / totalImages;
      const dimRatio = withDimensions / totalImages;

      score = Math.round((altRatio * 50) + (nextGenRatio * 30) + (dimRatio * 20));
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      totalImages: totalImages,
      withAlt: withAlt,
      missingAlt: missingAlt,
      nextGenCount: nextGenCount,
      nextGenRatioPct: totalImages > 0 ? Math.round((nextGenCount / totalImages) * 100) : 0,
      withDimensions: withDimensions,
      lazyLoaded: lazyLoaded,
      ogImage: ogImage,
      twitterImage: twitterImage,
      favicon: favicon,
      items: items
    };
  }

  // Handle message request
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'ANALYZE_SEO_ASSETS') {
      const results = analyzeSeoAssets();
      sendResponse(results);
      return true;
    }
  });
})();
