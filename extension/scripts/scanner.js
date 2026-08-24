/**
 * GrabAll Asset Extractor - Deep DOM Scanner
 * Extracts images, videos, audio, SVGs, logos, and background media.
 */

(function () {
  function scanPageAssets() {
    const assets = [];
    const seenUrls = new Set();
    const pageUrl = window.location.href;
    const pageHost = window.location.hostname;
    const pageTitle = document.title || 'Page Assets';

    function cleanUrl(url) {
      if (!url || typeof url !== 'string') return null;
      url = url.trim();
      if (!url || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) return null;
      try {
        return new URL(url, document.baseURI || window.location.href).href;
      } catch (e) {
        return null;
      }
    }

    function getExtension(url) {
      if (!url) return '';
      if (url.startsWith('data:image/svg+xml')) return 'svg';
      if (url.startsWith('data:image/png')) return 'png';
      if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'jpg';
      if (url.startsWith('data:image/webp')) return 'webp';
      if (url.startsWith('data:image/gif')) return 'gif';
      if (url.startsWith('data:video/mp4')) return 'mp4';
      if (url.startsWith('data:audio/')) return 'audio';

      try {
        const pathname = new URL(url).pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        if (match) {
          return match[1].toLowerCase();
        }
      } catch (e) {}
      return '';
    }

    function getFileName(url, defaultName = 'asset') {
      if (url.startsWith('data:')) {
        const ext = getExtension(url) || 'png';
        return `${defaultName}_${Date.now().toString(36)}.${ext}`;
      }
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);
        let name = segments.length ? segments[segments.length - 1] : defaultName;
        // Clean query params or weird chars
        name = decodeURIComponent(name).replace(/[^\w.-]/g, '_');
        if (!name.includes('.')) {
          const ext = getExtension(url) || 'bin';
          name = `${name}.${ext}`;
        }
        return name;
      } catch (e) {
        return `${defaultName}_${Date.now().toString(36)}`;
      }
    }

    function addAsset(item) {
      if (!item || !item.url) return;
      const url = item.url;
      if (seenUrls.has(url)) {
        // Merge or upgrade if better info found
        const existing = assets.find(a => a.url === url);
        if (existing) {
          if ((!existing.width || existing.width === 0) && item.width > 0) {
            existing.width = item.width;
            existing.height = item.height;
          }
          if (!existing.alt && item.alt) existing.alt = item.alt;
          if (item.category === 'logo' && existing.category !== 'logo') {
            existing.category = 'logo';
          }
          if (item.isMobile) existing.isMobile = true;
        }
        return;
      }
      seenUrls.add(url);

      const ext = item.ext || getExtension(url);
      const filename = item.filename || getFileName(url, item.type || 'asset');
      const isMobile = item.isMobile || false;
      const device = item.device || (isMobile ? 'mobile' : 'all');

      assets.push({
        id: 'asset_' + (assets.length + 1) + '_' + Math.random().toString(36).substr(2, 6),
        url: url,
        type: item.type || 'image',
        category: item.category || 'image',
        ext: ext,
        filename: filename,
        width: item.width || 0,
        height: item.height || 0,
        alt: item.alt || '',
        title: item.title || '',
        sourceTag: item.sourceTag || '',
        dataUri: url.startsWith('data:') ? true : false,
        elementInfo: item.elementInfo || '',
        isMobile: isMobile,
        device: device,
        mediaQuery: item.mediaQuery || ''
      });
    }

    // 1. Scan Logos & Icons (Favicons & Meta tags)
    function scanLogosAndFavicons() {
      // Favicons
      const iconSelectors = [
        'link[rel*="icon"]',
        'link[rel*="apple-touch-icon"]',
        'link[rel="mask-icon"]',
        'link[rel="fluid-icon"]'
      ];
      document.querySelectorAll(iconSelectors.join(',')).forEach(link => {
        const href = cleanUrl(link.getAttribute('href'));
        if (href) {
          addAsset({
            url: href,
            type: 'image',
            category: 'logo',
            alt: 'Site Favicon / App Icon',
            sourceTag: 'link[rel=icon]',
            width: 64,
            height: 64
          });
        }
      });

      // Default /favicon.ico fallback
      const defaultFavicon = cleanUrl('/favicon.ico');
      if (defaultFavicon) {
        addAsset({
          url: defaultFavicon,
          type: 'image',
          category: 'logo',
          alt: 'Default Favicon',
          sourceTag: 'favicon.ico',
          width: 32,
          height: 32
        });
      }

      // OpenGraph & Twitter Meta Images
      const metaSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:secure_url"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[itemprop="image"]'
      ];
      document.querySelectorAll(metaSelectors.join(',')).forEach(meta => {
        const content = cleanUrl(meta.getAttribute('content'));
        if (content) {
          addAsset({
            url: content,
            type: 'image',
            category: 'logo',
            alt: meta.getAttribute('property') || meta.getAttribute('name') || 'Social Preview Banner',
            sourceTag: 'meta[og:image]'
          });
        }
      });

      // Scan elements with logo in class, id, or alt
      const logoKeywords = ['logo', 'brand', 'site-logo', 'header-logo', 'navbar-brand', 'nav-logo', 'icon-brand'];
      const logoQuery = logoKeywords.map(k => `img[class*="${k}" i], img[id*="${k}" i], img[alt*="${k}" i], a[class*="${k}" i] img, header img, [role="banner"] img`).join(',');
      try {
        document.querySelectorAll(logoQuery).forEach(img => {
          const src = cleanUrl(img.src || img.getAttribute('data-src') || img.currentSrc);
          if (src) {
            addAsset({
              url: src,
              type: 'image',
              category: 'logo',
              alt: img.alt || 'Brand Logo',
              width: img.naturalWidth || img.clientWidth || 0,
              height: img.naturalHeight || img.clientHeight || 0,
              sourceTag: 'img[logo]'
            });
          }
        });
      } catch (e) {}
    }

    // 2. Scan <img> elements, picture sources, srcset, lazy attributes
    function scanImages() {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const w = img.naturalWidth || img.clientWidth || 0;
        const h = img.naturalHeight || img.clientHeight || 0;
        const alt = img.alt || img.title || '';

        // Primary src
        const src = cleanUrl(img.src || img.currentSrc);
        if (src) {
          const isLogo = /logo|brand/i.test(img.className + ' ' + img.id + ' ' + alt);
          addAsset({
            url: src,
            type: 'image',
            category: isLogo ? 'logo' : 'image',
            alt: alt,
            width: w,
            height: h,
            sourceTag: 'img'
          });
        }

        // srcset parsing with descriptor detection
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          parseSrcset(srcset).forEach(item => {
            addAsset({
              url: item.url,
              type: 'image',
              category: 'image',
              alt: alt + (item.isMobile ? ' (Mobile srcset)' : ' (srcset)'),
              isMobile: item.isMobile,
              device: item.isMobile ? 'mobile' : 'all',
              sourceTag: 'img[srcset]'
            });
          });
        }

        // Data / lazy attributes
        const lazyAttrs = [
          'data-src', 'data-original', 'data-lazy-src', 'data-lazy',
          'data-url', 'data-zoom-image', 'data-high-res', 'data-full-src',
          'data-retina', 'data-large', 'data-orig-file'
        ];
        lazyAttrs.forEach(attr => {
          const val = img.getAttribute(attr);
          const cleaned = cleanUrl(val);
          if (cleaned) {
            const isMobileAttr = /mobile|phone|small/i.test(attr + ' ' + (img.className || ''));
            addAsset({
              url: cleaned,
              type: 'image',
              category: 'image',
              alt: alt + ' (lazy-loaded)',
              isMobile: isMobileAttr,
              device: isMobileAttr ? 'mobile' : 'all',
              sourceTag: `img[${attr}]`
            });
          }
        });
      });

      // <picture> <source srcset="..." media="..."> (Mobile Responsive tags)
      document.querySelectorAll('picture source').forEach(source => {
        const media = source.getAttribute('media') || '';
        const isMobileMedia = /(max-width:\s*(?:3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7[6-9][0-9]|8[0-9]{2})px)|orientation:\s*portrait|handheld/i.test(media);
        
        const srcset = source.getAttribute('srcset') || source.getAttribute('src');
        if (srcset) {
          parseSrcset(srcset).forEach(item => {
            addAsset({
              url: item.url,
              type: 'image',
              category: 'image',
              alt: `Responsive Media (${media || 'picture source'})`,
              isMobile: isMobileMedia || item.isMobile,
              device: (isMobileMedia || item.isMobile) ? 'mobile' : 'desktop',
              mediaQuery: media,
              sourceTag: `picture>source${media ? `[${media}]` : ''}`
            });
          });
        }
      });
    }

    function parseSrcset(srcset) {
      if (!srcset) return [];
      const results = [];
      const parts = srcset.split(/,\s+/);
      parts.forEach(part => {
        const tokens = part.trim().split(/\s+/);
        const candidate = tokens[0];
        const descriptor = tokens[1] || '';
        const cleaned = cleanUrl(candidate);
        if (cleaned) {
          let isMobile = false;
          if (descriptor.endsWith('w')) {
            const width = parseInt(descriptor.replace('w', ''), 10);
            if (!isNaN(width) && width <= 768) {
              isMobile = true;
            }
          }
          results.push({ url: cleaned, descriptor, isMobile });
        }
      });
      return results;
    }

    // 3. Scan Inline & External SVGs
    function scanSvgs() {
      // Inline SVGs
      const inlineSvgs = document.querySelectorAll('svg');
      inlineSvgs.forEach((svg, idx) => {
        // Skip hidden tiny tracking SVGs
        const rect = svg.getBoundingClientRect();
        const w = rect.width || svg.viewBox?.baseVal?.width || svg.clientWidth || 32;
        const h = rect.height || svg.viewBox?.baseVal?.height || svg.clientHeight || 32;

        try {
          const serializer = new XMLSerializer();
          let svgString = serializer.serializeToString(svg);
          
          // Ensure xmlns attribute
          if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
          }

          const encoded = encodeURIComponent(svgString)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
          const dataUri = `data:image/svg+xml;charset=utf-8,${encoded}`;

          const isLogo = /logo|brand|site-title/i.test(svg.className?.baseVal || svg.id || svg.parentElement?.className || '');
          const label = svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || `SVG Vector ${idx + 1}`;

          addAsset({
            url: dataUri,
            type: 'svg',
            category: isLogo ? 'logo' : 'svg',
            ext: 'svg',
            filename: `vector_graphic_${idx + 1}.svg`,
            alt: label,
            width: Math.round(w),
            height: Math.round(h),
            sourceTag: '<svg> (inline)'
          });
        } catch (e) {}
      });

      // <object data="*.svg">, <embed src="*.svg">
      document.querySelectorAll('object[data*=".svg"], embed[src*=".svg"]').forEach(el => {
        const src = cleanUrl(el.getAttribute('data') || el.getAttribute('src'));
        if (src) {
          addAsset({
            url: src,
            type: 'svg',
            category: 'svg',
            ext: 'svg',
            sourceTag: el.tagName.toLowerCase()
          });
        }
      });
    }

    // 4. Scan Videos & Audio
    function scanMedia() {
      // <video> elements
      document.querySelectorAll('video').forEach(video => {
        const src = cleanUrl(video.src || video.currentSrc);
        const poster = cleanUrl(video.poster);
        const w = video.videoWidth || video.clientWidth || 0;
        const h = video.videoHeight || video.clientHeight || 0;

        if (src) {
          addAsset({
            url: src,
            type: 'video',
            category: 'video',
            width: w,
            height: h,
            alt: 'HTML5 Video Stream',
            sourceTag: 'video'
          });
        }

        if (poster) {
          addAsset({
            url: poster,
            type: 'image',
            category: 'image',
            alt: 'Video Poster Thumbnail',
            sourceTag: 'video[poster]'
          });
        }

        // <source> children
        video.querySelectorAll('source').forEach(source => {
          const sSrc = cleanUrl(source.src);
          if (sSrc) {
            addAsset({
              url: sSrc,
              type: 'video',
              category: 'video',
              width: w,
              height: h,
              alt: 'Video Source Stream',
              sourceTag: 'video>source'
            });
          }
        });
      });

      // <audio> elements
      document.querySelectorAll('audio').forEach(audio => {
        const src = cleanUrl(audio.src || audio.currentSrc);
        if (src) {
          addAsset({
            url: src,
            type: 'audio',
            category: 'audio',
            alt: 'Audio Stream',
            sourceTag: 'audio'
          });
        }
        audio.querySelectorAll('source').forEach(source => {
          const sSrc = cleanUrl(source.src);
          if (sSrc) {
            addAsset({
              url: sSrc,
              type: 'audio',
              category: 'audio',
              alt: 'Audio Source Track',
              sourceTag: 'audio>source'
            });
          }
        });
      });

      // Links <a> pointing to video or audio files
      const mediaExtensions = /\.(mp4|webm|ogv|mov|mkv|m4v|m3u8|mp3|wav|ogg|aac|flac|m4a|weba)([?#]|$)/i;
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && mediaExtensions.test(href)) {
          const cleaned = cleanUrl(href);
          if (cleaned) {
            const isVideo = /\.(mp4|webm|ogv|mov|mkv|m4v|m3u8)/i.test(cleaned);
            addAsset({
              url: cleaned,
              type: isVideo ? 'video' : 'audio',
              category: isVideo ? 'video' : 'audio',
              alt: a.textContent.trim() || (isVideo ? 'Video Link' : 'Audio Link'),
              sourceTag: 'a[media-href]'
            });
          }
        }
      });

      // YouTube / Vimeo embed iframes
      document.querySelectorAll('iframe[src]').forEach(iframe => {
        const src = iframe.getAttribute('src');
        if (!src) return;
        // YouTube embed
        const ytMatch = src.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([\w-]+)/i);
        if (ytMatch && ytMatch[1]) {
          const videoId = ytMatch[1];
          // Add high-res thumbnail
          addAsset({
            url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            type: 'image',
            category: 'image',
            alt: `YouTube Video Thumbnail (${videoId})`,
            sourceTag: 'iframe[youtube]'
          });
        }
        // Vimeo embed
        const vimeoMatch = src.match(/player\.vimeo\.com\/video\/(\d+)/i);
        if (vimeoMatch && vimeoMatch[1]) {
          addAsset({
            url: `https://vumbnail.com/${vimeoMatch[1]}.jpg`,
            type: 'image',
            category: 'image',
            alt: `Vimeo Thumbnail (${vimeoMatch[1]})`,
            sourceTag: 'iframe[vimeo]'
          });
        }
      });
    }

    // 5. Scan Background Images (Computed Styles & CSS Rules)
    function scanBackgroundImages() {
      // Elements with inline styles or computed background-image
      const allElements = document.querySelectorAll('*');
      const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

      // Sample elements to keep performance fast
      allElements.forEach(el => {
        const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          let match;
          while ((match = urlRegex.exec(bg)) !== null) {
            const rawUrl = match[1];
            const cleaned = cleanUrl(rawUrl);
            if (cleaned && !cleaned.startsWith('data:image/svg+xml;base64,')) {
              addAsset({
                url: cleaned,
                type: 'image',
                category: 'background',
                alt: 'CSS Background Image',
                sourceTag: 'css[background-image]'
              });
            }
          }
        }
      });

      // Scan document stylesheets rules
      try {
        Array.from(document.styleSheets).forEach(sheet => {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) return;
            Array.from(rules).forEach(rule => {
              if (rule.style && rule.style.backgroundImage) {
                const bg = rule.style.backgroundImage;
                if (bg && bg !== 'none') {
                  let match;
                  while ((match = urlRegex.exec(bg)) !== null) {
                    const cleaned = cleanUrl(match[1]);
                    if (cleaned) {
                      addAsset({
                        url: cleaned,
                        type: 'image',
                        category: 'background',
                        alt: 'Stylesheet Background',
                        sourceTag: 'stylesheet'
                      });
                    }
                  }
                }
              }
            });
          } catch (corsErr) {
            // Stylesheet from external origin without CORS
          }
        });
      } catch (e) {}
    }

    // 6. Scan Canvas Snapshots
    function scanCanvases() {
      document.querySelectorAll('canvas').forEach((canvas, idx) => {
        try {
          if (canvas.width > 30 && canvas.height > 30) {
            const dataUrl = canvas.toDataURL('image/png');
            addAsset({
              url: dataUrl,
              type: 'image',
              category: 'image',
              ext: 'png',
              filename: `canvas_capture_${idx + 1}.png`,
              alt: `Canvas Export ${idx + 1}`,
              width: canvas.width,
              height: canvas.height,
              sourceTag: '<canvas>'
            });
          }
        } catch (e) {}
      });
    }

    // Run all scans
    scanLogosAndFavicons();
    scanImages();
    scanSvgs();
    scanMedia();
    scanBackgroundImages();
    scanCanvases();

    return {
      pageUrl: pageUrl,
      pageHost: pageHost,
      pageTitle: pageTitle,
      totalCount: assets.length,
      assets: assets
    };
  }

  // If called directly or injected
  window.__grabAllScanner = {
    scan: scanPageAssets
  };

  return scanPageAssets();
})();
